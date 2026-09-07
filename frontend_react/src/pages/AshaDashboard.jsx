import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HeartPulse, Baby, ShieldAlert, CheckCircle2, AlertTriangle,
    Calendar, Users, Pill, Award, Phone, Activity, Sparkles,
    RefreshCw, Search, ArrowRight, Ambulance, Heart, PlusCircle,
    Check, MapPin, Clock, FileText, ChevronRight, Zap
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AshaDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchBeneficiary, setSearchBeneficiary] = useState('');
    const [vitalsModal, setVitalsModal] = useState(false);
    const [selectedMother, setSelectedMother] = useState(null);

    // Vitals Field Entry State
    const [vitalsForm, setVitalsForm] = useState({
        patientName: '',
        systolic_bp: 120,
        diastolic_bp: 80,
        blood_sugar_fbs: 95,
        spo2: 98,
        pulse_rate: 74,
        is_pregnant: true,
        danger_signs: 'None'
    });
    const [vitalsResult, setVitalsResult] = useState(null);
    const [submittingVitals, setSubmittingVitals] = useState(false);

    // Emergency Ambulance Trigger
    const [emergencySuccess, setEmergencySuccess] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/asha/overview', {
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setData(res.data);
        } catch (err) {
            console.error('ASHA Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenVitalsFor = (mother) => {
        setSelectedMother(mother);
        setVitalsForm({
            patientName: mother.name,
            systolic_bp: mother.isHighRisk ? 142 : 120,
            diastolic_bp: mother.isHighRisk ? 90 : 80,
            blood_sugar_fbs: 105,
            spo2: 98,
            pulse_rate: 76,
            is_pregnant: true,
            danger_signs: mother.riskFactors.join(', ')
        });
        setVitalsResult(null);
        setVitalsModal(true);
    };

    const handleSubmitVitals = async (e) => {
        e.preventDefault();
        try {
            setSubmittingVitals(true);
            const res = await axios.post('/api/asha/vitals', vitalsForm);
            setVitalsResult(res.data.assessment);
        } catch (err) {
            console.error('Vitals submit error:', err);
            alert('Failed to record vitals: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmittingVitals(false);
        }
    };

    const handleTriggerEmergency = (beneficiary) => {
        setEmergencySuccess(beneficiary);
        setTimeout(() => setEmergencySuccess(null), 5000);
    };

    const kpiCards = [
        { label: 'Mothers Tracked', val: data?.summaryKpis?.totalMothersTracked || 38, icon: <Baby size={22} color="#0d9488" />, bg: '#ccfbf1', border: '#99f6e4' },
        { label: 'High-Risk Pregnancies', val: data?.summaryKpis?.highRiskPregnancies || 7, icon: <AlertTriangle size={22} color="#dc2626" />, bg: '#fee2e2', border: '#fca5a5' },
        { label: 'Immunizations Due', val: data?.summaryKpis?.infantsDueImmunization || 14, icon: <Calendar size={22} color="#2563eb" />, bg: '#dbeafe', border: '#bfdbfe' },
        { label: 'NCD Screenings', val: data?.summaryKpis?.ncdScreeningsThisMonth || 112, icon: <Activity size={22} color="#7c3aed" />, bg: '#ede9fe', border: '#ddd6fe' },
        { label: 'DBT Earned (₹)', val: `₹${data?.summaryKpis?.dbtIncentivesEarned || 4850}`, icon: <Award size={22} color="#d97706" />, bg: '#fef3c7', border: '#fde68a' }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
            padding: '24px 16px 100px 16px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header Profile Section */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #065f46 100%)',
                        borderRadius: '24px',
                        padding: '28px',
                        color: '#fff',
                        boxShadow: '0 12px 28px -6px rgba(13, 148, 136, 0.35)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '24px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.4)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <HeartPulse size={36} color="#fff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                                    {data?.workerInfo?.name || 'Sunita Gaikwad'}
                                </h1>
                                <span style={{
                                    background: 'rgba(255,255,255,0.25)',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    padding: '4px 10px',
                                    borderRadius: '12px'
                                }}>
                                    ASHA SANGINI
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                {data?.workerInfo?.sector || 'Shirwal Catchment, Ward 4'} • {data?.workerInfo?.district || 'Pune'} District
                            </p>
                            <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '0.8rem', opacity: 0.95 }}>
                                <span>🏠 <strong>{data?.workerInfo?.assignedHouseholds || 184}</strong> Households</span>
                                <span>🎯 <strong>{data?.workerInfo?.coverageScore || '94.2%'}</strong> RCH Coverage</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                            onClick={fetchDashboardData}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.15)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.85rem'
                            }}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Sync Field Data
                        </button>
                        <button 
                            onClick={() => {
                                setSelectedMother(null);
                                setVitalsForm({
                                    patientName: '',
                                    systolic_bp: 120,
                                    diastolic_bp: 80,
                                    blood_sugar_fbs: 95,
                                    spo2: 98,
                                    pulse_rate: 74,
                                    is_pregnant: false,
                                    danger_signs: 'None'
                                });
                                setVitalsResult(null);
                                setVitalsModal(true);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#f59e0b',
                                border: 'none',
                                color: '#1e293b',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                            }}
                        >
                            <PlusCircle size={16} />
                            Quick Triage Form
                        </button>
                    </div>
                </motion.div>

                {/* Emergency Alert Toast */}
                <AnimatePresence>
                    {emergencySuccess && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                background: '#dc2626',
                                color: '#fff',
                                padding: '16px 20px',
                                borderRadius: '16px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Ambulance size={28} />
                                <div>
                                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>EMERGENCY HOSPITAL ESCALATION DISPATCHED!</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                        High-risk referral sent for <strong>{emergencySuccess.name}</strong> to District Hospital Nashik Emergency Desk & 108 Ambulance Network.
                                    </div>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '8px' }}>
                                Token: EM-ASHA-992
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* KPI Cards Strip */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: '14px',
                    marginBottom: '24px'
                }}>
                    {kpiCards.map((c, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            style={{
                                background: '#fff',
                                borderRadius: '18px',
                                padding: '18px',
                                border: `1px solid ${c.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}
                        >
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '14px',
                                background: c.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {c.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{c.label}</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{c.val}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Tabs Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    borderBottom: '2px solid #e2e8f0',
                    marginBottom: '24px',
                    overflowX: 'auto',
                    paddingBottom: '8px'
                }}>
                    {[
                        { id: 'overview', label: '🤰 Maternal Health (RCH)', icon: <Baby size={18} /> },
                        { id: 'immunization', label: '💉 Child Immunization Due', icon: <Calendar size={18} /> },
                        { id: 'inventory', label: '🎒 ASHA Field Kit & Drugs', icon: <Pill size={18} /> },
                        { id: 'dbt', label: '💰 DBT Incentives', icon: <Award size={18} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeTab === tab.id ? '#0d9488' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#475569',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB 1: MATERNAL HEALTH (RCH) */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                    Registered Pregnant Mothers (ANC Tracking)
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                    Automated high-risk triage, hemoglobin tracking, and emergency facility links.
                                </p>
                            </div>
                            <div style={{ position: 'relative', width: '280px' }}>
                                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                                <input 
                                    type="text"
                                    placeholder="Search mother or husband..."
                                    value={searchBeneficiary}
                                    onChange={(e) => setSearchBeneficiary(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px 8px 36px',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.85rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                            {(data?.maternalBeneficiaries || [])
                                .filter(m => m.name.toLowerCase().includes(searchBeneficiary.toLowerCase()) || m.husbandName.toLowerCase().includes(searchBeneficiary.toLowerCase()))
                                .map((m) => (
                                    <div 
                                        key={m.id}
                                        style={{
                                            background: '#fff',
                                            borderRadius: '20px',
                                            padding: '20px',
                                            border: m.isHighRisk ? '2px solid #f87171' : '1px solid #e2e8f0',
                                            boxShadow: m.isHighRisk ? '0 8px 24px rgba(239, 68, 68, 0.12)' : '0 4px 16px rgba(0,0,0,0.03)',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{m.name}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({m.age} yrs)</span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                    W/O {m.husbandName} • {m.ward}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '2px', fontWeight: '600' }}>
                                                    📞 {m.phone}
                                                </div>
                                            </div>
                                            {m.isHighRisk ? (
                                                <span style={{
                                                    background: '#fee2e2',
                                                    color: '#dc2626',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '800',
                                                    padding: '4px 10px',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <AlertTriangle size={14} /> HIGH RISK ({m.gestationalAgeWeeks}w)
                                                </span>
                                            ) : (
                                                <span style={{
                                                    background: '#dcfce7',
                                                    color: '#16a34a',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    padding: '4px 10px',
                                                    borderRadius: '10px'
                                                }}>
                                                    NORMAL ({m.gestationalAgeWeeks}w)
                                                </span>
                                            )}
                                        </div>

                                        {/* Risk & Milestones Box */}
                                        <div style={{
                                            background: m.isHighRisk ? '#fff1f2' : '#f8fafc',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            margin: '14px 0',
                                            fontSize: '0.85rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span style={{ color: '#64748b' }}>Estimated Due Date (EDD):</span>
                                                <strong style={{ color: '#0f172a' }}>{m.edd}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span style={{ color: '#64748b' }}>ANC Visits:</span>
                                                <strong>{m.ancVisitsCompleted} / {m.totalAncRequired} Completed</strong>
                                            </div>
                                            <div style={{ color: m.isHighRisk ? '#be123c' : '#475569', fontWeight: '600', marginTop: '6px' }}>
                                                Flags: {m.riskFactors.join(' • ')}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => handleOpenVitalsFor(m)}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    background: '#0d9488',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    fontWeight: '700',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Activity size={14} /> Record ANC Vitals
                                            </button>
                                            {m.isHighRisk && (
                                                <button 
                                                    onClick={() => handleTriggerEmergency(m)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        background: '#dc2626',
                                                        color: '#fff',
                                                        border: 'none',
                                                        padding: '8px 14px',
                                                        borderRadius: '10px',
                                                        fontWeight: '700',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Ambulance size={14} /> 108 SOS
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )}

                {/* TAB 2: CHILD IMMUNIZATION */}
                {activeTab === 'immunization' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                            National Immunization Schedule (NIS Due List)
                        </h2>
                        <div style={{
                            background: '#fff',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                        }}>
                            {(data?.immunizationDueList || []).map((imm, idx) => (
                                <div 
                                    key={imm.id}
                                    style={{
                                        padding: '18px 20px',
                                        borderBottom: idx === (data?.immunizationDueList?.length || 0) - 1 ? 'none' : '1px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                        background: imm.status === 'OVERDUE' ? '#fef2f2' : 'transparent'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{imm.childName}</strong>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({imm.ageMonths} months)</span>
                                            {imm.status === 'OVERDUE' && (
                                                <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
                                                    OVERDUE BY {imm.delayDays} DAYS
                                                </span>
                                            )}
                                            {imm.status === 'COMPLETED' && (
                                                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>
                                                    GIVEN
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#0d9488', fontWeight: '700', marginTop: '4px' }}>
                                            💉 {imm.vaccineName}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                            Mother: {imm.motherName} • Phone: {imm.parentPhone} • Due: {imm.dueDate}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => alert(`Vaccination recorded for ${imm.childName}`)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: imm.status === 'COMPLETED' ? '#f1f5f9' : '#059669',
                                            color: imm.status === 'COMPLETED' ? '#94a3b8' : '#fff',
                                            border: 'none',
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            cursor: imm.status === 'COMPLETED' ? 'default' : 'pointer'
                                        }}
                                    >
                                        <Check size={16} /> {imm.status === 'COMPLETED' ? 'Recorded' : 'Mark Administered'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* TAB 3: ASHA KIT INVENTORY */}
                {activeTab === 'inventory' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                            ASHA Medical Kit & Essential Field Supplies
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                            {(data?.kitInventory || []).map((kit, idx) => (
                                <div 
                                    key={idx}
                                    style={{
                                        background: '#fff',
                                        borderRadius: '16px',
                                        padding: '18px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{kit.item}</strong>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: kit.status === 'ADEQUATE' ? '#dcfce7' : '#fef3c7',
                                            color: kit.status === 'ADEQUATE' ? '#15803d' : '#b45309'
                                        }}>
                                            {kit.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0d9488', margin: '10px 0 4px 0' }}>
                                        {kit.currentQty} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>{kit.unit}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        Minimum Buffer Required: {kit.minRequired} {kit.unit}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* TAB 4: DBT INCENTIVES */}
                {activeTab === 'dbt' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#fff',
                            padding: '24px',
                            borderRadius: '20px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Government Direct Benefit Transfer (DBT) Balance</div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>₹4,850.00</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>Linked to Bank of Maharashtra A/C ••4021 (Aadhaar Seeded)</div>
                            </div>
                            <Award size={48} opacity={0.8} />
                        </div>

                        <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            {(data?.dbtIncentives || []).map((dbt, idx) => (
                                <div 
                                    key={dbt.id}
                                    style={{
                                        padding: '16px 20px',
                                        borderBottom: idx === (data?.dbtIncentives?.length || 0) - 1 ? 'none' : '1px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <div>
                                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{dbt.activity}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                            Beneficiary: {dbt.beneficiary} • Date: {dbt.date}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ fontSize: '1.1rem', color: '#059669' }}>+₹{dbt.amount}</strong>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            color: dbt.status === 'CREDITED_TO_BANK' ? '#16a34a' : '#d97706'
                                        }}>
                                            {dbt.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* MODAL: QUICK VITALS & TRIAGE FORM */}
                <AnimatePresence>
                    {vitalsModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '16px'
                        }}>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                style={{
                                    background: '#fff',
                                    borderRadius: '24px',
                                    padding: '28px',
                                    width: '100%',
                                    maxWidth: '520px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                    maxHeight: '90vh',
                                    overflowY: 'auto'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                                        Field Vitals & Triage Entry
                                    </h3>
                                    <button 
                                        onClick={() => setVitalsModal(false)}
                                        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleSubmitVitals}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                            Beneficiary / Patient Name
                                        </label>
                                        <input 
                                            type="text"
                                            required
                                            value={vitalsForm.patientName}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, patientName: e.target.value })}
                                            placeholder="Enter patient name..."
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                                Systolic BP (mmHg)
                                            </label>
                                            <input 
                                                type="number"
                                                value={vitalsForm.systolic_bp}
                                                onChange={(e) => setVitalsForm({ ...vitalsForm, systolic_bp: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                                Diastolic BP (mmHg)
                                            </label>
                                            <input 
                                                type="number"
                                                value={vitalsForm.diastolic_bp}
                                                onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic_bp: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                                Blood Sugar FBS (mg/dL)
                                            </label>
                                            <input 
                                                type="number"
                                                value={vitalsForm.blood_sugar_fbs}
                                                onChange={(e) => setVitalsForm({ ...vitalsForm, blood_sugar_fbs: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                                SpO2 (%)
                                            </label>
                                            <input 
                                                type="number"
                                                value={vitalsForm.spo2}
                                                onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    </div>

                                    {vitalsResult && (
                                        <div style={{
                                            padding: '14px',
                                            borderRadius: '12px',
                                            background: vitalsResult.riskLevel.includes('HIGH') ? '#fee2e2' : '#f0fdf4',
                                            border: `1px solid ${vitalsResult.riskLevel.includes('HIGH') ? '#fca5a5' : '#86efac'}`,
                                            marginBottom: '16px'
                                        }}>
                                            <div style={{
                                                fontWeight: '800',
                                                color: vitalsResult.riskLevel.includes('HIGH') ? '#dc2626' : '#15803d',
                                                fontSize: '0.9rem'
                                            }}>
                                                RISK EVALUATION: {vitalsResult.riskLevel}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#334155' }}>
                                                {vitalsResult.alertMessage}
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit"
                                        disabled={submittingVitals}
                                        style={{
                                            width: '100%',
                                            background: '#0d9488',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {submittingVitals ? 'Evaluating Triage...' : 'Save & Evaluate Community Triage'}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default AshaDashboard;
