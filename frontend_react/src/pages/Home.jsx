import React, { useState, useEffect, useContext } from 'react';
import { 
    Activity, FileText, Mic, ChevronRight, UserPlus, Bell, Users, 
    ShieldCheck, GitBranch, Building2, Stethoscope, Sparkles, BookOpen, 
    HeartPulse, QrCode, Lock, TrendingUp, ArrowRight, CheckCircle2, 
    AlertTriangle, Clock, Compass, PhoneCall, Layers, FileCheck, 
    MessageSquareHeart, Phone, Pill, PlusCircle, ShieldAlert, Heart,
    MapPin, Navigation, Navigation2, ExternalLink, Route, Car, Calendar, UserCheck,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FeedbackModal from '../components/FeedbackModal';
import OfflineHealthHelpBot from '../components/OfflineHealthHelpBot';
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
    const [isReferralExpanded, setIsReferralExpanded] = useState(false);

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

            // Fetch active referral with enriched routing & facility details
            const defaultReferralPayload = {
                id: 'ref-demo',
                slot_token: '#TK-042',
                facilities: { 
                    name: 'District Civil Hospital Nashik',
                    address: 'Old Agra Rd, Shalimar Chowk, Nashik, Maharashtra 422001',
                    phone: '+91 253 257 2038',
                    lat: 19.9975,
                    lng: 73.7898,
                    district: 'Nashik',
                    tier: 'DISTRICT_HOSPITAL'
                },
                specialty_required: 'Cardiology OPD Consult',
                status: 'APPOINTMENT_BOOKED',
                doctor_name: 'Dr. Anand Deshmukh (Senior Cardiologist)',
                room_no: 'OPD Room #104 (1st Floor)',
                appointment_time: 'Today • 02:30 PM - 03:00 PM',
                distance_km: '4.2 km',
                estimated_time: '~12 mins',
                route_summary: 'via Shalimar Rd & NH-848',
                traffic_status: 'Normal Flow',
                distance_source: 'OSRM Highway Routing'
            };

            try {
                const resRef = await axios.get('/api/referrals', authHeader);
                if (Array.isArray(resRef.data) && resRef.data.length > 0) {
                    setActiveReferral({
                        ...defaultReferralPayload,
                        ...resRef.data[0],
                        facilities: {
                            ...defaultReferralPayload.facilities,
                            ...(resRef.data[0].facilities || {})
                        }
                    });
                } else {
                    setActiveReferral(defaultReferralPayload);
                }
            } catch (e) {
                setActiveReferral(defaultReferralPayload);
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

    const callEmergency108 = (e) => {
        if (e) {
            e.stopPropagation();
        }
        try {
            window.location.href = 'tel:108';
        } catch (error) {
            console.error('[SOS] Unable to open emergency dialer:', error);
        }
    };

    const coreFeatures = [
        {
            title: 'Referral Tracker',
            tag: 'Closed-Loop',
            desc: 'Milestone tracking & verified care closure',
            icon: <GitBranch size={22} color="#0d9488" />,
            bgColor: '#ccfbf1',
            badgeColor: '#0f766e',
            link: '/referrals'
        },
        {
            title: 'HealthCentres Nearby',
            tag: 'Live Beds',
            desc: 'Multi-tier directory & load meters',
            icon: <Building2 size={22} color="#2563eb" />,
            bgColor: '#dbeafe',
            badgeColor: '#1d4ed8',
            link: '/facilities'
        },
        {
            title: 'Patient Risk Score',
            tag: 'Triage AI',
            desc: 'Vitals scoring & emergency risk alerts',
            icon: <HeartPulse size={22} color="#e11d48" />,
            bgColor: '#ffe4e6',
            badgeColor: '#be123c',
            link: '/triage'
        },
        {
            title: 'Lab Report OCR',
            tag: 'MedGemma',
            desc: 'Automated blood test & scan summaries',
            icon: <FileText size={22} color="#7c3aed" />,
            bgColor: '#ede9fe',
            badgeColor: '#6d28d9',
            link: '/records'
        },
        {
            title: 'Allergy & Drug interaction',
            tag: 'Guardian AI',
            desc: 'Allergy & drug interaction checks',
            icon: <ShieldCheck size={22} color="#059669" />,
            bgColor: '#d1fae5',
            badgeColor: '#047857',
            link: '/services'
        },
        {
            title: 'Medicine Explainer',
            tag: 'Visual Guide',
            desc: 'Visual dosage storyboards & reminders',
            icon: <BookOpen size={22} color="#d97706" />,
            bgColor: '#fef3c7',
            badgeColor: '#b45309',
            link: '/learn-medicines'
        },
        {
            title: 'Family',
            tag: 'Family Proxy',
            desc: 'Dependent monitoring & SOS panic',
            icon: <Users size={22} color="#db2777" />,
            bgColor: '#fce7f3',
            badgeColor: '#be185d',
            link: '/caregiver'
        },
        {
            title: 'Medical History',
            tag: 'SHA-256',
            desc: 'Tamper-evident logs & health KPIs',
            icon: <Lock size={22} color="#475569" />,
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
                    <motion.a 
                        href="tel:108"
                        onClick={callEmergency108}
                        aria-label="Call emergency services 108"
                        role="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            background: '#dc2626',
                            color: '#fff',
                            textDecoration: 'none',
                            border: 'none',
                            padding: '7px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                            userSelect: 'none',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <Phone size={14} /> 108 SOS
                    </motion.a>

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

            {/* Feedback Modal */}
            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Active Referral Live Journey Widget (Collapsible Compact Tile) */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(135deg, #042f2e 0%, #0f766e 60%, #115e59 100%)',
                    color: 'white',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    marginBottom: '22px',
                    boxShadow: '0 10px 24px rgba(15, 118, 110, 0.28)',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(45, 212, 191, 0.25)',
                    transition: 'all 0.3s ease'
                }}
            >
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '130px',
                    height: '130px',
                    background: 'radial-gradient(circle, rgba(45,212,191,0.18) 0%, rgba(45,212,191,0) 70%)',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Compact Clickable Header Section */}
                    <div 
                        onClick={() => setIsReferralExpanded(!isReferralExpanded)}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                        {/* Top Badges Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ 
                                    background: '#059669', 
                                    color: '#ecfdf5', 
                                    fontSize: '9.5px', 
                                    fontWeight: 800, 
                                    padding: '3px 8px', 
                                    borderRadius: '16px', 
                                    textTransform: 'uppercase',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.35)'
                                }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#a7f3d0', display: 'inline-block' }}></span>
                                    Referral In Progress
                                </span>
                                <span style={{ background: 'rgba(255,255,255,0.16)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '16px' }}>
                                    Token: {activeReferral?.slot_token || '#TK-042'}
                                </span>
                            </div>

                            {/* Distance & ETA Chip in Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                    background: 'rgba(20, 184, 166, 0.28)',
                                    color: '#5eead4',
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    padding: '3px 9px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(94, 234, 212, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Navigation size={11} /> {activeReferral?.distance_km || '4.2 km'} • {activeReferral?.estimated_time || '~12 mins'}
                                </span>
                            </div>
                        </div>

                        {/* Title & Quick Toggle Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                                    {activeReferral?.facilities?.name || 'District Civil Hospital Nashik'}
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#99f6e4', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span>{activeReferral?.specialty_required || 'Cardiology Consult'}</span>
                                    <span>•</span>
                                    <span style={{ color: '#fed7aa', fontWeight: 700 }}>{activeReferral?.status || 'APPOINTMENT_BOOKED'}</span>
                                </p>
                            </div>

                            {/* Expand / Collapse Pill */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsReferralExpanded(!isReferralExpanded);
                                }}
                                style={{
                                    background: isReferralExpanded ? 'rgba(255,255,255,0.2)' : '#14b8a6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexShrink: 0,
                                    boxShadow: isReferralExpanded ? 'none' : '0 3px 10px rgba(20, 184, 166, 0.4)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span>{isReferralExpanded ? 'Less' : 'Details'}</span>
                                {isReferralExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                        </div>

                        {/* Mini Progress Indicator (Collapsed View) */}
                        {!isReferralExpanded && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#ccfbf1', marginBottom: '4px', fontWeight: 600 }}>
                                    <span>Stage: <strong style={{ color: '#fef08a' }}>3. Booked (Active)</strong></span>
                                    <span>Click to view route & details ▾</span>
                                </div>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #2dd4bf, #facc15)', borderRadius: '2px' }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Smooth Expandable Body on Click */}
                    <AnimatePresence>
                        {isReferralExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ 
                                    paddingTop: '14px', 
                                    marginTop: '12px', 
                                    borderTop: '1px solid rgba(255,255,255,0.15)' 
                                }}>
                                    {/* Prominent Direction (Distance) & Live Routing Section */}
                                    <div style={{
                                        background: 'rgba(4, 47, 46, 0.65)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(45, 212, 191, 0.35)',
                                        borderRadius: '14px',
                                        padding: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                <div style={{
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    flexShrink: 0,
                                                    boxShadow: '0 3px 8px rgba(20, 184, 166, 0.4)'
                                                }}>
                                                    <Navigation size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff' }}>
                                                            Direction & Distance: {activeReferral?.distance_km || '4.2 km'}
                                                        </span>
                                                        <span style={{
                                                            background: 'rgba(20, 184, 166, 0.25)',
                                                            color: '#5eead4',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid rgba(94, 234, 212, 0.3)'
                                                        }}>
                                                            ⏱️ {activeReferral?.estimated_time || '~12 mins'}
                                                        </span>
                                                        <span style={{
                                                            background: 'rgba(16, 185, 129, 0.25)',
                                                            color: '#6ee7b7',
                                                            fontSize: '9.5px',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            🟢 {activeReferral?.traffic_status || 'Normal Flow'}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#ccfbf1' }}>
                                                        🛣️ <strong>Route:</strong> {activeReferral?.route_summary || 'via Shalimar Rd & NH-848'} ({activeReferral?.distance_source || 'OSRM Road Routing'})
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Direct Get Directions Trigger */}
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${activeReferral?.facilities?.lat || 19.9975},${activeReferral?.facilities?.lng || 73.7898}&destination_place_id=${encodeURIComponent(activeReferral?.facilities?.name || 'District Civil Hospital Nashik')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    background: 'linear-gradient(135deg, #2dd4bf, #059669)',
                                                    color: '#022c22',
                                                    textDecoration: 'none',
                                                    padding: '7px 12px',
                                                    borderRadius: '10px',
                                                    fontWeight: 800,
                                                    fontSize: '11px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    boxShadow: '0 3px 10px rgba(45, 212, 191, 0.4)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <Navigation2 size={12} fill="#022c22" /> Get Directions
                                            </a>
                                        </div>
                                    </div>

                                    {/* Detailed Facility & Appointment Info Matrix */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '8px',
                                        marginBottom: '12px'
                                    }}>
                                        {/* Address & Landmark */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            borderRadius: '10px',
                                            padding: '8px 10px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#99f6e4', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                                                <MapPin size={12} color="#2dd4bf" /> Facility Location
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#f0fdfa', lineHeight: '1.3' }}>
                                                {activeReferral?.facilities?.address || 'Old Agra Rd, Shalimar Chowk, Nashik - 422001'}
                                            </div>
                                        </div>

                                        {/* Doctor & Room */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            borderRadius: '10px',
                                            padding: '8px 10px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#99f6e4', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                                                <UserCheck size={12} color="#2dd4bf" /> Assigned Consultant
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#f0fdfa', fontWeight: 600 }}>
                                                {activeReferral?.doctor_name || 'Dr. Anand Deshmukh (Cardiology)'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#fed7aa', marginTop: '2px' }}>
                                                📍 {activeReferral?.room_no || 'OPD Room #104 (1st Floor)'}
                                            </div>
                                        </div>

                                        {/* Schedule & Reporting Time */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            borderRadius: '10px',
                                            padding: '8px 10px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#99f6e4', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                                                <Calendar size={12} color="#2dd4bf" /> Appointment Schedule
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#fef08a', fontWeight: 700 }}>
                                                {activeReferral?.appointment_time || 'Today • 02:30 PM - 03:00 PM'}
                                            </div>
                                            <div style={{ fontSize: '9.5px', color: '#99f6e4', marginTop: '2px' }}>
                                                Fast-Track OPD Entry Token Active
                                            </div>
                                        </div>

                                        {/* Facility Contact & Helpdesk */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            borderRadius: '10px',
                                            padding: '8px 10px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#99f6e4', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                                                    <Phone size={12} color="#2dd4bf" /> Facility Helpdesk
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#f0fdfa' }}>
                                                    {activeReferral?.facilities?.phone || '+91 253 257 2038'}
                                                </div>
                                            </div>
                                            <a
                                                href={`tel:${activeReferral?.facilities?.phone || '+912532572038'}`}
                                                style={{
                                                    fontSize: '10px',
                                                    color: '#6ee7b7',
                                                    textDecoration: 'none',
                                                    fontWeight: 700,
                                                    marginTop: '3px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}
                                            >
                                                Call Helpdesk <ArrowRight size={9} />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Action Button & Collapse Trigger */}
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        <button
                                            onClick={() => navigate('/referrals')}
                                            style={{
                                                flex: 1,
                                                minWidth: '150px',
                                                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '9px 16px',
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                fontSize: '11.5px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                boxShadow: '0 3px 10px rgba(20, 184, 166, 0.4)'
                                            }}
                                        >
                                            Track Journey Timeline <ArrowRight size={13} />
                                        </button>
                                    </div>

                                    {/* 5-Stage Live Progress Track */}
                                    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 700, color: '#ccfbf1', marginBottom: '6px', flexWrap: 'wrap', gap: '3px' }}>
                                            <span style={{ color: '#5eead4' }}>✓ 1. Triaged</span>
                                            <span style={{ color: '#5eead4' }}>✓ 2. Facility Assigned</span>
                                            <span style={{ 
                                                color: '#fef08a', 
                                                fontWeight: 900, 
                                                background: 'rgba(250, 204, 21, 0.2)', 
                                                padding: '1px 5px', 
                                                borderRadius: '4px',
                                                border: '1px solid rgba(250, 204, 21, 0.4)'
                                            }}>
                                                ● 3. Booked (Active)
                                            </span>
                                            <span style={{ opacity: 0.75 }}>4. Transit</span>
                                            <span style={{ opacity: 0.75 }}>5. Care Done</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.18)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: '60%', 
                                                height: '100%', 
                                                background: 'linear-gradient(90deg, #2dd4bf 0%, #10b981 50%, #facc15 100%)', 
                                                borderRadius: '3px',
                                                boxShadow: '0 0 8px rgba(250, 204, 21, 0.6)'
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Swasthya Platform Capabilities Grid Layout */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '17px', fontWeight: 800 }}>
                            Swasthya Platform Capabilities
                        </h2>
                    </div>
                    <span style={{
                        fontSize: '11px',
                        color: 'var(--primary-color)',
                        background: 'var(--primary-light)',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        border: '1px solid #ccfbf1'
                    }}>
                        All 8 Core Modules
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                }}>
                    {coreFeatures.map((feat, index) => (
                        <motion.div
                            key={index}
                            className="card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ y: -3, boxShadow: '0 8px 18px -4px rgba(0, 0, 0, 0.08)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(feat.link)}
                            style={{
                                padding: '14px 12px',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s ease',
                                background: 'var(--card-bg)',
                                borderRadius: '16px',
                                marginBottom: 0,
                                minHeight: '160px',
                                boxSizing: 'border-box'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '10px',
                                        background: feat.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {feat.icon}
                                    </div>
                                    <span style={{
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        background: feat.bgColor,
                                        color: feat.badgeColor,
                                        whiteSpace: 'nowrap',
                                        marginLeft: '4px'
                                    }}>
                                        {feat.tag}
                                    </span>
                                </div>

                                <h3 style={{
                                    margin: '8px 0 4px 0',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.25'
                                }}>
                                    {feat.title}
                                </h3>
                                <p style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    lineHeight: '1.35',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {feat.desc}
                                </p>
                            </div>

                            <div style={{
                                marginTop: '10px',
                                paddingTop: '8px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--primary-color)'
                            }}>
                                <span>Open Module</span>
                                <ChevronRight size={13} />
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

            {/* Offline AI Medical First-Aid & Emergency Assistant Bot */}
            <OfflineHealthHelpBot />

        </div>
    );
};

export default Home;
