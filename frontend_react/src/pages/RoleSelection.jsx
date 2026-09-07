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
            title: 'ASHA / ANM / Caregiver',
            badge: 'Field & Family Ops',
            badgeColor: '#059669',
            badgeBg: '#d1fae5',
            desc: 'RCH tracking, dependent vitals & household family proxy',
            icon: <HeartPulse size={28} color="#0d9488" />,
            gradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
            actionText: 'ASHA / Caregiver Hub',
            onClick: () => {
                guestLogin('health_worker');
                navigate('/asha');
            }
        },
        {
            role: 'patient',
            title: 'Patient Portal',
            badge: 'Self-Service',
            badgeColor: '#2563eb',
            badgeBg: '#dbeafe',
            desc: 'Lab reports, AI triage & referral tracking',
            icon: <User size={28} color="#2563eb" />,
            gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            actionText: 'Enter Patient',
            onClick: () => {
                guestLogin('patient');
                navigate('/home');
            }
        },
        {
            role: 'doctor',
            title: 'Doctor OPD',
            badge: 'Clinical EHR',
            badgeColor: '#0284c7',
            badgeBg: '#e0f2fe',
            desc: 'EHR records, e-prescriptions & consults',
            icon: <Stethoscope size={28} color="#0284c7" />,
            gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            actionText: 'Doctor OPD',
            onClick: () => {
                guestLogin('doctor');
                navigate('/doctor/dashboard');
            }
        },
        {
            role: 'facility_staff',
            title: 'Hospital Operations',
            badge: 'Bed & ICU Grid',
            badgeColor: '#d97706',
            badgeBg: '#fef3c7',
            desc: 'Live beds, triage stream & duty roster',
            icon: <Building2 size={28} color="#0284c7" />,
            gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            actionText: 'Facility Hub',
            onClick: () => {
                guestLogin('facility_coordinator');
                navigate('/facility-dashboard');
            }
        },
        {
            role: 'admin',
            title: 'Admin Oversight',
            badge: 'SHA-256 Ledger',
            badgeColor: '#475569',
            badgeBg: '#f1f5f9',
            desc: 'Referral KPIs & tamper-evident logs',
            icon: <Lock size={28} color="#475569" />,
            gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
            actionText: 'Admin Dashboard',
            onClick: () => {
                guestLogin('admin');
                navigate('/admin');
            }
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
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '16px',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                }}
            >
                <Sparkles size={14} color="#fef08a" />
                <span>Health Coordination & Care Platform</span>
            </motion.div>

            {/* Logo and Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '28px', color: '#1e293b' }}
            >
                <div style={{
                    width: '68px',
                    height: '68px',
                    background: 'white',
                    borderRadius: '18px',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.1)'
                }}>
                    <HeartPulse size={38} color="#0d9488" />
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px 0', color: '#0f172a' }}>
                    Swasthya
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px', lineHeight: '1.4' }}>
                    AI Clinical Triage, Referral Engine & Health Records
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            padding: '9px 18px',
                            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                        }}
                    >
                        <span>Sign In</span>
                        <ArrowRight size={15} />
                    </button>
                    <button
                        onClick={() => { guestLogin('patient'); navigate('/home'); }}
                        style={{
                            padding: '9px 16px',
                            background: 'white',
                            color: '#0f766e',
                            border: '1.5px solid #99f6e4',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        ⚡ 1-Click Demo
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
