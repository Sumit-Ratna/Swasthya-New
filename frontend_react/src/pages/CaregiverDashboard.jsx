import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Activity, Users, Pill, AlertTriangle, ShieldCheck,
    Phone, Clock, Calendar, ChevronRight, CheckCircle2,
    Sparkles, RefreshCw, Send, MapPin, UserPlus, Stethoscope,
    FileText, Zap, Bell, Check, ArrowUpRight, Flame
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CaregiverDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedDepId, setSelectedDepId] = useState('dep-1');
    const [activeTab, setActiveTab] = useState('vitals');

    // SOS Panic State
    const [sosTriggered, setSosTriggered] = useState(false);
    const [sosData, setSosData] = useState(null);
    const [broadcastingSos, setBroadcastingSos] = useState(false);

    // Pillbox interactive state
    const [medsList, setMedsList] = useState([]);

    useEffect(() => {
        fetchCaregiverData();
    }, []);

    const fetchCaregiverData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/caregiver/overview', {
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setData(res.data);
            setMedsList(res.data.medicationsSchedule || []);
        } catch (err) {
            console.error('Caregiver data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentDep = (data?.dependents || []).find(d => d.id === selectedDepId) || data?.dependents?.[0];

    const handleToggleMed = (medId) => {
        setMedsList(prev => prev.map(m => {
            if (m.id === medId) {
                return {
                    ...m,
                    takenToday: !m.takenToday,
                    takenAt: !m.takenToday ? 'Just now' : null
                };
            }
            return m;
        }));
    };

    const handleTriggerSOS = async () => {
        if (!window.confirm(`🚨 ARE YOU SURE? This will broadcast an immediate Emergency SOS Alert for ${currentDep?.name} to Emergency 108 and Dr. Anand Deshmukh.`)) {
            return;
        }

        try {
            setBroadcastingSos(true);
            const res = await axios.post('/api/caregiver/sos', {
                patientName: currentDep?.name,
                caregiverName: data?.caregiver?.name || 'Aditya Singh',
                location: 'Pune Catchment, GPS 18.5204° N, 73.8567° E'
            });
            setSosData(res.data.alert);
            setSosTriggered(true);
        } catch (err) {
            console.error('SOS Trigger error:', err);
            alert('SOS failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setBroadcastingSos(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #fff1f2 0%, #f8fafc 100%)',
            padding: '24px 16px 100px 16px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

                {/* Hero Guardian Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #e11d48 0%, #881337 100%)',
                        borderRadius: '24px',
                        padding: '26px',
                        color: '#fff',
                        boxShadow: '0 12px 28px -6px rgba(225, 29, 72, 0.35)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '24px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.4)'
                        }}>
                            <Users size={32} color="#fff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>
                                    Caregiver Command Hub
                                </h1>
                                <span style={{
                                    background: 'rgba(255,255,255,0.25)',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    padding: '4px 10px',
                                    borderRadius: '12px'
                                }}>
                                    FAMILY PROXY GUARDIAN
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                Managing health vitals, daily pillbox, and emergency SOS for <strong>{data?.dependents?.length || 3} Dependents</strong>
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handleTriggerSOS}
                            disabled={broadcastingSos}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#dc2626',
                                border: '2px solid rgba(255,255,255,0.8)',
                                color: '#fff',
                                padding: '10px 18px',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            <AlertTriangle size={18} />
                            {broadcastingSos ? 'Broadcasting...' : 'EMERGENCY SOS PANIC'}
                        </button>
                    </div>
                </motion.div>

                {/* SOS Alert Notification */}
                <AnimatePresence>
                    {sosTriggered && sosData && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: '#fee2e2',
                                border: '2px solid #ef4444',
                                borderRadius: '20px',
                                padding: '20px',
                                marginBottom: '24px',
                                color: '#991b1b'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: '#dc2626',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '1.1rem', color: '#7f1d1d' }}>
                                            EMERGENCY BROADCAST ACTIVE FOR {sosData.patient}!
                                        </strong>
                                        <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '2px' }}>
                                            Alert dispatched to {sosData.broadcastedTo.join(', ')} • Geolocation: {sosData.location}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#b91c1c', marginTop: '4px' }}>
                                            Audit Hash: {sosData.sha256AuditHash?.slice(0, 32)}...
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSosTriggered(false)}
                                    style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    ✕ Dismiss
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dependent Profile Switcher Ribbon */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px',
                    overflowX: 'auto',
                    paddingBottom: '4px'
                }}>
                    {(data?.dependents || []).map(dep => {
                        const isSelected = dep.id === selectedDepId;
                        return (
                            <button
                                key={dep.id}
                                onClick={() => setSelectedDepId(dep.id)}
                                style={{
                                    flex: 1,
                                    minWidth: '240px',
                                    padding: '16px',
                                    borderRadius: '18px',
                                    border: isSelected ? '2px solid #e11d48' : '1px solid #e2e8f0',
                                    background: isSelected ? '#fff' : '#ffffffcc',
                                    boxShadow: isSelected ? '0 8px 24px rgba(225, 29, 72, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <img 
                                    src={dep.avatarUrl} 
                                    alt={dep.name}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: isSelected ? '2px solid #e11d48' : '2px solid #cbd5e1'
                                    }}
                                />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{dep.name}</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: '700' }}>({dep.relation})</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                        {dep.age} yrs • Blood Group: {dep.bloodGroup}
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        marginTop: '4px',
                                        color: dep.status === 'NEEDS_ATTENTION' ? '#dc2626' : (dep.status === 'STABLE' ? '#d97706' : '#16a34a')
                                    }}>
                                        ● {dep.status.replace('_', ' ')}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Active Dependent Executive Snapshot */}
                {currentDep && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        marginBottom: '24px'
                    }}>
                        {/* Vitals Radar Card */}
                        <div style={{
                            background: '#fff',
                            borderRadius: '20px',
                            padding: '22px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={20} color="#e11d48" />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                        Vitals Radar for {currentDep.name}
                                    </h3>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{currentDep.vitals.lastChecked}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Blood Pressure</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: currentDep.vitals.bpStatus === 'NORMAL' ? '#16a34a' : '#ea580c', marginTop: '2px' }}>
                                        {currentDep.vitals.bp}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Status: {currentDep.vitals.bpStatus}</div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Fasting Blood Sugar</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: currentDep.vitals.sugarStatus === 'NORMAL' ? '#16a34a' : '#ea580c', marginTop: '2px' }}>
                                        {currentDep.vitals.sugarFasting}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Status: {currentDep.vitals.sugarStatus}</div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Blood Oxygen (SpO2)</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>
                                        {currentDep.vitals.spo2}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Optimal Oxygenation</div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Resting Pulse</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
                                        {currentDep.vitals.heartRate}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Normal Rhythm</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#475569', background: '#fff1f2', padding: '10px 14px', borderRadius: '10px' }}>
                                <strong>Chronic Diagnoses:</strong> {currentDep.chronicConditions.join(', ')} • <strong>Allergies:</strong> {currentDep.allergies.join(', ')}
                            </div>
                        </div>

                        {/* Upcoming Clinical Appointments Card */}
                        <div style={{
                            background: '#fff',
                            borderRadius: '20px',
                            padding: '22px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Stethoscope size={20} color="#2563eb" />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                        Clinical Appointments & OPD
                                    </h3>
                                </div>

                                {currentDep.upcomingAppointment ? (
                                    <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ color: '#1e40af', fontSize: '1rem' }}>{currentDep.upcomingAppointment.doctor}</strong>
                                            <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                                                {currentDep.upcomingAppointment.token}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#3b82f6', marginTop: '2px', fontWeight: '600' }}>
                                            {currentDep.upcomingAppointment.specialty} • {currentDep.upcomingAppointment.hospital}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} /> {currentDep.upcomingAppointment.dateTime}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                        No upcoming hospital consults scheduled for {currentDep.name}.
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button 
                                    onClick={() => navigate('/facilities')}
                                    style={{
                                        flex: 1,
                                        background: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Book Specialist Appointment
                                </button>
                                <button 
                                    onClick={() => navigate('/records')}
                                    style={{
                                        background: '#f1f5f9',
                                        color: '#334155',
                                        border: 'none',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    View Vault
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Smart Pillbox & Medication Adherence Tracker */}
                <div style={{
                    background: '#fff',
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pill size={22} color="#059669" />
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                    Smart Pillbox & Daily Adherence Tracker
                                </h2>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                Mark doses taken by dependents and track pharmacy shortage alerts.
                            </p>
                        </div>
                        <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.8rem', fontWeight: '800', padding: '6px 12px', borderRadius: '10px' }}>
                            94% Weekly Adherence
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                        {medsList.map(med => (
                            <div 
                                key={med.id}
                                style={{
                                    border: med.refillWarning ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    background: med.takenToday ? '#f0fdf4' : '#fff',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: '700' }}>
                                        {med.dependentName}
                                    </div>
                                    <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                                        {med.name}
                                    </strong>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                        {med.dosage} • {med.timeSlot}
                                    </div>
                                    {med.refillWarning && (
                                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700', marginTop: '4px' }}>
                                            ⚠️ Only {med.pillsRemaining} pills left! Refill soon.
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => handleToggleMed(med.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: med.takenToday ? '#16a34a' : '#f1f5f9',
                                        color: med.takenToday ? '#fff' : '#475569',
                                        border: 'none',
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <Check size={16} />
                                    {med.takenToday ? 'Taken' : 'Mark Dose'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Emergency Hotline Directory */}
                <div style={{
                    background: '#f8fafc',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                        📞 24x7 Verified Guardian Contacts
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        {(data?.emergencyContacts || []).map((ec, i) => (
                            <div key={i} style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{ec.name}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ec.role}</div>
                                <div style={{ fontSize: '0.9rem', color: '#e11d48', fontWeight: '800', marginTop: '4px' }}>{ec.phone}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CaregiverDashboard;
