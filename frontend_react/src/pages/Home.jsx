import React, { useState, useEffect, useContext } from 'react';
import { 
    Activity, FileText, Mic, ChevronRight, UserPlus, Bell, Users, 
    ShieldCheck, GitBranch, Building2, Stethoscope, Sparkles, BookOpen, 
    HeartPulse, QrCode, Lock, TrendingUp, ArrowRight, CheckCircle2, 
    AlertTriangle, Clock, Compass, PhoneCall, Layers, FileCheck, 
    MessageSquareHeart, Phone, Pill, PlusCircle, ShieldAlert, Heart,
    MapPin, Navigation, Navigation2, ExternalLink, Route, Car, Calendar, UserCheck,
    ChevronDown, ChevronUp, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FamilyMemberSwitcher from '../components/FamilyMemberSwitcher';
import FeedbackModal from '../components/FeedbackModal';
import OfflineHealthHelpBot from '../components/OfflineHealthHelpBot';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { supabase } from '../config/supabase';

const Home = () => {
    const { user, effectiveUser, activeMember } = useContext(AuthContext);
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState([]);
    const [activeReferral, setActiveReferral] = useState(null);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isReferralExpanded, setIsReferralExpanded] = useState(false);

    useEffect(() => {
        fetchInitialData();
        
        // Refresh on window focus so navigating back from ReferralTracker updates immediately
        const handleFocus = () => fetchInitialData();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user, effectiveUser, activeMember]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const targetUserId = effectiveUser?.id || user?.id || 'default_patient';

            // Fetch appointments
            try {
                const resApts = await axios.get('/api/connect/patient/appointments', authHeader);
                setAppointments(resApts.data || []);
            } catch (e) {}

            // Resolve the REAL Most Recent Booked Referral / Appointment
            let candidates = [];

            // 1. Fetch from patient-specific referral endpoint
            try {
                const resPatient = await axios.get(`/api/referrals/patient/${targetUserId}`, authHeader);
                const list = Array.isArray(resPatient.data) ? resPatient.data : (Array.isArray(resPatient.data?.data) ? resPatient.data.data : []);
                if (list.length > 0) {
                    candidates.push(...list);
                }
            } catch (apiErr) {}

            // 2. Fetch from general referrals endpoint
            try {
                const resRef = await axios.get(`/api/referrals?patient_id=${targetUserId}`, authHeader);
                const list = Array.isArray(resRef.data) ? resRef.data : (Array.isArray(resRef.data?.data) ? resRef.data.data : []);
                if (list.length > 0) {
                    candidates.push(...list);
                }
            } catch (e) {}

            // 3. Direct Supabase query for most recent referrals for this user
            try {
                const { data: supaList } = await supabase
                    .from('referrals')
                    .select(`
                        *,
                        facilities:receiving_facility_id(*),
                        doctors:assigned_doctor_id(*)
                    `)
                    .eq('patient_id', targetUserId)
                    .order('created_at', { ascending: false });

                if (supaList && Array.isArray(supaList) && supaList.length > 0) {
                    candidates.push(...supaList);
                }
            } catch (e) {}

            // 4. Check user profile medical_history (confirmed_appointments & past_records)
            try {
                const confApts = user?.medical_history?.confirmed_appointments || [];
                const pastRecs = user?.medical_history?.past_records || [];
                [...confApts, ...pastRecs].forEach(rec => {
                    if (rec && (rec.referral_id || rec.queue_token || rec.slot_time || rec.record_date || rec.facility_name)) {
                        candidates.push({
                            id: rec.referral_id || rec.id,
                            patient_id: targetUserId,
                            facility_name: rec.facility_name || rec.title?.replace('Referral Consultation at ', '') || 'Healthcare Centre',
                            specialty_required: rec.category || rec.specialty || 'Doctor Consultation',
                            status: rec.status || 'APPOINTMENT_BOOKED',
                            doctor_name: rec.doctor_name || 'Assigned Specialist',
                            appointment_slot_time: rec.slot_time ? (rec.record_date ? `${rec.record_date} • ${rec.slot_time}` : rec.slot_time) : (rec.record_date || 'Upcoming OPD Visit'),
                            slot_token: rec.queue_token || rec.token || 'OPD-101',
                            created_at: rec.created_at || rec.record_date || new Date().toISOString(),
                            facilities: {
                                name: rec.facility_name || 'Healthcare Centre',
                                address: rec.address || 'Civil Hospital Campus',
                                phone: rec.phone || '+91 1800-11-4477',
                                lat: 18.5204,
                                lng: 73.8567
                            }
                        });
                    }
                });
            } catch (e) {}

            // 5. Check localStorage cached recent referral / appointment
            try {
                const localRecentRef = localStorage.getItem('swasthya_recent_referral');
                if (localRecentRef) {
                    const parsed = JSON.parse(localRecentRef);
                    if (parsed && (parsed.id || parsed.facility_name || parsed.facilities)) {
                        candidates.push(parsed);
                    }
                }
                const localRecentApt = localStorage.getItem('swasthya_recent_booked_appointment');
                if (localRecentApt) {
                    const parsed = JSON.parse(localRecentApt);
                    if (parsed && (parsed.facility_name || parsed.referral_id)) {
                        candidates.push({
                            id: parsed.referral_id || parsed.id,
                            patient_id: targetUserId,
                            facility_name: parsed.facility_name,
                            specialty_required: parsed.category || 'Specialist Consultation',
                            status: parsed.status || 'APPOINTMENT_BOOKED',
                            doctor_name: parsed.doctor_name || 'Assigned Specialist',
                            appointment_slot_time: parsed.slot_time ? `${parsed.record_date || ''} • ${parsed.slot_time}` : (parsed.record_date || 'Upcoming OPD Visit'),
                            slot_token: parsed.queue_token || parsed.token || 'OPD-101',
                            created_at: parsed.created_at || new Date().toISOString(),
                            facilities: {
                                name: parsed.facility_name,
                                address: parsed.address || 'Civil Hospital Campus',
                                phone: parsed.phone || '+91 1800-11-4477',
                                lat: 18.5204,
                                lng: 73.8567
                            }
                        });
                    }
                }
            } catch (e) {}

            // De-duplicate candidates by id or unique signature
            const uniqueMap = new Map();
            candidates.forEach(c => {
                const key = c.id || (c.facility_name + '_' + (c.created_at || c.slot_token));
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, c);
                }
            });

            const uniqueCandidates = Array.from(uniqueMap.values());

            // Sort by created_at or updated_at descending (most recent first)
            uniqueCandidates.sort((a, b) => {
                const timeA = new Date(a.created_at || a.updated_at || a.record_date || 0).getTime();
                const timeB = new Date(b.created_at || b.updated_at || b.record_date || 0).getTime();
                return timeB - timeA;
            });

            if (uniqueCandidates.length > 0) {
                const top = uniqueCandidates[0];
                const fac = top.facilities || {};
                const facName = fac.name || top.facility_name || top.hospital_name || 'Healthcare Facility';
                const facAddress = fac.address || top.facility_address || top.address || 'Civil Hospital Road';
                const facPhone = fac.phone || top.facility_phone || top.phone || '+91 1800-11-4477';
                const facLat = Number(fac.lat || fac.latitude || top.latitude) || 18.5204;
                const facLng = Number(fac.lng || fac.longitude || top.longitude) || 73.8567;
                const docName = top.doctors?.name || top.doctor_name || top.assigned_doctor_name || 'Assigned OPD Specialist';
                const roomNo = top.room_no || 'OPD Room #104';
                const aptTime = top.appointment_slot_time || top.appointment_time || (top.record_date ? `${top.record_date} • ${top.slot_time || '10:30 AM'}` : 'Scheduled OPD Visit');
                const token = top.slot_token || top.queue_token || top.token || 'OPD-101';
                const specialty = top.specialty_required || top.category || top.primary_complaint || 'Specialist OPD Consultation';
                const distKm = fac.distanceFormatted || top.distance_km || '2.8 km';
                const estTime = fac.durationFormatted || top.estimated_time || '~12 mins';
                const routeSummary = top.route_summary || `via Main Link Rd & NH Corridor`;
                const trafficStatus = top.traffic_status || 'Normal Flow';

                setActiveReferral({
                    ...top,
                    id: top.id || 'ref-active',
                    slot_token: token,
                    specialty_required: specialty,
                    status: top.status || 'APPOINTMENT_BOOKED',
                    doctor_name: docName,
                    room_no: roomNo,
                    appointment_time: aptTime,
                    distance_km: distKm,
                    estimated_time: estTime,
                    route_summary: routeSummary,
                    traffic_status: trafficStatus,
                    distance_source: top.distance_source || 'OSRM Road Routing',
                    facilities: {
                        name: facName,
                        address: facAddress,
                        phone: facPhone,
                        lat: facLat,
                        lng: facLng,
                        district: fac.district || top.district || 'City',
                        tier: fac.tier || top.tier || 'DISTRICT_HOSPITAL'
                    }
                });
            } else {
                setActiveReferral(null);
            }

            // Fetch facilities
            try {
                const resFac = await axios.get('/api/facilities');
                if (Array.isArray(resFac.data) && resFac.data.length > 0) {
                    setFacilities(resFac.data.slice(0, 3));
                } else {
                    setFacilities([
                        { id: 'f-1', name: 'Primary Health Centre (PHC) Dankaur', district: 'Gautam Buddha Nagar', tier: 'PRIMARY_HEALTH_CENTRE', emergency_capable: true, current_load: 45 },
                        { id: 'f-2', name: 'Government Institute of Medical Sciences (GIMS)', district: 'Greater Noida', tier: 'DISTRICT_HOSPITAL', emergency_capable: true, current_load: 72 },
                        { id: 'f-3', name: 'Community Health Centre (CHC) Dankaur', district: 'Gautam Buddha Nagar', tier: 'COMMUNITY_HEALTH_CENTRE', emergency_capable: true, current_load: 38 }
                    ]);
                }
            } catch (e) {
                setFacilities([
                    { id: 'f-1', name: 'Primary Health Centre (PHC) Dankaur', district: 'Gautam Buddha Nagar', tier: 'PRIMARY_HEALTH_CENTRE', emergency_capable: true, current_load: 45 },
                    { id: 'f-2', name: 'Government Institute of Medical Sciences (GIMS)', district: 'Greater Noida', tier: 'DISTRICT_HOSPITAL', emergency_capable: true, current_load: 72 },
                    { id: 'f-3', name: 'Community Health Centre (CHC) Dankaur', district: 'Gautam Buddha Nagar', tier: 'COMMUNITY_HEALTH_CENTRE', emergency_capable: true, current_load: 38 }
                ]);
            }

            // Load connected family members from localStorage and Supabase
            try {
                const localConnected = JSON.parse(localStorage.getItem('swasthya_connected_family_members') || '[]');
                let allMembers = [...localConnected];

                const userEmail = (user?.email || '').toLowerCase();
                const userPhone = (user?.phone || '').toLowerCase();
                const userId = user?.id;

                const { data: supaLinks } = await supabase.from('family_links').select('*');
                if (supaLinks && Array.isArray(supaLinks)) {
                    supaLinks.forEach(link => {
                        if (link.status === 'active' || link.is_verified) {
                            allMembers.push({
                                id: link.id,
                                patient: {
                                    id: link.family_member_id || link.id,
                                    full_name: link.member_name || 'Family Member',
                                    email: link.member_phone || 'family@swasthya.org'
                                },
                                relationship_type: link.relation || 'Family',
                                permission_scope: link.access_level || 'REFERRAL_STATUS'
                            });
                        }
                    });
                }

                // Deduplicate
                const memberMap = new Map();
                allMembers.forEach(m => {
                    const key = (m.patient?.email || m.caregiver_email || m.id || '').toLowerCase();
                    if (key) memberMap.set(key, m);
                });
                setFamilyMembers(Array.from(memberMap.values()));
            } catch (fmErr) {
                console.warn("Family members home load notice:", fmErr.message);
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
            title: t('quickReferral', 'Track Referrals'),
            tag: t('closedLoopBadge', 'Closed-Loop'),
            desc: t('quickReferralDesc', 'Track hospital transfers in real time'),
            icon: <GitBranch size={22} color="#0d9488" />,
            bgColor: '#ccfbf1',
            badgeColor: '#0f766e',
            link: '/referrals'
        },
        {
            title: t('quickFacilities', 'Find Nearest Facility'),
            tag: t('liveBedsBadge', 'Live Beds'),
            desc: t('quickFacilitiesDesc', 'Locate PHCs, CHCs, & Hospitals with ICU'),
            icon: <Building2 size={22} color="#2563eb" />,
            bgColor: '#dbeafe',
            badgeColor: '#1d4ed8',
            link: '/facilities'
        },
        {
            title: t('quickTriage', 'Patient Risk Score'),
            tag: t('triageAiBadge', 'Triage AI'),
            desc: t('quickTriageDesc', 'Check symptoms with safe clinical guidance'),
            icon: <HeartPulse size={22} color="#e11d48" />,
            bgColor: '#ffe4e6',
            badgeColor: '#be123c',
            link: '/triage'
        },
        {
            title: t('quickRecords', 'Medicine Explainer'),
            tag: t('medgemmaAiBadge', 'MedGemma AI'),
            desc: t('quickRecordsDesc', 'EHR records, prescriptions & lab reports'),
            icon: <FileText size={22} color="#7c3aed" />,
            bgColor: '#ede9fe',
            badgeColor: '#6d28d9',
            link: '/records'
        },
        {
            title: t('quickFamily', 'Family Person'),
            tag: t('familyProxyBadge', 'Family Proxy'),
            desc: t('quickFamilyDesc', 'Manage health records of elders & children'),
            icon: <Users size={22} color="#db2777" />,
            bgColor: '#fce7f3',
            badgeColor: '#be185d',
            link: '/family'
        },
        {
            title: t('navMedHistory', 'Medical History'),
            tag: t('ehrRecordsBadge', 'EHR Records'),
            desc: t('medHistoryDesc', 'Past records, confirmed appointments & health archives'),
            icon: <History size={22} color="#0284c7" />,
            bgColor: '#e0f2fe',
            badgeColor: '#0369a1',
            link: '/medical-history'
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
            {/* Family Profile Switcher Banner & Selector */}
            <FamilyMemberSwitcher showBanner={true} />
            
            {/* Top Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                marginTop: '10px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {activeMember ? `FAMILY VIEW • ${(activeMember.relation || 'PROXY').toUpperCase()}` : t('ayushmanHeader', 'AYUSHMAN BHARAT SWASTHYA')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '24px', color: 'var(--text-primary)', margin: '2px 0 0', fontWeight: 800 }}>
                        {effectiveUser?.name || user?.name || t('citizenTitle', 'Swasthya Citizen')}
                    </h1>
                </div>


                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* SOS Emergency Call Button */}
                    <motion.a 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                        href="tel:108"
                        onClick={callEmergency108}
                        aria-label="Call emergency services 108"
                        role="button"
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
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e' }}>{t('feedbackPrompt', 'Feedback')}</span>
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

            {/* Active Referral Live Journey Widget OR Clean Empty State Banner */}
            {activeReferral ? (
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
                                        {t('referralInProgress', 'Referral In Progress')}
                                    </span>
                                    <span style={{ background: 'rgba(255,255,255,0.16)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '16px' }}>
                                        {t('tokenLabel', 'Token')}: {activeReferral.slot_token || '#OPD-101'}
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
                                        <Navigation size={11} /> {activeReferral.distance_km || 'Nearby'} • {activeReferral.estimated_time || '~12 mins'}
                                    </span>
                                </div>
                            </div>

                            {/* Title & Quick Toggle Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                                        {activeReferral.facilities?.name || activeReferral.facility_name || 'Designated Healthcare Centre'}
                                    </h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#99f6e4', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span>{activeReferral.specialty_required || 'Specialist Consultation'}</span>
                                        <span>•</span>
                                        <span style={{ color: '#fed7aa', fontWeight: 700 }}>
                                            {activeReferral.status === 'APPOINTMENT_BOOKED' ? t('stageBooked', 'APPOINTMENT_BOOKED') : activeReferral.status}
                                        </span>
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
                                    <span>{isReferralExpanded ? t('lessBtn', 'Less') : t('detailsBtn', 'Details')}</span>
                                    {isReferralExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                            </div>

                            {/* Mini Progress Indicator (Collapsed View) */}
                            {!isReferralExpanded && (
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#ccfbf1', marginBottom: '4px', fontWeight: 600 }}>
                                        <span>
                                            {t('stageLabel', 'Stage')}: <strong style={{ color: '#fef08a' }}>
                                                {activeReferral.status === 'TRIAGED' ? '1. Triaged' :
                                                 activeReferral.status === 'FACILITY_SELECTED' ? '2. Facility Linked' :
                                                 activeReferral.status === 'APPOINTMENT_BOOKED' ? '3. Booked (Active)' :
                                                 activeReferral.status === 'PATIENT_IN_TRANSIT' ? '4. In Transit' :
                                                 activeReferral.status === 'PATIENT_REACHED' ? '4. Arrival Confirmed' :
                                                 activeReferral.status === 'CONSULTATION_IN_PROGRESS' ? '5. Consultation Live' :
                                                 activeReferral.status === 'TREATMENT_COMPLETED' || activeReferral.status === 'COMPLETED' ? '5. Care Completed' : '3. Booked (Active)'}
                                            </strong>
                                        </span>
                                        <span>{t('clickForRouteDetails', 'Click to view route & details')} ▾</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: activeReferral.status === 'TRIAGED' ? '20%' :
                                                   activeReferral.status === 'FACILITY_SELECTED' ? '40%' :
                                                   activeReferral.status === 'APPOINTMENT_BOOKED' ? '60%' :
                                                   activeReferral.status === 'PATIENT_IN_TRANSIT' ? '75%' :
                                                   activeReferral.status === 'PATIENT_REACHED' ? '85%' :
                                                   activeReferral.status === 'CONSULTATION_IN_PROGRESS' ? '90%' : '100%', 
                                            height: '100%', 
                                            background: 'linear-gradient(90deg, #2dd4bf, #facc15)', 
                                            borderRadius: '2px' 
                                        }}></div>
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
                                                                {t('directionDistance', 'Direction & Distance')}: {activeReferral.distance_km || 'Nearby'}
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
                                                                ⏱️ {activeReferral.estimated_time || '~12 mins'}
                                                            </span>
                                                            <span style={{
                                                                background: 'rgba(16, 185, 129, 0.25)',
                                                                color: '#6ee7b7',
                                                                fontSize: '9.5px',
                                                                fontWeight: 700,
                                                                padding: '2px 6px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                🟢 {activeReferral.traffic_status || 'Normal Flow'}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#ccfbf1' }}>
                                                            🛣️ <strong>{t('routeLabel', 'Route')}:</strong> {activeReferral.route_summary || 'via Direct Corridor'} ({activeReferral.distance_source || 'OSRM Road Routing'})
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Direct Get Directions Trigger */}
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeReferral.facilities?.lat || 28.3639},${activeReferral.facilities?.lng || 77.5404}&destination_place_id=${encodeURIComponent(activeReferral.facilities?.name || activeReferral.facility_name || 'Hospital')}`}
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
                                                    <Navigation2 size={12} fill="#022c22" /> {t('getDirections', 'Get Directions')}
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
                                                    <MapPin size={12} color="#2dd4bf" /> {t('facilityLocation', 'Facility Location')}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#f0fdfa', lineHeight: '1.3' }}>
                                                    {activeReferral.facilities?.address || activeReferral.facility_address || 'Hospital Campus, Main Road'}
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
                                                    <UserCheck size={12} color="#2dd4bf" /> {t('assignedConsultant', 'Assigned Consultant')}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#f0fdfa', fontWeight: 600 }}>
                                                    {activeReferral.doctor_name || 'Assigned OPD Specialist'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#fed7aa', marginTop: '2px' }}>
                                                    📍 {activeReferral.room_no || 'OPD Room #104'}
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
                                                    <Calendar size={12} color="#2dd4bf" /> {t('appointmentSchedule', 'Appointment Schedule')}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#fef08a', fontWeight: 700 }}>
                                                    {activeReferral.appointment_time || 'Scheduled OPD Visit'}
                                                </div>
                                                <div style={{ fontSize: '9.5px', color: '#99f6e4', marginTop: '2px' }}>
                                                    {t('fastTrackTokenActive', 'Fast-Track OPD Entry Token Active')}
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
                                                        <Phone size={12} color="#2dd4bf" /> {t('facilityHelpdesk', 'Facility Helpdesk')}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#f0fdfa' }}>
                                                        {activeReferral.facilities?.phone || activeReferral.facility_phone || '+91 1800-11-4477'}
                                                    </div>
                                                </div>
                                                <a
                                                    href={`tel:${activeReferral.facilities?.phone || activeReferral.facility_phone || '+911800114477'}`}
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
                                                    {t('callHelpdesk', 'Call Helpdesk')} <ArrowRight size={9} />
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
                                                {t('trackJourneyTimeline', 'Track Journey Timeline')} <ArrowRight size={13} />
                                            </button>
                                        </div>

                                        {/* 5-Stage Live Progress Track */}
                                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 700, color: '#ccfbf1', marginBottom: '6px', flexWrap: 'wrap', gap: '3px' }}>
                                                <span style={{ color: ['TRIAGED', 'FACILITY_SELECTED', 'APPOINTMENT_BOOKED', 'PATIENT_IN_TRANSIT', 'PATIENT_REACHED', 'CONSULTATION_IN_PROGRESS', 'TREATMENT_COMPLETED', 'COMPLETED'].includes(activeReferral.status) ? '#5eead4' : '#99f6e4' }}>
                                                    ✓ 1. {t('stepTriaged', 'Triaged')}
                                                </span>
                                                <span style={{ color: ['FACILITY_SELECTED', 'APPOINTMENT_BOOKED', 'PATIENT_IN_TRANSIT', 'PATIENT_REACHED', 'CONSULTATION_IN_PROGRESS', 'TREATMENT_COMPLETED', 'COMPLETED'].includes(activeReferral.status) ? '#5eead4' : 'rgba(255,255,255,0.6)' }}>
                                                    ✓ 2. {t('stepFacilityLinked', 'Facility Assigned')}
                                                </span>
                                                <span style={{ 
                                                    color: '#fef08a', 
                                                    fontWeight: 900, 
                                                    background: 'rgba(250, 204, 21, 0.2)', 
                                                    padding: '1px 5px', 
                                                    borderRadius: '4px',
                                                    border: '1px solid rgba(250, 204, 21, 0.4)'
                                                }}>
                                                    ● {t('stageBooked', '3. Booked (Active)')}
                                                </span>
                                                <span style={{ color: ['PATIENT_IN_TRANSIT', 'PATIENT_REACHED', 'CONSULTATION_IN_PROGRESS', 'TREATMENT_COMPLETED', 'COMPLETED'].includes(activeReferral.status) ? '#5eead4' : 'rgba(255,255,255,0.5)' }}>
                                                    4. {t('stepInTransit', 'Transit')}
                                                </span>
                                                <span style={{ color: ['TREATMENT_COMPLETED', 'COMPLETED'].includes(activeReferral.status) ? '#5eead4' : 'rgba(255,255,255,0.5)' }}>
                                                    5. {t('stepCareCompleted', 'Care Done')}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.18)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    width: activeReferral.status === 'TRIAGED' ? '20%' :
                                                           activeReferral.status === 'FACILITY_SELECTED' ? '40%' :
                                                           activeReferral.status === 'APPOINTMENT_BOOKED' ? '60%' :
                                                           activeReferral.status === 'PATIENT_IN_TRANSIT' ? '75%' :
                                                           activeReferral.status === 'PATIENT_REACHED' ? '85%' :
                                                           activeReferral.status === 'CONSULTATION_IN_PROGRESS' ? '90%' : '100%', 
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
            ) : (
                /* Clean Quick Action / No Active Referral Banner */
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        marginBottom: '22px',
                        border: '1.5px dashed #14b8a6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#0d9488',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <GitBranch size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f766e' }}>
                                {t('referralTrackBannerTitle', 'Referral & OPD Appointment Tracker')}
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#134e4a' }}>
                                {t('referralTrackBannerSub', 'No active referral in progress. Find nearby hospitals or schedule an OPD slot.')}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/facilities')}
                            style={{
                                background: '#0d9488',
                                color: 'white',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
                            }}
                        >
                            <Building2 size={14} /> {t('findHospitalsBtn', 'Find Nearest Hospital')}
                        </button>
                        <button
                            onClick={() => navigate('/referrals')}
                            style={{
                                background: '#ffffff',
                                color: '#0d9488',
                                border: '1px solid #0d9488',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <Calendar size={14} /> {t('bookOpdSlotBtn', 'Book OPD Slot')}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Swasthya Platform Capabilities Grid Layout */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '17px', fontWeight: 800 }}>
                            {t('platformCapabilities', 'Swasthya Platform Capabilities')}
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
                        {t('all6Modules', 'All 6 Core Modules')}
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
                                <span>{t('openModule', 'Open Module')}</span>
                                <ChevronRight size={13} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>




            {/* Offline AI Medical First-Aid & Emergency Assistant Bot */}
            <OfflineHealthHelpBot />

        </div>
    );
};

export default Home;
