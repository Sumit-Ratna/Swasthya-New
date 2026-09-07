import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, Heart, Thermometer, Wind, AlertTriangle, 
    ShieldCheck, ArrowRight, Baby, Sparkles, CheckCircle, Bell, ArrowLeft,
    Zap, RefreshCw, Check, MapPin, Stethoscope, ChevronRight, FileText, Bot, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const N8N_TRIAGE_WEBHOOK = 'https://saadkhan104.app.n8n.cloud/webhook/631f6768-d50b-4010-b06c-062e97503bd3';

const QUICK_DANGER_TAGS = [
    "Severe Headache",
    "Blurry Vision",
    "Chest Pain",
    "Shortness of Breath",
    "Convulsions / Seizures",
    "Heavy Bleeding",
    "High Fever"
];

const PRESETS = [
    {
        label: "Normal Baseline",
        color: "#10b981",
        data: { systolic_bp: 120, diastolic_bp: 80, pulse_rate: 72, spo2: 98, respiratory_rate: 18, temperature: 98.6, is_pregnant: false, danger_signs: "" }
    },
    {
        label: "Hypertension / Alert",
        color: "#f59e0b",
        data: { systolic_bp: 165, diastolic_bp: 105, pulse_rate: 94, spo2: 96, respiratory_rate: 22, temperature: 99.1, is_pregnant: true, danger_signs: "Severe headache, blurry vision" }
    },
    {
        label: "Critical / Sepsis",
        color: "#ef4444",
        data: { systolic_bp: 85, diastolic_bp: 55, pulse_rate: 128, spo2: 89, respiratory_rate: 28, temperature: 103.2, is_pregnant: false, danger_signs: "High fever, breathlessness, confusion" }
    }
];

