import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
    Users, Calendar, Pill, Stethoscope, Sparkles, QrCode, 
    Bell, User, ChevronRight, X, Copy, CheckCircle2, 
    Building2, Activity, Shield, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState({ patientCount: 1, todayAppointments: 0, recentActivity: [] });
    const [patients, setPatients] = useState([
        { id: 'pat_sumit_001', name: 'sumit', phone: '9876543210', gender: 'Male', age: 28, lastVisit: 'Today' }
    ]);
    const [loading, setLoading] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [copiedQR, setCopiedQR] = useState(false);

    const doctorName = user?.name || 'sumit';
    const doctorQrId = user?.doctor_qr_id || `DOC-${user?.id?.slice(0, 8) || 'SUMIT-9821'}`;

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [statsRes, patientsRes] = await Promise.allSettled([
                axios.get('/api/doctor/dashboard', { headers }),
                axios.get('/api/doctor/patients', { headers })
            ]);

            if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
                const data = statsRes.value.data;
                setStats({
                    patientCount: data.patientCount ?? data.data?.patientCount ?? 1,
                    todayAppointments: data.todayAppointments ?? data.data?.todayAppointments ?? 0,
                    recentActivity: data.recentActivity || []
                });
            }

            if (patientsRes.status === 'fulfilled' && patientsRes.value?.data) {
                const patList = Array.isArray(patientsRes.value.data) 
                    ? patientsRes.value.data 
                    : (patientsRes.value.data?.data || []);
                
                if (patList.length > 0) {
                    setPatients(patList);
                }
            }
        } catch (err) {
            console.error('Error loading doctor dashboard:', err);
        }
    };

    const handleCopyQR = () => {
        navigator.clipboard.writeText(doctorQrId);
        setCopiedQR(true);
        setTimeout(() => setCopiedQR(false), 2000);
    };

    return (
        <div style={{
            maxWidth: '480px',
            margin: '0 auto',
            minHeight: '100vh',
            backgroundColor: '#fafbfc',
            padding: '24px 18px 90px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Header: Title + Welcome + Notification Bell */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '22px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '26px',
                        fontWeight: '800',
                        color: '#0f172a',
                        margin: 0,
                        letterSpacing: '-0.5px'
                    }}>
                        Doctor Dashboard
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#64748b',
                        margin: '4px 0 0 0',
                        fontWeight: '500'
                    }}>
                        Welcome, Dr. {doctorName}
                    </p>
                </div>

                {/* Circular Notification Bell */}
                <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => navigate('/notifications')}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        position: 'relative'
                    }}
                    title="Notifications"
                >
                    <Bell size={20} color="#334155" />
                    <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '11px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444'
                    }} />
                </motion.button>
            </div>

            {/* Metric Summary Cards (Clean Mint Square Icons) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {/* Total Patients Card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '18px',
                        padding: '18px 20px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '18px'
                    }}
                >
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        backgroundColor: '#e6fbf2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Users size={26} color="#008774" strokeWidth={2.2} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            color: '#008774',
                            lineHeight: 1,
                            letterSpacing: '-0.5px'
                        }}>
                            {stats.patientCount}
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: '#64748b',
                            fontWeight: '500',
                            marginTop: '4px'
                        }}>
                            Total Patients
                        </div>
                    </div>
                </motion.div>

                {/* Today's Appointments Card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '18px',
                        padding: '18px 20px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '18px'
                    }}
                >
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        backgroundColor: '#e6fbf2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Calendar size={26} color="#008774" strokeWidth={2.2} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            color: '#008774',
                            lineHeight: 1,
                            letterSpacing: '-0.5px'
                        }}>
                            {stats.todayAppointments}
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: '#64748b',
                            fontWeight: '500',
                            marginTop: '4px'
                        }}>
                            Today's Appointments
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions Header & Grid */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#0f172a',
                    margin: '0 0 14px 0',
                    letterSpacing: '-0.3px'
                }}>
                    Quick Actions
                </h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                }}>
                    {/* View Patients (Teal) */}
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate('/doctor/patients')}
                        style={{
                            backgroundColor: '#008774',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0, 135, 116, 0.25)'
                        }}
                    >
                        <Users size={18} strokeWidth={2.4} />
                        <span>View Patients</span>
                    </motion.button>

                    {/* Prescribe Medicine (Emerald Green) */}
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate('/doctor/prescribe')}
                        style={{
                            backgroundColor: '#00875a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0, 135, 90, 0.25)'
                        }}
                    >
                        <Pill size={18} strokeWidth={2.4} />
                        <span>Prescribe Medicine</span>
                    </motion.button>

                    {/* Add Diagnosis (Warm Amber / Orange) */}
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate('/doctor/diagnosis')}
                        style={{
                            backgroundColor: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
                        }}
                    >
                        <Stethoscope size={18} strokeWidth={2.4} />
                        <span>Add Diagnosis</span>
                    </motion.button>

                    {/* AI Scribe (Indigo / Purple) */}
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate('/doctor/scribe')}
                        style={{
                            backgroundColor: '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                        }}
                    >
                        <Sparkles size={18} strokeWidth={2.4} />
                        <span>AI Scribe</span>
                    </motion.button>

                    {/* My QR Code (Royal Indigo Blue) */}
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowQRModal(true)}
                        style={{
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                        }}
                    >
                        <QrCode size={18} strokeWidth={2.4} />
                        <span>My QR Code</span>
                    </motion.button>
                </div>
            </div>

            {/* Recent Patients Section */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#0f172a',
                    margin: '0 0 14px 0',
                    letterSpacing: '-0.3px'
                }}>
                    Recent Patients
                </h2>

                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px',
                    padding: '8px 16px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                }}>
                    {patients.slice(0, 5).map((pat, index) => {
                        const initial = (pat.name || 's')[0].toLowerCase();
                        return (
                            <div
                                key={pat.id || index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 0',
                                    borderBottom: index < patients.length - 1 ? '1px solid #f1f5f9' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        backgroundColor: '#e6fbf2',
                                        color: '#008774',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '17px',
                                        fontWeight: '700'
                                    }}>
                                        {initial}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '15px',
                                            fontWeight: '700',
                                            color: '#0f172a'
                                        }}>
                                            {pat.name || 'sumit'}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#94a3b8',
                                            fontWeight: '500'
                                        }}>
                                            {pat.phone ? `+91 ${pat.phone}` : 'General OPD'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/doctor/patient/${pat.id || 'pat_sumit_001'}`)}
                                    style={{
                                        backgroundColor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        color: '#475569',
                                        borderRadius: '8px',
                                        padding: '6px 14px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    View
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hospital Facility & Field Collaboration Ribbon */}
            <div style={{
                background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
                borderRadius: '16px',
                padding: '14px 16px',
                border: '1px solid #ccfbf1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div>
                    <strong style={{ fontSize: '13px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={16} />
                        <span>Hospital Facility & ASHA Field Hub</span>
                    </strong>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Check live bed occupancy, incoming triage cases & referrals
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/facility-dashboard')}
                        style={{
                            background: '#0284c7',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        Bed Grid
                    </button>
                    <button
                        onClick={() => navigate('/asha')}
                        style={{
                            background: '#0d9488',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        ASHA Hub
                    </button>
                </div>
            </div>

            {/* Doctor QR Code Modal */}
            <AnimatePresence>
                {showQRModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '24px',
                                padding: '24px',
                                width: '100%',
                                maxWidth: '380px',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setShowQRModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} color="#64748b" />
                            </button>

                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: '#e0e7ff',
                                color: '#4338ca',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 12px',
                                fontSize: '24px',
                                fontWeight: '800'
                            }}>
                                {doctorName[0]?.toUpperCase() || 'D'}
                            </div>

                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#0f172a' }}>
                                Dr. {doctorName}
                            </h3>
                            <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#64748b' }}>
                                Scan this QR to connect EHR & consultations
                            </p>

                            <div style={{
                                background: '#f8fafc',
                                padding: '16px',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                display: 'inline-block',
                                marginBottom: '18px'
                            }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(doctorQrId)}`}
                                    alt="Doctor QR Code"
                                    style={{ width: '180px', height: '180px', display: 'block' }}
                                />
                            </div>

                            <div style={{
                                background: '#f1f5f9',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px'
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                    {doctorQrId}
                                </span>
                                <button
                                    onClick={handleCopyQR}
                                    style={{
                                        background: copiedQR ? '#dcfce7' : '#ffffff',
                                        color: copiedQR ? '#15803d' : '#0284c7',
                                        border: '1px solid #cbd5e1',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    {copiedQR ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                    <span>{copiedQR ? 'Copied!' : 'Copy ID'}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => navigate('/doctor/qr')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    backgroundColor: '#4f46e5',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Open Full QR Poster & Print
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DoctorDashboard;
