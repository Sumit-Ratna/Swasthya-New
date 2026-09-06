import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Stethoscope, User, HeartPulse, ShieldAlert, Users, 
    Building2, Activity, ArrowRight, Sparkles, CheckCircle2, Lock
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const RoleSelection = () => {
    const navigate = useNavigate();
    const { guestLogin } = useContext(AuthContext);

    const personas = [
        {
            role: 'health_worker',
            title: 'ASHA / ANM Health Worker',
            badge: 'Primary Rural Route',
            badgeColor: '#059669',
            badgeBg: '#d1fae5',
            desc: 'Rapid patient registration, vitals triage, offline emergency escalation.',
            icon: <HeartPulse size={32} color="#0d9488" />,
            gradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
            actionText: 'Open Health Worker Portal',
            onClick: () => {
                guestLogin('health_worker');
                navigate('/triage');
            }
        },
        {
            role: 'patient',
            title: 'Patient Self-Service',
            badge: 'Personal Health Portal',
            badgeColor: '#2563eb',
            badgeBg: '#dbeafe',
            desc: 'Upload lab reports, view AI medical summaries, track referral journey.',
            icon: <User size={32} color="#2563eb" />,
            gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            actionText: 'Enter as Patient',
            onClick: () => navigate('/login')
        },
        {
            role: 'caregiver',
            title: 'Caregiver / Family Proxy',
            badge: 'Scoped Access',
            badgeColor: '#db2777',
            badgeBg: '#fce7f3',
            desc: 'Authorized proxy care management for elderly parents & illiterate dependents.',
            icon: <Users size={32} color="#db2777" />,
            gradient: 'linear-gradient(135deg, #db2777 0%, #9d174d 100%)',
            actionText: 'Caregiver Login',
            onClick: () => {
                guestLogin('caregiver');
                navigate('/family');
            }
        },
        {
            role: 'doctor',
            title: 'Doctor & Medical Officer',
            badge: 'Clinical OPD & Telehealth',
            badgeColor: '#0284c7',
            badgeBg: '#e0f2fe',
            desc: 'Review incoming referrals, access longitudinal EHR, issue e-prescriptions.',
            icon: <Stethoscope size={32} color="#0284c7" />,
            gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            actionText: 'Doctor Portal Login',
            onClick: () => navigate('/login/doctor')
        },
        {
            role: 'facility_staff',
            title: 'Facility Staff & Coordinator',
            badge: 'Operational Load',
            badgeColor: '#d97706',
            badgeBg: '#fef3c7',
            desc: 'Manage bed capacity (0-100%), emergency capabilities, internal doctor assignment.',
            icon: <Building2 size={32} color="#d97706" />,
            gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            actionText: 'Facility Dashboard',
            onClick: () => {
                guestLogin('facility_coordinator');
                navigate('/facilities');
            }
        },
        {
            role: 'admin',
            title: 'Health Authority & MSInS Admin',
            badge: 'SHA-256 Audit Chain',
            badgeColor: '#475569',
            badgeBg: '#f1f5f9',
            desc: 'Closed-loop KPI metrics, referral bottleneck alerts, tamper-evident logs.',
            icon: <Lock size={32} color="#475569" />,
            gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
            actionText: 'Admin Oversight',
            onClick: () => navigate('/admin')
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            {/* Mission Badge */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(90deg, #0f766e, #0284c7)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                }}
            >
                <Sparkles size={16} color="#fef08a" />
                <span>Swasthya (स्वास्थ्य सेतु) • Problem Statement #26133 • MSInS SIH 2026</span>
            </motion.div>

            {/* Logo and Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '36px', color: '#1e293b' }}
            >
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'white',
                    borderRadius: '20px',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.12)'
                }}>
                    <HeartPulse size={44} color="#0d9488" />
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a' }}>
                    Swasthya
                </h1>
                <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '580px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                    AI-Assisted Rural Healthcare Coordination, 13-State Closed-Loop Referral Engine & Electronic Health Record Platform
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            padding: '10px 22px',
                            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '24px',
                            fontSize: '14px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
                        }}
                    >
                        <span>Open Unified Login Page</span>
                        <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={() => { guestLogin('patient'); navigate('/home'); }}
                        style={{
                            padding: '10px 20px',
                            background: 'white',
                            color: '#0f766e',
                            border: '1.5px solid #99f6e4',
                            borderRadius: '24px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        ⚡ 1-Click Patient Demo
                    </button>
                </div>
            </motion.div>

            {/* Persona Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px',
                maxWidth: '1100px',
                width: '100%',
                marginBottom: '40px'
            }}>
                {personas.map((p, index) => (
                    <motion.div
                        key={p.role}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        whileHover={{ y: -6, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        onClick={p.onClick}
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '28px 24px',
                            cursor: 'pointer',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '14px',
                                    background: p.badgeBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {p.icon}
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    background: p.badgeBg,
                                    color: p.badgeColor
                                }}>
                                    {p.badge}
                                </span>
                            </div>

                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                                {p.title}
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                                {p.desc}
                            </p>
                        </div>

                        <div style={{
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#0f766e',
                            fontWeight: 700,
                            fontSize: '13px'
                        }}>
                            <span>{p.actionText}</span>
                            <ArrowRight size={16} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Demo Bypass Footer */}
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '16px' }}>
                <span>Need immediate access? </span>
                <span
                    onClick={() => { guestLogin('patient'); navigate('/home'); }}
                    style={{ color: '#0d9488', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Enter Instant Demo Mode
                </span>
            </div>

            <p style={{ marginTop: '24px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
                Powered by AI • Supabase PostgreSQL • ABDM Interoperable • SHA-256 Ledger
            </p>
        </div>
    );
};

export default RoleSelection;
