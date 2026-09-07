import React, { useState, useEffect, useContext } from 'react';
import { 
    Activity, FileText, Mic, ChevronRight, UserPlus, Bell, Users, 
    ShieldCheck, GitBranch, Building2, Stethoscope, Sparkles, BookOpen, 
    HeartPulse, QrCode, Lock, TrendingUp, ArrowRight, CheckCircle2, 
    AlertTriangle, Clock, Compass, PhoneCall, Layers, FileCheck, MessageSquareHeart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FeedbackModal from '../components/FeedbackModal';
import axios from 'axios';

const Home = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [activeReferral, setActiveReferral] = useState(null);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            // Fetch connected doctors
            try {
                const resDocs = await axios.get('/api/connect/patient/doctors', authHeader);
                setDoctors(resDocs.data || []);
            } catch (e) {}

            // Fetch appointments
            try {
                const resApts = await axios.get('/api/connect/patient/appointments', authHeader);
                setAppointments(resApts.data || []);
            } catch (e) {}

            // Fetch active referral
            try {
                const resRef = await axios.get('/api/referrals', authHeader);
                if (Array.isArray(resRef.data) && resRef.data.length > 0) {
                    setActiveReferral(resRef.data[0]);
                }
            } catch (e) {}

            // Fetch top facilities
            try {
                const resFac = await axios.get('/api/facilities');
                setFacilities(Array.isArray(resFac.data) ? resFac.data.slice(0, 3) : []);
            } catch (e) {}

        } catch (err) {
            console.error('Home data load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const coreFeatures = [
        {
            title: '13-State Referral Engine',
            tag: 'Core Closed-Loop',
            desc: 'Track referral milestones from triage to verified follow-up closure.',
            icon: <GitBranch size={26} color="#0d9488" />,
            bgColor: '#ccfbf1',
            badgeColor: '#0f766e',
            link: '/referrals'
        },
        {
            title: 'Smart Facility Matching',
            tag: 'Live Load Meters',
            desc: 'Multi-tier directory with real-time occupancy load & emergency tags.',
            icon: <Building2 size={26} color="#2563eb" />,
            bgColor: '#dbeafe',
            badgeColor: '#1d4ed8',
            link: '/facilities'
        },
        {
            title: 'AI Clinical Risk Triage',
            tag: 'Explainable AI',
            desc: 'Vitals scoring (BP, SpO2, Pulse) with severe risk condition flags.',
            icon: <HeartPulse size={26} color="#dc2626" />,
            bgColor: '#fee2e2',
            badgeColor: '#b91c1c',
            link: '/triage'
        },
        {
            title: 'Multimodal Lab Report OCR',
            tag: 'Gemini / MedGemma',
            desc: 'Upload scans & blood tests for automatic structured health summaries.',
            icon: <FileText size={26} color="#7c3aed" />,
            bgColor: '#ede9fe',
            badgeColor: '#6d28d9',
            link: '/records'
        },
        {
            title: '👩‍⚕️ ASHA / ANM Frontline Worker Hub',
            tag: 'Field Operations',
            desc: 'Mother & child RCH tracking, NIS immunizations, field triage, and DBT incentives.',
            icon: <HeartPulse size={26} color="#0d9488" />,
            bgColor: '#ccfbf1',
            badgeColor: '#0f766e',
            link: '/asha'
        },
        {
            title: '👨‍👩‍👧 Caregiver Command Hub',
            tag: 'Family Proxy',
            desc: 'Multi-dependent vitals radar, smart pillbox adherence, and 1-click Emergency SOS panic.',
            icon: <Users size={26} color="#db2777" />,
            bgColor: '#fce7f3',
            badgeColor: '#be185d',
            link: '/caregiver'
        },
        {
            title: '🏥 Hospital & Facility Operations',
            tag: 'Command Center',
            desc: 'Live bed & ICU grid, inbound triage queue, duty doctor roster & oxygen manifold.',
            icon: <Building2 size={26} color="#0284c7" />,
            bgColor: '#e0f2fe',
            badgeColor: '#0369a1',
            link: '/facility-dashboard'
        },
        {
            title: 'Guardian AI Drug Safety',
            tag: 'Interaction Shield',
            desc: 'Cross-checks prescriptions against allergies & chronic conditions.',
            icon: <ShieldCheck size={26} color="#16a34a" />,
            bgColor: '#dcfce7',
            badgeColor: '#15803d',
            link: '/services'
        },
        {
            title: 'Visual Medicine Explainer',
            tag: 'Elderly Friendly',
            desc: 'Illustrated dosage guides and interactive medicine storyboards.',
            icon: <BookOpen size={26} color="#d97706" />,
            bgColor: '#fef3c7',
            badgeColor: '#b45309',
            link: '/learn-medicines'
        },
        {
            title: 'Caregiver & Family Circles',
            tag: 'Scoped Access',
            desc: 'Grant secure family proxy access for elderly and rural dependents.',
            icon: <Users size={26} color="#ec4899" />,
            bgColor: '#fce7f3',
            badgeColor: '#be185d',
            link: '/family'
        },
        {
            title: '🛡️ Health Authority Admin Center',
            tag: 'SHA-256 Chained',
            desc: 'Tamper-evident logs, district load metrics, and disease outbreak radar.',
            icon: <Lock size={26} color="#475569" />,
            bgColor: '#f1f5f9',
            badgeColor: '#334155',
            link: '/admin'
        }
    ];

    return (
        <div style={{ padding: '20px', paddingBottom: '120px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Welcome to Swasthya,</p>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-primary)', margin: '2px 0 0', fontWeight: 800 }}>
                        {user?.name || 'Patient'}
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Feedback Button Near Notification Icon */}
                    <motion.div 
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ 
                            position: 'relative', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #ccfbf1 0%, #e0f2fe 100%)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid #99f6e4',
                            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.12)'
                        }} 
                        onClick={() => setIsFeedbackOpen(true)}
                        title="Give Feedback & Suggestions"
                    >
                        <MessageSquareHeart size={20} color="#0f766e" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e' }}>Feedback</span>
                    </motion.div>

                    {/* Notification Bell */}
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/notifications')} title="Notifications">
                        <Bell size={24} color="var(--text-primary)" />
                        <div style={{
                            position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger-color)',
                            color: 'white', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                            border: '2px solid var(--bg-color)'
                        }}>
                            3
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/profile')}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--primary-color)' }}
                    >
                        <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{user?.name?.[0]?.toUpperCase() || 'P'}</span>
                    </div>
                </div>
            </header>

            {/* Feedback Modal */}
            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Quick Multi-Role Dashboard Switcher Bar */}
            <div style={{
                marginBottom: '22px',
                background: '#fff',
                borderRadius: '18px',
                padding: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} color="#0d9488" />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                            Healthcare Role Portals
                        </span>
                    </div>
                    <span 
                        onClick={() => navigate('/roles')}
                        style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                        View All Roles <ArrowRight size={14} />
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    paddingBottom: '4px'
                }}>
                    {[
                        { title: 'ASHA / ANM', icon: '👩‍⚕️', bg: '#ccfbf1', color: '#0f766e', link: '/asha' },
                        { title: 'Caregiver Hub', icon: '👨‍👩‍👧', bg: '#fce7f3', color: '#be185d', link: '/caregiver' },
                        { title: 'Facility Ops', icon: '🏥', bg: '#e0f2fe', color: '#0369a1', link: '/facility-dashboard' },
                        { title: 'Admin Command', icon: '🛡️', bg: '#f1f5f9', color: '#334155', link: '/admin' },
                        { title: 'Doctor OPD', icon: '🩺', bg: '#fef3c7', color: '#b45309', link: '/doctor/dashboard' }
                    ].map((p, idx) => (
                        <motion.button
                            key={idx}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => navigate(p.link)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: p.bg,
                                color: p.color,
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                            }}
                        >
                            <span>{p.icon}</span>
                            <span>{p.title}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Active Referral Live Journey Widget */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(135deg, #042f2e 0%, #115e59 100%)',
                    color: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '28px',
                    boxShadow: '0 12px 28px rgba(17, 94, 89, 0.35)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ background: '#059669', color: '#ecfdf5', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ● 13-State Referral In Progress
                                </span>
                                <span style={{ background: 'rgba(255,255,255,0.15)', fontSize: '11px', padding: '4px 10px', borderRadius: '20px' }}>
                                    Token: {activeReferral?.slot_token || '#A-14'}
                                </span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'white' }}>
                                {activeReferral?.facilities?.name || 'District Hospital Nashik'}
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#99f6e4' }}>
                                Specialty: {activeReferral?.specialty_required || 'OBSTETRICS'} • Status: <strong style={{ color: '#fed7aa' }}>{activeReferral?.status || 'APPOINTMENT_BOOKED'}</strong>
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/referrals')}
                            style={{
                                background: '#14b8a6',
                                color: 'white',
                                border: 'none',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)'
                            }}
                        >
                            Track Journey <ArrowRight size={16} />
                        </button>
                    </div>

                    {/* Progress Track */}
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#ccfbf1', marginBottom: '8px' }}>
                            <span>1. Triaged</span>
                            <span>2. Facility Assigned</span>
                            <span style={{ color: '#fef08a', fontWeight: 800 }}>3. Booked (Active)</span>
                            <span>4. Transit</span>
                            <span>5. Care Done</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '45%', height: '100%', background: 'linear-gradient(90deg, #2dd4bf, #facc15)', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Action Navigation Grid (All README Features) */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>
                        Swasthya Platform Capabilities
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        All 8 Core Modules
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '16px'
                }}>
                    {coreFeatures.map((feat, index) => (
                        <motion.div
                            key={index}
                            className="card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(feat.link)}
                            style={{
                                padding: '20px',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'all 0.25s ease',
                                background: 'var(--card-bg)',
                                borderRadius: '16px'
                            }}
                            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '14px',
                                        background: feat.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {feat.icon}
                                    </div>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        background: feat.bgColor,
                                        color: feat.badgeColor
                                    }}>
                                        {feat.tag}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {feat.title}
                                </h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                    {feat.desc}
                                </p>
                            </div>

                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--primary-color)' }}>
                                <span>Open Module</span>
                                <ChevronRight size={14} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Smart Facility Directory Preview */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>
                        Nearby Facility Operational Loads
                    </h2>
                    <button
                        onClick={() => navigate('/facilities')}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        View Directory <ChevronRight size={16} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {facilities.map((fac) => (
                        <div
                            key={fac.id}
                            className="card"
                            onClick={() => navigate('/facilities')}
                            style={{ padding: '18px', border: '1px solid var(--border-color)', borderRadius: '16px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{fac.name}</h3>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{fac.district} • {fac.tier}</div>
                                </div>
                                {fac.emergency_capable && (
                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c' }}>
                                        24x7 Emergency
                                    </span>
                                )}
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Current Bed Load:</span>
                                    <strong style={{ color: fac.current_load > 75 ? '#dc2626' : '#16a34a' }}>{fac.current_load}%</strong>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${fac.current_load}%`,
                                        height: '100%',
                                        background: fac.current_load > 75 ? '#dc2626' : fac.current_load > 50 ? '#d97706' : '#16a34a'
                                    }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Care Team Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>
                    Your Care Team & Doctors
                </h2>
                <button
                    onClick={() => navigate('/care-team')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    View All <ChevronRight size={16} />
                </button>
            </div>

            {loading ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading doctors...
                </div>
            ) : doctors.length === 0 ? (
                <motion.div
                    className="card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate('/scan')}
                    style={{ padding: '24px', textAlign: 'center', cursor: 'pointer', border: '2px dashed #cbd5e1', background: 'var(--bg-color)', borderRadius: '16px' }}
                >
                    <UserPlus size={32} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Scan Doctor's QR Code to Link Care Team</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Tap to open scanner</p>
                </motion.div>
            ) : (
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {doctors.map((doc, i) => (
                        <motion.div
                            key={doc.id}
                            className="card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + (i * 0.05) }}
                            onClick={() => setSelectedDoctor(doc)}
                            style={{ minWidth: '170px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '16px' }}
                        >
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: 'var(--primary-light)', marginBottom: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)'
                            }}>
                                {doc.name?.[0]?.toUpperCase() || 'D'}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '14px', textAlign: 'center', color: 'var(--text-primary)' }}>{doc.name || 'Doctor'}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{doc.specialization || 'General'}</span>
                            {doc.hospital_name && (
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>{doc.hospital_name}</span>
                            )}
                        </motion.div>
                    ))}
                    <div
                        onClick={() => navigate('/scan')}
                        style={{ minWidth: '90px', borderRadius: '16px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '16px' }}
                    >
                        <QrCode size={24} color="var(--text-secondary)" style={{ marginBottom: '6px' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Scan QR</span>
                    </div>
                </div>
            )}

            {/* Doctor Modal View */}
            {selectedDoctor && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1100,
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="card"
                        style={{ width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                    {selectedDoctor.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>{selectedDoctor.name}</h2>
                                    <p style={{ margin: 0, color: 'var(--primary-color)', fontWeight: 500 }}>{selectedDoctor.specialization}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDoctor(null)}
                                style={{ background: 'var(--bg-color)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Hospital</div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedDoctor.hospital_name || 'N/A'}</div>
                            </div>
                            <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Doctor ID</div>
                                <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedDoctor.doctor_qr_id}</div>
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={() => {
                                setSelectedDoctor(null);
                                navigate('/care-team');
                            }}
                            style={{ marginTop: '20px', width: '100%' }}
                        >
                            View Full Profile & Consult
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Home;