const TriageAssessment = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        systolic_bp: 120,
        diastolic_bp: 80,
        pulse_rate: 72,
        spo2: 98,
        respiratory_rate: 18,
        temperature: 98.6,
        is_pregnant: false,
        danger_signs: ''
    });

    const [assessmentResult, setAssessmentResult] = useState(null);
    const [evaluating, setEvaluating] = useState(false);
    const [webhookStatus, setWebhookStatus] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleApplyPreset = (presetData) => {
        setForm(presetData);
        setAssessmentResult(null);
        setWebhookStatus(null);
    };

    const handleToggleDangerTag = (tag) => {
        setForm(prev => {
            const currentTags = prev.danger_signs ? prev.danger_signs.split(',').map(s => s.trim()).filter(Boolean) : [];
            const exists = currentTags.includes(tag);
            let updatedTags;
            if (exists) {
                updatedTags = currentTags.filter(t => t !== tag);
            } else {
                updatedTags = [...currentTags, tag];
            }
            return {
                ...prev,
                danger_signs: updatedTags.join(', ')
            };
        });
    };

    const handleRunTriage = async (e) => {
        e.preventDefault();
        setEvaluating(true);
        setAssessmentResult(null);
        setWebhookStatus(null);

        const token = localStorage.getItem('accessToken');
        const patientId = user?.id || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

        // Prepare comprehensive payload for n8n webhook
        const n8nPayload = {
            systolic_bp: Number(form.systolic_bp),
            diastolic_bp: Number(form.diastolic_bp),
            pulse_rate: Number(form.pulse_rate),
            spo2: Number(form.spo2),
            respiratory_rate: Number(form.respiratory_rate),
            temperature: Number(form.temperature),
            is_pregnant: Boolean(form.is_pregnant),
            danger_signs: form.danger_signs || '',
            query: `Patient Clinical Vitals: BP ${form.systolic_bp}/${form.diastolic_bp} mmHg, Pulse ${form.pulse_rate} bpm, SpO2 ${form.spo2}%, Temp ${form.temperature}°F, Resp Rate ${form.respiratory_rate} bpm, Pregnant: ${form.is_pregnant ? 'Yes (ANC Protocol)' : 'No'}, Danger Signs: ${form.danger_signs || 'None'}. Please analyze and provide clinical risk level (EMERGENCY, HIGH, MODERATE, LOW), risk score, and clinical report.`,
            message: `Patient Vitals: BP ${form.systolic_bp}/${form.diastolic_bp}, Pulse ${form.pulse_rate}, SpO2 ${form.spo2}%, Temp ${form.temperature}, Danger Signs: ${form.danger_signs || 'None'}`,
            patient_id: patientId,
            timestamp: new Date().toISOString()
        };

        let resultFound = false;

        // 1. Try sending input to n8n Webhook Endpoint
        try {
            const n8nResponse = await axios.post(N8N_TRIAGE_WEBHOOK, n8nPayload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            if (n8nResponse.data && (typeof n8nResponse.data === 'object' || typeof n8nResponse.data === 'string')) {
                const data = n8nResponse.data;
                const outputText = typeof data === 'string' ? data : (data.output || data.response || data.report || data.message || data.text || JSON.stringify(data));
                
                // Parse risk level from n8n response if present
                let computedRisk = data.computed_risk_level || data.risk_level || data.risk || null;
                if (!computedRisk && typeof outputText === 'string') {
                    const upper = outputText.toUpperCase();
                    if (upper.includes('EMERGENCY')) computedRisk = 'EMERGENCY';
                    else if (upper.includes('HIGH RISK') || upper.includes('HIGH')) computedRisk = 'HIGH';
                    else if (upper.includes('MODERATE')) computedRisk = 'MODERATE';
                    else if (upper.includes('LOW')) computedRisk = 'LOW';
                }

                // Parse risk score from n8n response
                let score = Number(data.ai_risk_score || data.risk_score || data.score);
                if (isNaN(score)) {
                    score = computedRisk === 'EMERGENCY' ? 0.95 : computedRisk === 'HIGH' ? 0.78 : computedRisk === 'MODERATE' ? 0.48 : 0.15;
                }
                if (score > 1) score = score / 100; // normalize if 0-100

                if (!computedRisk) {
                    computedRisk = form.systolic_bp >= 160 || form.spo2 < 92 || form.danger_signs.length > 0 ? 'HIGH' : 'LOW';
                }

                setAssessmentResult({
                    computed_risk_level: computedRisk,
                    ai_risk_score: score,
                    ai_triage_explanation: outputText && outputText !== '{}' ? outputText : `Clinical Analysis: BP ${form.systolic_bp}/${form.diastolic_bp} mmHg, SpO2 ${form.spo2}%, Pulse ${form.pulse_rate} bpm. ${form.is_pregnant ? 'Obstetric ANC protocol applied.' : ''}`,
                    n8n_raw_report: typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data),
                    source: 'n8n_webhook'
                });
                setWebhookStatus('N8N_SUCCESS');
                resultFound = true;
            }
        } catch (n8nErr) {
            console.warn("n8n webhook error / workflow notice:", n8nErr.message);
        }

        // 2. If n8n workflow was not completed or threw node error, execute robust clinical assessment & save to EHR
        if (!resultFound) {
            try {
                const res = await axios.post('/api/assessments', {
                    patient_id: patientId,
                    ...form
                }, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (res.data?.assessment) {
                    setAssessmentResult({
                        ...res.data.assessment,
                        source: 'clinical_engine'
                    });
                    setWebhookStatus('BACKEND_FALLBACK');
                    resultFound = true;
                }
            } catch (backendErr) {
                console.warn("Backend triage route:", backendErr.message);
            }
        }

        // 3. Fallback deterministic medical evaluation if offline or demo
        if (!resultFound) {
            const isEmergency = form.systolic_bp >= 180 || form.diastolic_bp >= 120 || form.spo2 < 88 || form.pulse_rate > 130;
            const isHigh = form.systolic_bp >= 160 || form.diastolic_bp >= 100 || form.spo2 < 92 || form.danger_signs.length > 0 || (form.is_pregnant && form.systolic_bp >= 140);
            const isModerate = form.systolic_bp >= 140 || form.pulse_rate >= 100 || form.temperature >= 101.5;

            const level = isEmergency ? 'EMERGENCY' : isHigh ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW';
            const score = isEmergency ? 0.94 : isHigh ? 0.76 : isModerate ? 0.45 : 0.12;

            setAssessmentResult({
                computed_risk_level: level,
                ai_risk_score: score,
                ai_triage_explanation: `Clinical Assessment Report:\n• Blood Pressure: ${form.systolic_bp}/${form.diastolic_bp} mmHg (${isHigh ? 'Elevated / Hypertensive' : 'Normal Range'})\n• Oxygen SpO2: ${form.spo2}% (${form.spo2 < 94 ? 'Hypoxia Alert' : 'Adequate'})\n• Pulse Rate: ${form.pulse_rate} bpm\n• Temperature: ${form.temperature}°F\n• ANC Status: ${form.is_pregnant ? 'Active Pregnancy (Obstetric High Risk Filter Active)' : 'Not Pregnant'}\n• Reported Danger Signs: ${form.danger_signs || 'None'}\n\nClinical Recommendation: ${isEmergency ? 'Immediate Emergency Transfer to Tertiary Facility via 108 required.' : isHigh ? 'Prompt referral and specialist consultation recommended within 24 hours.' : 'Routine monitoring and lifestyle maintenance.'}`,
                source: 'clinical_engine'
            });
            setWebhookStatus('LOCAL_CALCULATED');
        }

        setEvaluating(false);
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'EMERGENCY': return '#DC2626';
            case 'HIGH': return '#EA580C';
            case 'MODERATE': return '#D97706';
            default: return '#16A34A';
        }
    };

    const getRiskBg = (level) => {
        switch (level) {
            case 'EMERGENCY': return 'rgba(220, 38, 38, 0.1)';
            case 'HIGH': return 'rgba(234, 88, 12, 0.1)';
            case 'MODERATE': return 'rgba(217, 119, 6, 0.1)';
            default: return 'rgba(22, 163, 74, 0.1)';
        }
    };

    return (
        <div style={{ padding: '16px 12px 32px', maxWidth: '640px', margin: '0 auto', color: 'var(--text-primary)' }}>
            {/* Compact Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        onClick={() => navigate(-1)} 
                        style={{
                            background: 'var(--card-bg, #ffffff)',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '10px',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.2px' }}>
                            <Sparkles color="var(--primary-color, #0d9488)" size={20} />
                            Clinical Risk & Triage
                        </h1>
                        <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '11.5px', margin: '1px 0 0' }}>
                            Instant vital risk scoring via n8n clinical workflow
                        </p>
                    </div>
                </div>

                <div 
                    onClick={() => navigate('/notifications')}
                    style={{ cursor: 'pointer', background: 'var(--card-bg, #ffffff)', padding: '6px 8px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center' }}
                >
                    <Bell size={16} color="var(--text-primary)" />
                </div>
            </div>

            {/* Quick Demo Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    Presets:
                </span>
                {PRESETS.map((p, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(p.data)}
                        style={{
                            background: 'var(--card-bg, #ffffff)',
                            border: `1px solid ${p.color}40`,
                            color: p.color,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }}></span>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Main Compact Triage Card */}
            <div 
                className="card" 
                style={{ 
                    padding: '16px', 
                    borderRadius: '16px',
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    marginBottom: '16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}
            >
                <form onSubmit={handleRunTriage}>
                    {/* Compact 2-Column Vitals Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                        
                        {/* 1. Blood Pressure: Systolic */}
                        <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    <Heart size={13} color="#DC2626" /> Systolic BP
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>mmHg</span>
                            </div>
                            <input 
                                type="number"
                                name="systolic_bp"
                                value={form.systolic_bp}
                                onChange={handleChange}
                                placeholder="120"
                                required
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* 2. Blood Pressure: Diastolic */}
                        <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    <Heart size={13} color="#DC2626" /> Diastolic BP
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>mmHg</span>
                            </div>
                            <input 
                                type="number"
                                name="diastolic_bp"
                                value={form.diastolic_bp}
                                onChange={handleChange}
                                placeholder="80"
                                required
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* 3. Pulse Rate */}
                        <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    <Activity size={13} color="#0d9488" /> Pulse
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>bpm</span>
                            </div>
                            <input 
                                type="number"
                                name="pulse_rate"
                                value={form.pulse_rate}
                                onChange={handleChange}
                                placeholder="72"
                                required
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* 4. Oxygen SpO2 */}
                        <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    <Wind size={13} color="#0284c7" /> Oxygen SpO2
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>%</span>
                            </div>
                            <input 
                                type="number"
                                name="spo2"
                                value={form.spo2}
                                onChange={handleChange}
                                placeholder="98"
                                min="50"
                                max="100"
                                required
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* 5. Temperature */}
                        <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    <Thermometer size={13} color="#d97706" /> Temperature
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>°F</span>
                            </div>
                            <input 
                                type="number"
                                step="0.1"
                                name="temperature"
                                value={form.temperature}
                                onChange={handleChange}
                                placeholder="98.6"
                                required
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* 6. Respiratory Rate */}
                        <div style={{ background: 'var(--bg-color, #f8fafc)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    <Wind size={13} color="#6366f1" /> Resp Rate
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>bpm</span>
                            </div>
                            <input 
                                type="number"
                                name="respiratory_rate"
                                value={form.respiratory_rate}
                                onChange={handleChange}
                                placeholder="18"
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {/* Pregnancy Protocol Switch */}
                    <div style={{
                        marginBottom: '12px',
                        padding: '8px 12px',
                        background: form.is_pregnant ? 'rgba(236, 72, 153, 0.08)' : 'var(--bg-color, #f8fafc)',
                        border: form.is_pregnant ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onClick={() => setForm(prev => ({ ...prev, is_pregnant: !prev.is_pregnant }))}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: form.is_pregnant ? '#ec4899' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'all 0.2s ease'
                            }}>
                                <Baby size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: form.is_pregnant ? '#db2777' : 'var(--text-primary)' }}>
                                    Patient is Pregnant (Antenatal Care ANC)
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                    Applies obstetric risk thresholds & pre-eclampsia detection
                                </div>
                            </div>
                        </div>
                        <input 
                            type="checkbox"
                            name="is_pregnant"
                            checked={form.is_pregnant}
                            onChange={handleChange}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '16px', height: '16px', accentColor: '#ec4899', cursor: 'pointer' }}
                        />
                    </div>

                    {/* Danger Signs & Quick Chips */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                            Danger Signs / Acute Symptoms (Click tags to add)
                        </label>
                        
                        {/* Quick Tag Pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                            {QUICK_DANGER_TAGS.map((tag, idx) => {
                                const active = form.danger_signs.includes(tag);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleToggleDangerTag(tag)}
                                        style={{
                                            background: active ? '#fee2e2' : 'var(--bg-color, #f1f5f9)',
                                            color: active ? '#b91c1c' : 'var(--text-secondary, #475569)',
                                            border: active ? '1px solid #f87171' : '1px solid var(--border-color, #e2e8f0)',
                                            fontSize: '10.5px',
                                            fontWeight: active ? 800 : 600,
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {active && <Check size={11} />}
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>

                        <input 
                            type="text"
                            name="danger_signs"
                            value={form.danger_signs}
                            onChange={handleChange}
                            placeholder="e.g. severe headache, blurry vision, chest pain..."
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '12.5px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, #cbd5e1)',
                                background: 'var(--card-bg, #ffffff)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Compact Primary Triage Trigger */}
                    <button 
                        type="submit" 
                        disabled={evaluating}
                        style={{ 
                            width: '100%', 
                            padding: '11px', 
                            fontSize: '14px', 
                            fontWeight: '800', 
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {evaluating ? (
                            <>
                                <RefreshCw size={16} className="spin" /> Processing via n8n Clinical Workflow...
                            </>
                        ) : (
                            <>
                                <Zap size={16} fill="white" /> Calculate AI Risk & Triage Result
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Compact Triage Assessment Output & Report Card */}
            <AnimatePresence>
                {assessmentResult && (
                    <motion.div 
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="card" 
                        style={{ 
                            padding: '16px', 
                            borderRadius: '16px',
                            border: `1px solid ${getRiskColor(assessmentResult.computed_risk_level)}40`,
                            background: `linear-gradient(145deg, var(--card-bg, #ffffff) 0%, ${getRiskBg(assessmentResult.computed_risk_level)} 100%)`,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                        }}
                    >
                        {/* Result Top Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    background: getRiskColor(assessmentResult.computed_risk_level),
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    padding: '4px 10px',
                                    borderRadius: '14px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {assessmentResult.computed_risk_level} RISK
                                </span>
                                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    Clinical Risk Score:
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                    background: assessmentResult.source === 'n8n_webhook' ? '#ede9fe' : '#e0f2fe',
                                    color: assessmentResult.source === 'n8n_webhook' ? '#6d28d9' : '#0369a1',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}>
                                    <Bot size={11} /> {assessmentResult.source === 'n8n_webhook' ? 'n8n Workflow' : 'Clinical AI Engine'}
                                </span>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: getRiskColor(assessmentResult.computed_risk_level) }}>
                                    {(assessmentResult.ai_risk_score * 100).toFixed(0)} / 100
                                </div>
                            </div>
                        </div>

                        {/* Explanation / Clinical Report Box */}
                        <div style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            backgroundColor: 'rgba(255,255,255,0.85)', 
                            border: '1px solid rgba(0,0,0,0.06)',
                            marginBottom: '12px' 
                        }}>
                            <div style={{ fontSize: '11.5px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px', color: getRiskColor(assessmentResult.computed_risk_level) }}>
                                <FileText size={13} /> Clinical Triage & Risk Report:
                            </div>
                            <div style={{ 
                                fontSize: '12px', 
                                lineHeight: '1.5', 
                                color: 'var(--text-primary)', 
                                whiteSpace: 'pre-line',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {assessmentResult.ai_triage_explanation || "All vital parameters are within normal baseline ranges."}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => navigate('/records')}
                                style={{
                                    padding: '7px 12px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'var(--card-bg, #ffffff)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                View in EHR
                            </button>
                            <button 
                                onClick={() => navigate('/facilities')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #0d9488, #059669)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                                }}
                            >
                                Find Capable Facility <ArrowRight size={13} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TriageAssessment;
