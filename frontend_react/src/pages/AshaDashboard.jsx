import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    WifiOff, UserPlus, Search, ShieldAlert, History, ArrowLeftRight,
    GitFork, Bell, RefreshCw, LogOut, ChevronRight, Asterisk,
    X, Check, AlertTriangle, Activity, MapPin, Phone, Building2,
    Calendar, FileText, CheckCircle2, ChevronDown, Plus, Sparkles,
    Shield, Clock, HeartPulse, User, Send, Navigation, Stethoscope
} from 'lucide-react';
import axios from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const AshaDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Active Modal States for the 6 Cards + Sync Banner + Emergency Card + Notifications
    const [activeModal, setActiveModal] = useState(null); // 'sync' | 'register' | 'find' | 'vitals' | 'history' | 'closedLoop' | 'facilityMatcher' | 'emergencyAlert' | 'notifications'
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccessToast, setSyncSuccessToast] = useState(false);

    // Initial mock/real state
    const [searchTerm, setSearchTerm] = useState('');
    const [patientList, setPatientList] = useState([
        { id: 'PT-01', name: 'Meena Sharma', age: 27, gender: 'Female', status: '34 Wk Antenatal', bp: '165/110', risk: 'HIGH RISK', husband: 'Rajesh', ward: 'Ward 4', phone: '+91 98234 11204', abha: '91-4829-1092-4411' },
        { id: 'PT-02', name: 'Sunita Patil', age: 24, gender: 'Female', status: '22 Wk Antenatal', bp: '118/78', risk: 'NORMAL', husband: 'Sachin', ward: 'Ward 2', phone: '+91 98450 33219', abha: '91-1029-4481-9921' },
        { id: 'PT-03', name: 'Ramesh Jadhav', age: 54, gender: 'Male', status: 'NCD Hypertensive', bp: '150/95', risk: 'MODERATE', husband: '-', ward: 'Ward 3', phone: '+91 97123 44556', abha: '91-3829-9912-7734' },
        { id: 'PT-04', name: 'Pooja Gaikwad', age: 29, gender: 'Female', status: 'Postnatal (Day 12)', bp: '120/80', risk: 'NORMAL', husband: 'Vikas', ward: 'Ward 1', phone: '+91 96234 88712', abha: '91-7712-4491-0023' }
    ]);

    // Registration Form State
    const [regForm, setRegForm] = useState({
        fullName: '',
        age: '',
        gender: 'Female',
        husbandName: '',
        phone: '',
        ward: 'Ward 4 (Shirwal)',
        isPregnant: true,
        gestationalWeeks: '',
        generateAbha: true,
        consentGiven: true
    });
    const [regSuccess, setRegSuccess] = useState(false);

    // Clinical Vitals Form State
    const [vitalsForm, setVitalsForm] = useState({
        patientName: 'Meena Sharma (Age 27)',
        systolic_bp: 165,
        diastolic_bp: 110,
        blood_sugar_fbs: 104,
        spo2: 97,
        pulse_rate: 88,
        temperature: 98.6,
        gestationalWeeks: 34,
        dangerSigns: ['Severe Headache', 'Blurred Vision', 'High BP (>140/90)']
    });
    const [vitalsSubmitted, setVitalsSubmitted] = useState(false);

    // Closed-Loop Referrals Active State
    const [activeReferrals, setActiveReferrals] = useState([
        {
            token: '#TK-8921',
            patient: 'Meena Sharma',
            urgency: 'HIGH PRIORITY',
            condition: 'Preeclampsia (BP 165/110)',
            facility: 'Nashik District Hospital',
            doctor: 'Dr. Anita Joshi (OB-GYN)',
            bedStatus: 'Reserved - Emergency Bed #04',
            transport: '108 Ambulance En Route (ETA 8 min)',
            stage: 'Transport Dispatched',
            timestamp: '10 mins ago'
        },
        {
            token: '#TK-7741',
            patient: 'Ramesh Jadhav',
            urgency: 'MODERATE',
            condition: 'Uncontrolled Hypertension',
            facility: 'Shirwal Community Health Centre (CHC)',
            doctor: 'Dr. Vivek Rane (General Medicine)',
            bedStatus: 'OPD Token Assigned #14',
            transport: 'Self-Transit',
            stage: 'Doctor Consulted',
            timestamp: '2 hours ago'
        }
    ]);

    // Facilities Matching List
    const facilities = [
        { name: 'Nashik District Hospital', type: 'Tertiary Care / FRU', dist: '18 km', eta: '25 min', icuBeds: 6, normalBeds: 24, specialists: ['OB-GYN', 'Pediatrics', 'Cardiology'], status: 'Available' },
        { name: 'Shirwal Community Health Centre (CHC)', type: 'Secondary Care', dist: '4.2 km', eta: '8 min', icuBeds: 0, normalBeds: 12, specialists: ['General Medicine', 'MBBS MO'], status: 'Available' },
        { name: 'Khandala Sub-District Hospital', type: 'Sub-District', dist: '12 km', eta: '18 min', icuBeds: 2, normalBeds: 15, specialists: ['OB-GYN', 'Surgery'], status: 'Available' }
    ];

    // Notification items
    const notifications = [
        { id: 1, title: 'Referral Token #TK-8921 Accepted', desc: 'Nashik District Hospital confirmed Bed #04 for Meena Sharma.', time: '5m ago', read: false },
        { id: 2, title: 'Vaccination Camp Scheduled', desc: 'Shirwal Sub-Centre session on Wednesday 10:00 AM.', time: '1h ago', read: false }
    ];

    // Trigger Sync action
    const handleTriggerSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            setSyncSuccessToast(true);
            setTimeout(() => setSyncSuccessToast(false), 3500);
        }, 1600);
    };

    // Handle Register Patient Submit
    const handleRegisterSubmit = (e) => {
        e.preventDefault();
        const newPt = {
            id: `PT-0${patientList.length + 1}`,
            name: regForm.fullName,
            age: parseInt(regForm.age) || 25,
            gender: regForm.gender,
            status: regForm.isPregnant ? `${regForm.gestationalWeeks || 12} Wk Antenatal` : 'General Household',
            bp: '120/80',
            risk: 'NORMAL',
            husband: regForm.husbandName || '-',
            ward: regForm.ward,
            phone: regForm.phone,
            abha: regForm.generateAbha ? `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}` : 'Pending'
        };
        setPatientList([newPt, ...patientList]);
        setRegSuccess(true);
        setTimeout(() => {
            setRegSuccess(false);
            setActiveModal(null);
            setRegForm({
                fullName: '',
                age: '',
                gender: 'Female',
                husbandName: '',
                phone: '',
                ward: 'Ward 4 (Shirwal)',
                isPregnant: true,
                gestationalWeeks: '',
                generateAbha: true,
                consentGiven: true
            });
        }, 1500);
    };

    const handleVitalsSubmit = (e) => {
        e.preventDefault();
        setVitalsSubmitted(true);
        setTimeout(() => {
            setVitalsSubmitted(false);
            setActiveModal(null);
        }, 1800);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#0f172a',
            paddingBottom: '85px'
        }}>
            {/* Top Container Max-Width for Mobile Fidelity */}
            <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#ffffff', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>

                {/* 1. TOP STATUS HEADER (BLUE) */}
                <div style={{
                    backgroundColor: '#0b57d0',
                    color: '#ffffff',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    boxShadow: '0 2px 8px rgba(11, 87, 208, 0.25)'
                }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        letterSpacing: '-0.02em',
                        color: '#ffffff'
                    }}>
                        ASHA / ANM / Caregiver Portal
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Notification Bell with Badge */}
                        <div 
                            onClick={() => setActiveModal('notifications')}
                            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Notifications"
                        >
                            <Bell size={22} color="#ffffff" />
                            <span style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '800',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1.5px solid #0b57d0'
                            }}>
                                2
                            </span>
                        </div>

                        {/* Sync Circular Arrow */}
                        <div 
                            onClick={handleTriggerSync}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Sync Data"
                        >
                            <RefreshCw 
                                size={22} 
                                color="#ffffff" 
                                style={{
                                    animation: isSyncing ? 'spin 0.8s linear infinite' : 'none'
                                }} 
                            />
                        </div>

                        {/* Logout / Exit Door Icon */}
                        <div 
                            onClick={() => {
                                if (window.confirm("Do you want to logout from ASHA / Caregiver Portal?")) {
                                    logout();
                                    navigate('/login');
                                }
                            }}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Exit / Logout"
                        >
                            <LogOut size={22} color="#ffffff" />
                        </div>
                    </div>
                </div>

                {/* SYNC SUCCESS TOAST */}
                <AnimatePresence>
                    {syncSuccessToast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                margin: '12px 16px 0 16px',
                                backgroundColor: '#ecfdf5',
                                border: '1px solid #6ee7b7',
                                color: '#065f46',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                            }}
                        >
                            <CheckCircle2 size={18} color="#059669" />
                            <span>Ayushman Bharat Cloud Synced Successfully! (14 Records Pushed)</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. TOP BANNER: OFFLINE MODE ACTIVE (TAP TO OPEN SYNC CENTER) */}
                <div 
                    onClick={() => setActiveModal('sync')}
                    style={{
                        margin: '16px 16px 18px 16px',
                        backgroundColor: '#e8f3fe',
                        borderRadius: '18px',
                        border: '1px solid #c8e1fd',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        boxShadow: '0 2px 6px rgba(11, 87, 208, 0.04)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: '#d3e7fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0b57d0',
                            flexShrink: 0
                        }}>
                            <WifiOff size={22} />
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#0b57d0',
                                lineHeight: '1.3'
                            }}>
                                Offline Mode Active (Tap to Open Sync Center)
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#64748b',
                                marginTop: '3px',
                                fontWeight: '500'
                            }}>
                                Sunita (ASHA / Caregiver) - Shirwal Sub-Centre & Family Circle
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={22} color="#0b57d0" style={{ flexShrink: 0 }} />
                </div>

                {/* 3. SIX ACTION CARDS (2 COLUMNS x 3 ROWS) */}
                <div style={{
                    padding: '0 16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '14px',
                    marginBottom: '24px'
                }}>
                    {/* CARD 1: REGISTER PATIENT */}
                    <div 
                        onClick={() => setActiveModal('register')}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            padding: '20px 16px',
                            border: '1px solid #eef2f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0284c7',
                            marginBottom: '14px'
                        }}>
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                Register Patient
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                New Profile & Consent
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: FIND PATIENT */}
                    <div 
                        onClick={() => setActiveModal('find')}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            padding: '20px 16px',
                            border: '1px solid #eef2f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#e6fcf5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0ca678',
                            marginBottom: '14px'
                        }}>
                            <Search size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                Find Patient
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                Directory & History
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: CLINICAL VITALS */}
                    <div 
                        onClick={() => setActiveModal('vitals')}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            padding: '20px 16px',
                            border: '1px solid #eef2f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#ffedd5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f97316',
                            marginBottom: '14px'
                        }}>
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                Clinical Vitals
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                Assess & Red-Flags
                            </div>
                        </div>
                    </div>

                    {/* CARD 4: MEDICAL HISTORY */}
                    <div 
                        onClick={() => setActiveModal('history')}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            padding: '20px 16px',
                            border: '1px solid #eef2f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#e0e7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6366f1',
                            marginBottom: '14px'
                        }}>
                            <History size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                Medical History
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                Longitudinal Encounters
                            </div>
                        </div>
                    </div>

                    {/* CARD 5: CLOSED-LOOP TRACK */}
                    <div 
                        onClick={() => setActiveModal('closedLoop')}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            padding: '20px 16px',
                            border: '1px solid #eef2f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#ccfbf1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0d9488',
                            marginBottom: '14px'
                        }}>
                            <ArrowLeftRight size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                Closed-Loop Track
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                Track Active Referrals
                            </div>
                        </div>
                    </div>

                    {/* CARD 6: FACILITY MATCHER */}
                    <div 
                        onClick={() => setActiveModal('facilityMatcher')}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            padding: '20px 16px',
                            border: '1px solid #eef2f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#e0e7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6',
                            marginBottom: '14px'
                        }}>
                            <GitFork size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                Facility Matcher
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                Smart Routing
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. BOTTOM SECTION: HIGH-PRIORITY / EMERGENCY ESCALATIONS */}
                <div style={{ padding: '0 16px 24px 16px' }}>
                    <h2 style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '12px'
                    }}>
                        High-Priority / Emergency Escalations
                    </h2>

                    {/* RED BORDER ALERT CARD */}
                    <div 
                        onClick={() => setActiveModal('emergencyAlert')}
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1.5px solid #ef4444',
                            borderRadius: '18px',
                            padding: '16px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
                            cursor: 'pointer'
                        }}
                    >
                        {/* Red Star of Life Badge */}
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0
                        }}>
                            <Asterisk size={26} strokeWidth={3} />
                        </div>

                        {/* Middle Text Description */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                lineHeight: '1.3'
                            }}>
                                Meena (Age 27) - 34 Wk Antenatal
                            </div>
                            <div style={{
                                fontSize: '0.82rem',
                                color: '#334155',
                                fontWeight: '500',
                                margin: '3px 0'
                            }}>
                                BP: 165/110 mmHg • High Risk Preeclampsia
                            </div>
                            <div style={{
                                fontSize: '0.78rem',
                                color: '#64748b',
                                fontWeight: '400'
                            }}>
                                Referred to: Nashik District Hospital
                            </div>
                        </div>

                        {/* Right Solid Red ALERTED Button */}
                        <button style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            letterSpacing: '0.04em',
                            border: 'none',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}>
                            ALERTED
                        </button>
                    </div>
                </div>

            </div>

            {/* ========================================================================= */}
            {/* INTERACTIVE MODALS FOR THE 6 CARDS + SYNC BANNER + EMERGENCY + NOTIFICATIONS */}
            {/* ========================================================================= */}

            {/* MODAL 1: SYNC CENTER */}
            <AnimatePresence>
                {activeModal === 'sync' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <WifiOff size={22} color="#0b57d0" />
                                    <h3 style={modalTitleStyle}>Field Sync & Offline Center</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '14px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
                                <div style={{ fontWeight: '700', color: '#0369a1', fontSize: '0.9rem' }}>Local SQLite Queue: 14 Changes Pending</div>
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>4 New Beneficiaries, 8 ANC Vital Checks, 2 Referral Escalate tokens recorded offline.</div>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span>Last Cloud Sync:</span>
                                    <strong>Today, 08:30 AM</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span>Network Telemetry:</span>
                                    <strong style={{ color: '#d97706' }}>Sub-Centre 2G Mesh (Weak)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span>Sync Protocol:</span>
                                    <strong>NHA ABHA M3 Gateway</strong>
                                </div>
                            </div>

                            <button 
                                onClick={handleTriggerSync}
                                disabled={isSyncing}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#0b57d0',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Synchronizing with NHA...' : 'Force Sync to Ayushman Bharat Cloud'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: REGISTER PATIENT */}
            <AnimatePresence>
                {activeModal === 'register' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <UserPlus size={22} color="#0284c7" />
                                    <h3 style={modalTitleStyle}>Register New Village Patient</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            {regSuccess ? (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                    <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 12px' }} />
                                    <h4 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem' }}>Patient Registered Successfully!</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>ABHA ID generated & stored in offline field registry.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleRegisterSubmit}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>Full Name *</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. Rekha Shinde" 
                                            value={regForm.fullName}
                                            onChange={e => setRegForm({...regForm, fullName: e.target.value})}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>Age (Years) *</label>
                                            <input 
                                                type="number" 
                                                required
                                                placeholder="e.g. 26" 
                                                value={regForm.age}
                                                onChange={e => setRegForm({...regForm, age: e.target.value})}
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Gender *</label>
                                            <select 
                                                value={regForm.gender} 
                                                onChange={e => setRegForm({...regForm, gender: e.target.value})}
                                                style={inputStyle}
                                            >
                                                <option value="Female">Female</option>
                                                <option value="Male">Male</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>Husband / Father</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Santosh" 
                                                value={regForm.husbandName}
                                                onChange={e => setRegForm({...regForm, husbandName: e.target.value})}
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Mobile Number *</label>
                                            <input 
                                                type="tel" 
                                                required
                                                placeholder="10-digit number" 
                                                value={regForm.phone}
                                                onChange={e => setRegForm({...regForm, phone: e.target.value})}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            type="checkbox" 
                                            id="pregCheck" 
                                            checked={regForm.isPregnant}
                                            onChange={e => setRegForm({...regForm, isPregnant: e.target.checked})}
                                        />
                                        <label htmlFor="pregCheck" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                                            Eligible for Maternal Health (ANC Tracking)
                                        </label>
                                    </div>

                                    {regForm.isPregnant && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <label style={labelStyle}>Gestational Age (Weeks)</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 16" 
                                                value={regForm.gestationalWeeks}
                                                onChange={e => setRegForm({...regForm, gestationalWeeks: e.target.value})}
                                                style={inputStyle}
                                            />
                                        </div>
                                    )}

                                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '16px', fontSize: '0.8rem', color: '#475569' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: '#0f172a' }}>
                                            <Shield size={14} color="#0b57d0" /> Digital Consent & ABHA Seeding
                                        </div>
                                        <div>Patient gave explicit consent to create Ayushman Bharat Health Record.</div>
                                    </div>

                                    <button 
                                        type="submit"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#0284c7',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save & Register Beneficiary
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 3: FIND PATIENT DIRECTORY */}
            <AnimatePresence>
                {activeModal === 'find' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Search size={22} color="#0ca678" />
                                    <h3 style={modalTitleStyle}>Catchment Patient Directory</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            <div style={{ position: 'relative', marginBottom: '14px' }}>
                                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name, husband, or ABHA..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '38px' }}
                                />
                            </div>

                            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                {patientList
                                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.husband.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(p => (
                                        <div 
                                            key={p.id}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                marginBottom: '10px',
                                                backgroundColor: p.risk === 'HIGH RISK' ? '#fff1f2' : '#ffffff'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                                                        {p.name} ({p.age}y, {p.gender})
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        {p.status} • {p.ward} • 📞 {p.phone}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '2px' }}>
                                                        ABHA: {p.abha}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: '800',
                                                    padding: '3px 8px',
                                                    borderRadius: '8px',
                                                    backgroundColor: p.risk === 'HIGH RISK' ? '#fee2e2' : '#dcfce7',
                                                    color: p.risk === 'HIGH RISK' ? '#dc2626' : '#15803d'
                                                }}>
                                                    {p.risk}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                                <button 
                                                    onClick={() => {
                                                        setActiveModal('vitals');
                                                        setVitalsForm({ ...vitalsForm, patientName: `${p.name} (Age ${p.age})` });
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        backgroundColor: '#ffffff',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ⚡ Record Vitals
                                                </button>
                                                <button 
                                                    onClick={() => setActiveModal('history')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        backgroundColor: '#ffffff',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    📜 View Encounters
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 4: CLINICAL VITALS & RED-FLAG ASSESSMENT */}
            <AnimatePresence>
                {activeModal === 'vitals' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldAlert size={22} color="#f97316" />
                                    <h3 style={modalTitleStyle}>Field Clinical Vitals & Triage</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            {vitalsSubmitted ? (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                    <AlertTriangle size={48} color="#dc2626" style={{ margin: '0 auto 12px' }} />
                                    <h4 style={{ margin: 0, color: '#dc2626', fontSize: '1.1rem' }}>HIGH RISK RED-FLAG TRIGGERED!</h4>
                                    <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '6px' }}>
                                        Preeclampsia Risk detected (BP 165/110). Referral Token <strong>#TK-8921</strong> automatically dispatched to Nashik District Hospital.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleVitalsSubmit}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>Beneficiary</label>
                                        <input type="text" readOnly value={vitalsForm.patientName} style={{ ...inputStyle, backgroundColor: '#f1f5f9' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>Systolic BP (mmHg)</label>
                                            <input 
                                                type="number" 
                                                value={vitalsForm.systolic_bp}
                                                onChange={e => setVitalsForm({...vitalsForm, systolic_bp: e.target.value})}
                                                style={{ ...inputStyle, borderColor: vitalsForm.systolic_bp > 140 ? '#ef4444' : '#cbd5e1' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Diastolic BP (mmHg)</label>
                                            <input 
                                                type="number" 
                                                value={vitalsForm.diastolic_bp}
                                                onChange={e => setVitalsForm({...vitalsForm, diastolic_bp: e.target.value})}
                                                style={{ ...inputStyle, borderColor: vitalsForm.diastolic_bp > 90 ? '#ef4444' : '#cbd5e1' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>SpO2 (%)</label>
                                            <input 
                                                type="number" 
                                                value={vitalsForm.spo2}
                                                onChange={e => setVitalsForm({...vitalsForm, spo2: e.target.value})}
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Blood Sugar (mg/dL)</label>
                                            <input 
                                                type="number" 
                                                value={vitalsForm.blood_sugar_fbs}
                                                onChange={e => setVitalsForm({...vitalsForm, blood_sugar_fbs: e.target.value})}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    {/* AI Red-Flag Evaluation Callout */}
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#fee2e2',
                                        borderRadius: '12px',
                                        border: '1px solid #fca5a5',
                                        marginBottom: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#dc2626', fontSize: '0.85rem' }}>
                                            <AlertTriangle size={16} /> RED-FLAG WARNING: Stage 2 Hypertensive Crisis
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: '4px' }}>
                                            At 34 weeks pregnancy, BP 165/110 indicates severe preeclampsia. Urgent hospital referral mandatory.
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#dc2626',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save Vitals & Dispatch Emergency Alert
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 5: MEDICAL HISTORY & LONGITUDINAL ENCOUNTERS */}
            <AnimatePresence>
                {activeModal === 'history' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={22} color="#6366f1" />
                                    <h3 style={modalTitleStyle}>Longitudinal Encounters</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            <div style={{ borderLeft: '2px solid #cbd5e1', marginLeft: '12px', paddingLeft: '16px' }}>
                                <div style={{ marginBottom: '16px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Today, 09:15 AM (ANC Visit 4)</div>
                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Preeclampsia Screening - High Risk</div>
                                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>BP 165/110 mmHg • 108 Emergency Ambulance Dispatched to Nashik FRU.</div>
                                </div>

                                <div style={{ marginBottom: '16px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>28 Aug 2026 (ANC Visit 3)</div>
                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Hemoglobin & Iron Supplementation</div>
                                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>Hb 10.2 g/dL • IFA Tablets 100 Strip Given • Calcium 500mg.</div>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>14 Jul 2026 (ANC Visit 2)</div>
                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Tetanus Toxoid (TT-2) Dose Given</div>
                                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>Administered at Shirwal Sub-Centre by ANM Suman.</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 6: CLOSED-LOOP TRACK */}
            <AnimatePresence>
                {activeModal === 'closedLoop' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowLeftRight size={22} color="#0d9488" />
                                    <h3 style={modalTitleStyle}>Closed-Loop Referral Tracker</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                                {activeReferrals.map((ref, idx) => (
                                    <div 
                                        key={idx}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '14px',
                                            border: '1px solid #e2e8f0',
                                            marginBottom: '12px',
                                            backgroundColor: '#ffffff'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontWeight: '800', color: '#0b57d0', fontSize: '0.9rem' }}>{ref.token}</span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: '800',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: ref.urgency === 'HIGH PRIORITY' ? '#fee2e2' : '#fef3c7',
                                                color: ref.urgency === 'HIGH PRIORITY' ? '#dc2626' : '#d97706'
                                            }}>
                                                {ref.urgency}
                                            </span>
                                        </div>

                                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{ref.patient}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Reason: {ref.condition}</div>

                                        <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem' }}>
                                            <div>🏥 <strong>{ref.facility}</strong></div>
                                            <div>👨‍⚕️ Assigned: {ref.doctor}</div>
                                            <div>🛏️ Status: {ref.bedStatus}</div>
                                            <div style={{ color: '#0284c7', fontWeight: '600', marginTop: '4px' }}>🚑 {ref.transport}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 7: FACILITY MATCHER */}
            <AnimatePresence>
                {activeModal === 'facilityMatcher' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <GitFork size={22} color="#3b82f6" />
                                    <h3 style={modalTitleStyle}>Smart Facility Matcher</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 0, marginBottom: '14px' }}>
                                Nearest facilities routed based on emergency level and live bed availability.
                            </p>

                            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                                {facilities.map((f, idx) => (
                                    <div 
                                        key={idx}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '14px',
                                            border: '1px solid #e2e8f0',
                                            marginBottom: '12px',
                                            backgroundColor: '#ffffff'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{f.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{f.type}</div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#059669', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                                                {f.status}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '0.8rem', color: '#334155' }}>
                                            <span>📍 <strong>{f.dist}</strong> ({f.eta})</span>
                                            <span>🛏️ <strong>{f.normalBeds}</strong> Beds</span>
                                            <span>❤️ <strong>{f.icuBeds}</strong> ICU</span>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                                            Specialists: {f.specialists.join(', ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 8: EMERGENCY ALERT ESCALATION DETAILS */}
            <AnimatePresence>
                {activeModal === 'emergencyAlert' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Asterisk size={24} color="#dc2626" />
                                    <h3 style={{ ...modalTitleStyle, color: '#dc2626' }}>Emergency Escalation Dispatch</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '14px', backgroundColor: '#fee2e2', borderRadius: '14px', border: '1px solid #fca5a5', marginBottom: '16px' }}>
                                <div style={{ fontWeight: '800', color: '#dc2626', fontSize: '1rem' }}>Meena Sharma (Age 27) - 34 Wk Antenatal</div>
                                <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: '4px' }}>
                                    BP: 165/110 mmHg • High Risk Preeclampsia • Severe Headaches
                                </div>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span>Escalation Status:</span>
                                    <strong style={{ color: '#dc2626' }}>ALERTED / ACTIVE</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span>Target Hospital:</span>
                                    <strong>Nashik District Hospital (FRU)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span>108 Ambulance:</span>
                                    <strong style={{ color: '#0284c7' }}>MH-15-EM-9902 (Driver: Dilip)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span>Emergency Bed:</span>
                                    <strong style={{ color: '#059669' }}>Reserved (ICU Bed #04)</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <a 
                                    href="tel:108"
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#dc2626',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Phone size={16} /> Call 108 Dispatch
                                </a>
                                <button 
                                    onClick={() => setActiveModal('closedLoop')}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#0f172a',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Track Live Route
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 9: NOTIFICATIONS */}
            <AnimatePresence>
                {activeModal === 'notifications' && (
                    <div style={modalBackdropStyle}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={modalContainerStyle}>
                            <div style={modalHeaderStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Bell size={22} color="#0b57d0" />
                                    <h3 style={modalTitleStyle}>ASHA Portal Alerts</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} style={closeBtnStyle}><X size={20} /></button>
                            </div>

                            {notifications.map(n => (
                                <div key={n.id} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{n.title}</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.time}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>{n.desc}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

// Modal and Form CSS in JS styles
const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px'
};

const modalContainerStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '24px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    maxHeight: '88vh',
    overflowY: 'auto'
};

const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9'
};

const modalTitleStyle = {
    fontSize: '1.15rem',
    fontWeight: '700',
    margin: 0,
    color: '#0f172a'
};

const closeBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#334155',
    marginBottom: '4px'
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box'
};

export default AshaDashboard;
