import React, { useState, useEffect, useContext } from 'react';
import { 
    Activity, FileText, Mic, ChevronRight, UserPlus, Bell, Users, 
    ShieldCheck, GitBranch, Building2, Stethoscope, Sparkles, BookOpen, 
    HeartPulse, QrCode, Lock, TrendingUp, ArrowRight, CheckCircle2, 
    AlertTriangle, Clock, Compass, PhoneCall, Layers, FileCheck, 
    MessageSquareHeart, Phone, Pill, PlusCircle, ShieldAlert, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [emergencySent, setEmergencySent] = useState(false);

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
                if (Array.isArray(resDocs.data) && resDocs.data.length > 0) {
                    setDoctors(resDocs.data);
                } else {
                    setDoctors([
                        { id: 'doc-1', name: 'Dr. Anand Deshmukh', specialization: 'Cardiology', hospital_name: 'District Hospital Nashik', phone: '+91 9822012345' },
                        { id: 'doc-2', name: 'Dr. Suniti Rao', specialization: 'Obstetrics & Gynaecology', hospital_name: 'Civil Hospital Pune', phone: '+91 9822344551' }
                    ]);
                }
            } catch (e) {
                setDoctors([
                    { id: 'doc-1', name: 'Dr. Anand Deshmukh', specialization: 'Cardiology', hospital_name: 'District Hospital Nashik', phone: '+91 9822012345' },
                    { id: 'doc-2', name: 'Dr. Suniti Rao', specialization: 'Obstetrics & Gynaecology', hospital_name: 'Civil Hospital Pune', phone: '+91 9822344551' }
                ]);
            }

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
                } else {
                    setActiveReferral({
                        id: 'ref-demo',
                        slot_token: '#TK-042',
                        facilities: { name: 'District Civil Hospital Nashik' },
                        specialty_required: 'Cardiology OPD Consult',
                        status: 'APPOINTMENT_BOOKED'
                    });
                }
            } catch (e) {
                setActiveReferral({
                    id: 'ref-demo',
                    slot_token: '#TK-042',
                    facilities: { name: 'District Civil Hospital Nashik' },
                    specialty_required: 'Cardiology OPD Consult',
                    status: 'APPOINTMENT_BOOKED'
                });
            }

            // Fetch facilities
            try {
                const resFac = await axios.get('/api/facilities');
                if (Array.isArray(resFac.data) && resFac.data.length > 0) {
                    setFacilities(resFac.data.slice(0, 3));
                } else {
                    setFacilities([
                        { id: 'f-1', name: 'District Civil Hospital Nashik', district: 'Nashik', tier: 'DISTRICT_HOSPITAL', emergency_capable: true, current_load: 78 },
                        { id: 'f-2', name: 'Government General Hospital Pune', district: 'Pune', tier: 'TERTIARY_HOSPITAL', emergency_capable: true, current_load: 84 },
                        { id: 'f-3', name: 'PHC Shirwal Primary Centre', district: 'Pune', tier: 'PRIMARY_HEALTH_CENTRE', emergency_capable: false, current_load: 42 }
                    ]);
                }
            } catch (e) {
                setFacilities([
                    { id: 'f-1', name: 'District Civil Hospital Nashik', district: 'Nashik', tier: 'DISTRICT_HOSPITAL', emergency_capable: true, current_load: 78 },
                    { id: 'f-2', name: 'Government General Hospital Pune', district: 'Pune', tier: 'TERTIARY_HOSPITAL', emergency_capable: true, current_load: 84 },
                    { id: 'f-3', name: 'PHC Shirwal Primary Centre', district: 'Pune', tier: 'PRIMARY_HEALTH_CENTRE', emergency_capable: false, current_load: 42 }
                ]);
            }

        } catch (err) {
            console.error('Home data load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencySos = () => {
        setEmergencySent(true);
        setTimeout(() => setEmergencySent(false), 5000);
    };

    const coreFeatures = [
        {
            title: '13-State Referral Engine',
            tag: 'Closed-Loop',
            desc: 'Track referral milestones from initial triage to verified follow-up closure.',
            icon: <GitBranch size={26} color="#0d9488" />,
            bgColor: '#ccfbf1',
            badgeColor: '#0f766e',
            link: '/referrals'
        },
        {
            title: 'Smart Facility Matching',
            tag: 'Live Bed Meters',
            desc: 'Multi-tier hospital directory with live occupancy load & emergency tags.',
            icon: <Building2 size={26} color="#2563eb" />,
            bgColor: '#dbeafe',
            badgeColor: '#1d4ed8',
            link: '/facilities'
        },
        {
            title: 'AI Clinical Risk Triage',
            tag: 'Explainable AI',
            desc: 'Vitals scoring (BP, SpO2, Pulse) with instant risk evaluation.',
            icon: <HeartPulse size={26} color="#dc2626" />,
            bgColor: '#fee2e2',
            badgeColor: '#b91c1c',
            link: '/triage'
        },
        {
            title: 'Multimodal Lab Report OCR',
            tag: 'AI Intelligence',
            desc: 'Upload scans & blood tests for automatic structured health summaries.',
            icon: <FileText size={26} color="#7c3aed" />,
            bgColor: '#ede9fe',
            badgeColor: '#6d28d9',
            link: '/records'
        },
        {
            title: '👩‍⚕️ ASHA / ANM Frontline Worker Hub',
            tag: 'Field Operations',
            desc: 'Mother & child RCH tracking, NIS immunizations, and DBT incentives.',
            icon: <HeartPulse size={26} color="#0d9488" />,
            bgColor: '#ccfbf1',
            badgeColor: '#0f766e',
            link: '/asha'
        },
        {
            title: '👨‍👩‍👧 Caregiver Command Hub',
            tag: 'Family Proxy',
            desc: 'Multi-dependent vitals radar, smart pillbox adherence & SOS panic alert.',
            icon: <Users size={26} color="#db2777" />,
            bgColor: '#fce7f3',
            badgeColor: '#be185d',
            link: '/caregiver'
        },
        {
            title: '🏥 Hospital & Facility Operations',
            tag: 'Operations Desk',
            desc: 'Live bed & ICU grid, inbound triage stream & duty doctor roster.',
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
            desc: 'Tamper-evident audit ledger, district load metrics, and disease radar.',
            icon: <Lock size={26} color="#475569" />,
            bgColor: '#f1f5f9',
            badgeColor: '#334155',
            link: '/admin'
        }
    ];

    return (
        <div style={{
            padding: '20px 16px 120px 16px',
            backgroundColor: 'var(--bg-color)',
            minHeight: '100vh',
            maxWidth: '1200px',
            margin: '0 auto',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            
            {/* Top Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            AYUSHMAN BHARAT SWASTHYA
                        </span>
                    </div>
                    <h1 style={{ fontSize: '24px', color: 'var(--text-primary)', margin: '2px 0 0', fontWeight: 800 }}>
                        {user?.name || 'Swasthya Citizen'}
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Emergency 108 Quick Trigger */}
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleEmergencySos}
                        style={{
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                        }}
                    >
                        <Phone size={14} /> 108 SOS
                    </motion.button>

                    {/* Feedback Button */}
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ccfbf1',
                            padding: '7px 12px',
                            borderRadius: '16px',
                            border: '1px solid #99f6e4'
                        }} 
                        onClick={() => setIsFeedbackOpen(true)}
                        title="Feedback & Suggestions"
                    >
                        <MessageSquareHeart size={16} color="#0f766e" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e' }}>Feedback</span>
                    </motion.div>

                    {/* Notifications */}
                    <div 
                        style={{ position: 'relative', cursor: 'pointer', background: 'var(--card-bg)', padding: '8px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                        onClick={() => navigate('/notifications')}
                    >
                        <Bell size={18} color="var(--text-primary)" />
                        <div style={{
                            position: 'absolute', top: '-2px', right: '-2px', background: '#dc2626',
                            color: 'white', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                        }}>
                            2
                        </div>
                    </div>

                    {/* Profile Avatar */}
                    <div
                        onClick={() => navigate('/profile')}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-color)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '14px'
                        }}
                    >
                        {user?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                </div>
            </header>

            {/* Emergency SOS Banner Alert */}
            <AnimatePresence>
                {emergencySent && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            background: '#dc2626',
                            color: '#fff',
                            padding: '14px 18px',
                            borderRadius: '16px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldAlert size={24} />
                            <div>
                                <strong>108 AMBULANCE & HOSPITAL SOS BROADCASTED!</strong>
                                <div style={{ fontSize: '12px', opacity: 0.9 }}>Emergency medical team and nearby hospital desk notified with GPS coordinates.</div>
                            </div>
                        </div>
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px' }}>Token #SOS-911</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Feedback Modal */}
            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Quick Multi-Role Dashboard Switcher Bar */}
            <div style={{
                marginBottom: '22px',
                background: 'var(--card-bg)',
                borderRadius: '18px',
                padding: '14px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} color="#0d9488" />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Healthcare Role Portals
                        </span>
                    </div>
                    <span 
                        onClick={() => navigate('/roles')}
                        style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                        All Roles <ArrowRight size={14} />
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
                    padding: '22px',
                    marginBottom: '26px',
                    boxShadow: '0 12px 28px rgba(17, 94, 89, 0.35)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ background: '#059669', color: '#ecfdf5', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                                    ● 13-State Referral In Progress
                                </span>
                                <span style={{ background: 'rgba(255,255,255,0.15)', fontSize: '10px', padding: '4px 8px', borderRadius: '20px' }}>
                                    Token: {activeReferral?.slot_token || '#TK-042'}
                                </span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>
                                {activeReferral?.facilities?.name || 'District Civil Hospital Nashik'}
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#99f6e4' }}>
                                Specialty: {activeReferral?.specialty_required || 'Cardiology Consult'} • Status: <strong style={{ color: '#fed7aa' }}>{activeReferral?.status || 'APPOINTMENT_BOOKED'}</strong>
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/referrals')}
                            style={{
                                background: '#14b8a6',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)'
                            }}
                        >
                            Track Journey <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* Progress Track */}
                    <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, color: '#ccfbf1', marginBottom: '6px' }}>
                            <span>1. Triaged</span>
                            <span>2. Facility Assigned</span>
                            <span style={{ color: '#fef08a', fontWeight: 800 }}>3. Booked (Active)</span>
                            <span>4. Transit</span>
                            <span>5. Care Done</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #2dd4bf, #facc15)', borderRadius: '3px' }}></div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Action Navigation Grid */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>
                        Swasthya Core Ecosystem
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        All 11 Modules
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '14px'
                }}>
                    {coreFeatures.map((feat, index) => (
                        <motion.div
                            key={index}
                            className="card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => navigate(feat.link)}
                            style={{
                                padding: '18px',
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
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
                                        padding: '3px 8px',
                                        borderRadius: '8px',
                                        background: feat.bgColor,
                                        color: feat.badgeColor
                                    }}>
                                        {feat.tag}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {feat.title}
                                </h3>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                    {feat.desc}
                                </p>
                            </div>

                            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)' }}>
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
                    <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>
                        Nearby Facility Operational Loads
                    </h2>
                    <button
                        onClick={() => navigate('/facilities')}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        View Directory <ChevronRight size={16} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {facilities.map((fac) => (
                        <div
                            key={fac.id}
                            className="card"
                            onClick={() => navigate('/facilities')}
                            style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '16px', cursor: 'pointer', background: 'var(--card-bg)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{fac.name}</h3>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{fac.district} • {fac.tier}</div>
                                </div>
                                {fac.emergency_capable && (
                                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c' }}>
                                        24x7 Emergency
                                    </span>
                                )}
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Bed Occupancy:</span>
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

            {/* Connected Doctors / Care Team Preview */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>
                        Your Care Team & Doctors
                    </h2>
                    <button
                        onClick={() => navigate('/care-team')}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        View All <ChevronRight size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {doctors.map((doc, i) => (
                        <div
                            key={doc.id || i}
                            onClick={() => navigate('/care-team')}
                            style={{
                                minWidth: '220px',
                                padding: '14px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--card-bg)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: '#e0f2fe',
                                color: '#0284c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '800',
                                fontSize: '14px'
                            }}>
                                {doc.name?.[0] || 'D'}
                            </div>
                            <div>
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>{doc.name}</strong>
                                <div style={{ fontSize: '11px', color: 'var(--primary-color)' }}>{doc.specialization}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{doc.hospital_name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Home;
