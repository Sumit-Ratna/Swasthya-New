import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
    Activity, Heart, Thermometer, Wind, AlertTriangle, 
    ShieldCheck, ArrowRight, Baby, Sparkles, CheckCircle, MessageSquareHeart, Bell, ArrowLeft 
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';

const TriageAssessment = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRunTriage = async (e) => {
        e.preventDefault();
        setEvaluating(true);
        try {
            const token = localStorage.getItem('accessToken');
            const patientId = user?.id || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

            const res = await axios.post('/api/assessments', {
                patient_id: patientId,
                ...form
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAssessmentResult(res.data.assessment);
        } catch (err) {
            console.error("Triage evaluation error:", err);
            alert("Triage error: " + (err.response?.data?.error || err.message));
        } finally {
            setEvaluating(false);
        }
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'EMERGENCY': return '#DC2626';
            case 'HIGH': return '#EA580C';
            case 'MODERATE': return '#D97706';
            default: return '#16A34A';
        }
    };

    return (
        <div style={{ padding: '24px 16px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Sparkles color="var(--primary-color)" size={28} />
                        AI-Assisted Clinical Triage & Risk Stratification
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: 0 }}>
                        Capture vitals and danger signs for instant explainable clinical risk classification
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        style={{
                            background: '#ccfbf1',
                            border: '1px solid #99f6e4',
                            color: '#0f766e',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <MessageSquareHeart size={16} />
                        <span>Worker Feedback</span>
                    </button>
                    <div 
                        onClick={() => navigate('/notifications')}
                        style={{ cursor: 'pointer', background: 'white', padding: '6px 8px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}
                    >
                        <Bell size={18} color="var(--text-primary)" />
                    </div>
                </div>
            </div>

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            <div className="card" style={{ padding: '24px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <form onSubmit={handleRunTriage}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        {/* Blood Pressure */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                <Heart size={16} color="#DC2626" /> Systolic BP (mmHg)
                            </label>
                            <input 
                                type="number"
                                name="systolic_bp"
                                value={form.systolic_bp}
                                onChange={handleChange}
                                placeholder="120"
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                <Heart size={16} color="#DC2626" /> Diastolic BP (mmHg)
                            </label>
                            <input 
                                type="number"
                                name="diastolic_bp"
                                value={form.diastolic_bp}
                                onChange={handleChange}
                                placeholder="80"
                                required
                            />
                        </div>

                        {/* Pulse Rate */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                <Activity size={16} color="var(--primary-color)" /> Pulse (bpm)
                            </label>
                            <input 
                                type="number"
                                name="pulse_rate"
                                value={form.pulse_rate}
                                onChange={handleChange}
                                placeholder="72"
                                required
                            />
                        </div>

                        {/* Oxygen Saturation SpO2 */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                <Wind size={16} color="#0284C7" /> Oxygen SpO2 (%)
                            </label>
                            <input 
                                type="number"
                                name="spo2"
                                value={form.spo2}
                                onChange={handleChange}
                                placeholder="98"
                                min="50"
                                max="100"
                                required
                            />
                        </div>

                        {/* Temperature */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                <Thermometer size={16} color="#D97706" /> Temperature (°F)
                            </label>
                            <input 
                                type="number"
                                step="0.1"
                                name="temperature"
                                value={form.temperature}
                                onChange={handleChange}
                                placeholder="98.6"
                                required
                            />
                        </div>

                        {/* Respiratory Rate */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                <Wind size={16} color="#6366F1" /> Respiratory Rate (bpm)
                            </label>
                            <input 
                                type="number"
                                name="respiratory_rate"
                                value={form.respiratory_rate}
                                onChange={handleChange}
                                placeholder="18"
                            />
                        </div>
                    </div>

                    {/* Pregnancy Checkbox */}
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
                            <input 
                                type="checkbox"
                                name="is_pregnant"
                                checked={form.is_pregnant}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                            />
                            <Baby size={18} color="#EC4899" />
                            <span>Patient is currently Pregnant (Antenatal Care ANC)</span>
                        </label>
                    </div>

                    {/* Danger Signs */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                            Reported Danger Signs / Acute Symptoms
                        </label>
                        <textarea 
                            rows={3}
                            name="danger_signs"
                            value={form.danger_signs}
                            onChange={handleChange}
                            placeholder="e.g., severe headache, blurry vision, chest pain, convulsions, heavy bleeding..."
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={evaluating}
                        style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                        {evaluating ? 'Running AI Clinical Triage...' : 'Calculate AI Risk & Triage Result'}
                    </button>
                </form>
            </div>

            {/* Triage Assessment Output */}
            {assessmentResult && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card" 
                    style={{ 
                        padding: '24px', 
                        borderLeft: `6px solid ${getRiskColor(assessmentResult.computed_risk_level)}`,
                        backgroundColor: 'var(--card-bg)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Evaluated Risk Level</span>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', color: getRiskColor(assessmentResult.computed_risk_level), marginTop: '4px' }}>
                                {assessmentResult.computed_risk_level} RISK
                            </h2>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI Risk Score</span>
                            <div style={{ fontSize: '20px', fontWeight: '700' }}>
                                {(assessmentResult.ai_risk_score * 100).toFixed(0)} / 100
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={16} color={getRiskColor(assessmentResult.computed_risk_level)} />
                            Clinical Explanation & Identified Flags:
                        </h4>
                        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                            {assessmentResult.ai_triage_explanation || "All vital parameters are within normal baseline ranges."}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn-outline" onClick={() => navigate('/records')}>
                            View in EHR
                        </button>
                        <button 
                            className="btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => navigate('/facilities')}
                        >
                            Find Nearest Capable Facility <ArrowRight size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default TriageAssessment;
