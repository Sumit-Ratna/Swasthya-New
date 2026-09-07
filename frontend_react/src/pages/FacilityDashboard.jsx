import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Bed, Stethoscope, AlertTriangle, CheckCircle2,
    Clock, Users, Activity, RefreshCw, Flame, Wind, Droplets,
    Phone, ChevronRight, Check, Search, ShieldCheck, Ambulance,
    ArrowRight, UserCheck, Plus, Filter, Zap
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const FacilityDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('beds');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    // Bed and Admission Modals
    const [admitModal, setAdmitModal] = useState(false);
    const [selectedReferral, setSelectedReferral] = useState(null);
    const [selectedBedCategory, setSelectedBedCategory] = useState('General Inpatient Ward');
    const [admitSuccess, setAdmitSuccess] = useState(null);

    useEffect(() => {
        fetchFacilityOps();
    }, []);

    const fetchFacilityOps = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/facility-ops/overview', {
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setData(res.data);
        } catch (err) {
            console.error('Facility Ops fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdmit = (referral) => {
        setSelectedReferral(referral);
        setSelectedBedCategory('General Inpatient Ward');
        setAdmitModal(true);
    };

    const handleConfirmAdmission = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/facility-ops/admit', {
                referralId: selectedReferral.id,
                bedCategory: selectedBedCategory
            });
            setAdmitSuccess({
                patient: selectedReferral.patientName,
                bed: selectedBedCategory
            });
            setAdmitModal(false);
            setTimeout(() => setAdmitSuccess(null), 5000);
            fetchFacilityOps();
        } catch (err) {
            console.error('Admit error:', err);
            alert('Admission failed: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)',
            padding: '24px 16px 100px 16px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Facility Executive Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        borderRadius: '24px',
                        padding: '26px',
                        color: '#fff',
                        boxShadow: '0 12px 28px -6px rgba(2, 132, 199, 0.35)',
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
                            width: '62px',
                            height: '62px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.4)'
                        }}>
                            <Building2 size={34} color="#fff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>
                                    {data?.facility?.name || 'District Hospital Nashik'}
                                </h1>
                                <span style={{
                                    background: '#22c55e',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    padding: '4px 10px',
                                    borderRadius: '12px'
                                }}>
                                    {data?.facility?.operationalStatus || 'OPEN & ACTIVE'}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                ABDM HFR Registry: <strong>{data?.facility?.hfrId || 'IN-MH-NSK-002148'}</strong> • {data?.facility?.district || 'Nashik'} District
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '14px' }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Overall Inpatient Occupancy</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{data?.facility?.overallOccupancyRate || '78%'}</div>
                        </div>
                        <button 
                            onClick={fetchFacilityOps}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                color: '#fff',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                            }}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh Ops
                        </button>
                    </div>
                </motion.div>

                {/* Admission Success Alert */}
                <AnimatePresence>
                    {admitSuccess && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                background: '#16a34a',
                                color: '#fff',
                                padding: '16px 20px',
                                borderRadius: '16px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 8px 24px rgba(22, 163, 74, 0.3)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CheckCircle2 size={24} />
                                <div>
                                    <strong>ADMISSION CONFIRMED!</strong> Patient <strong>{admitSuccess.patient}</strong> successfully assigned to <strong>{admitSuccess.bed}</strong>.
                                </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.25)', padding: '4px 8px', borderRadius: '6px' }}>
                                EHR Updated
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                        { id: 'beds', label: '🛏️ Live Bed & ICU Grid', icon: <Bed size={18} /> },
                        { id: 'referrals', label: '🚨 Inbound Emergency Triage Stream', icon: <Ambulance size={18} /> },
                        { id: 'roster', label: '🩺 Duty Doctor & OPD Roster', icon: <Stethoscope size={18} /> },
                        { id: 'resources', label: '🩸 Blood Bank & Oxygen Manifold', icon: <Droplets size={18} /> },
                        { id: 'lab', label: '🧪 Diagnostic Lab Queue', icon: <Activity size={18} /> }
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
                                background: activeTab === tab.id ? '#0284c7' : 'transparent',
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

                {/* TAB 1: BED & ICU GRID */}
                {activeTab === 'beds' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                            {(data?.bedCapacityGrid || []).map((b, i) => {
                                const occupancyPct = Math.round((b.occupied / b.total) * 100);
                                return (
                                    <div 
                                        key={i}
                                        style={{
                                            background: '#fff',
                                            borderRadius: '20px',
                                            padding: '20px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{b.category}</strong>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '3px 8px',
                                                borderRadius: '8px',
                                                background: occupancyPct > 85 ? '#fee2e2' : '#dcfce7',
                                                color: occupancyPct > 85 ? '#dc2626' : '#16a34a'
                                            }}>
                                                {occupancyPct}% FULL
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '14px 0 8px 0' }}>
                                            <div>
                                                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0284c7' }}>{b.available}</span>
                                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '4px' }}>Beds Available</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                Total: {b.total} | Occupied: {b.occupied}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${occupancyPct}%`,
                                                height: '100%',
                                                background: occupancyPct > 85 ? '#ef4444' : (occupancyPct > 60 ? '#f59e0b' : '#10b981'),
                                                borderRadius: '4px'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* TAB 2: INBOUND REFERRAL & EMERGENCY STREAM */}
                {activeTab === 'referrals' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                            Live Inbound Patient Stream & Triage Admission Desk
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                            {(data?.inboundReferralQueue || []).map(ref => {
                                const isRed = ref.triageCategory.includes('RED');
                                return (
                                    <div 
                                        key={ref.id}
                                        style={{
                                            background: '#fff',
                                            borderRadius: '20px',
                                            padding: '20px',
                                            border: isRed ? '2px solid #ef4444' : '1px solid #e2e8f0',
                                            boxShadow: isRed ? '0 8px 24px rgba(239, 68, 68, 0.12)' : '0 4px 14px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{ref.patientName}</strong>
                                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '6px' }}>
                                                    ({ref.age}y / {ref.gender})
                                                </span>
                                                <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '2px', fontWeight: '600' }}>
                                                    From: {ref.referringCenter}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '4px 10px',
                                                borderRadius: '10px',
                                                background: isRed ? '#fee2e2' : '#fef3c7',
                                                color: isRed ? '#dc2626' : '#b45309'
                                            }}>
                                                {ref.triageCategory.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', margin: '14px 0', fontSize: '0.85rem' }}>
                                            <div style={{ color: '#0f172a', fontWeight: '700' }}>{ref.primaryCondition}</div>
                                            <div style={{ color: '#64748b', marginTop: '4px' }}>
                                                Specialty: {ref.assignedSpecialty} • Transport: {ref.ambulanceAssigned} (ETA ~{ref.etaMinutes}m)
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleOpenAdmit(ref)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                background: isRed ? '#dc2626' : '#0284c7',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '10px',
                                                borderRadius: '12px',
                                                fontWeight: '700',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <UserCheck size={16} /> 1-Click Bed Allocation & Admit
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* TAB 3: DUTY DOCTOR & OPD ROSTER */}
                {activeTab === 'roster' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                            Clinical Roster & OPD Room Allocation
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                            {(data?.dutyDoctorRoster || []).map(doc => (
                                <div 
                                    key={doc.id}
                                    style={{
                                        background: '#fff',
                                        borderRadius: '16px',
                                        padding: '18px',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{doc.name}</strong>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: doc.dutyStatus === 'AVAILABLE' ? '#dcfce7' : '#fee2e2',
                                            color: doc.dutyStatus === 'AVAILABLE' ? '#16a34a' : '#dc2626'
                                        }}>
                                            {doc.dutyStatus}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '600', marginTop: '4px' }}>
                                        {doc.specialty} • {doc.opdRoom}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                                        Active Consultations in Queue: <strong>{doc.activePatients} Patients</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* TAB 4: BLOOD BANK & OXYGEN */}
                {activeTab === 'resources' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: '#fff',
                            padding: '22px',
                            borderRadius: '20px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Liquid Medical Oxygen (LMO) Plant Status</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px' }}>
                                    {data?.criticalResources?.oxygenPlantManifold || '98.5% Purity (6 Days Reserve)'}
                                </div>
                            </div>
                            <Wind size={40} opacity={0.8} />
                        </div>

                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                            Blood Bank Unit Inventory
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                            {(data?.criticalResources?.bloodBankStock || []).map((bb, i) => (
                                <div key={i} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '1.2rem', color: '#e11d48' }}>{bb.group}</strong>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: '800',
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: bb.status.includes('SHORTAGE') ? '#fee2e2' : '#dcfce7',
                                            color: bb.status.includes('SHORTAGE') ? '#dc2626' : '#16a34a'
                                        }}>
                                            {bb.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                                        {bb.units} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Units</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* TAB 5: DIAGNOSTIC LAB */}
                {activeTab === 'lab' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                            Inpatient & Emergency Diagnostic Queue
                        </h2>
                        <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            {(data?.diagnosticQueue || []).map((lab, i) => (
                                <div 
                                    key={lab.id}
                                    style={{
                                        padding: '16px 20px',
                                        borderBottom: i === (data?.diagnosticQueue?.length || 0) - 1 ? 'none' : '1px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{lab.testName}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                            Patient: {lab.patientName} • Priority: <span style={{ color: lab.priority.includes('STAT') ? '#dc2626' : '#2563eb', fontWeight: '700' }}>{lab.priority}</span>
                                        </div>
                                    </div>
                                    <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.8rem', fontWeight: '700', padding: '4px 10px', borderRadius: '8px' }}>
                                        {lab.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ADMISSION & BED ALLOCATION MODAL */}
                <AnimatePresence>
                    {admitModal && selectedReferral && (
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
                                    maxWidth: '480px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                                        Confirm Patient Admission
                                    </h3>
                                    <button 
                                        onClick={() => setAdmitModal(false)}
                                        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleConfirmAdmission}>
                                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Patient Name</div>
                                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{selectedReferral.patientName} ({selectedReferral.age}y)</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '4px' }}>{selectedReferral.primaryCondition}</div>
                                    </div>

                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            Select Ward / Bed Category
                                        </label>
                                        <select 
                                            value={selectedBedCategory}
                                            onChange={(e) => setSelectedBedCategory(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="General Inpatient Ward">General Inpatient Ward (38 Available)</option>
                                            <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU - 4 Available)</option>
                                            <option value="Maternal & NICU Unit">Maternal & NICU Unit (9 Available)</option>
                                            <option value="Emergency Trauma & Resuscitation">Emergency Trauma & Resuscitation (6 Available)</option>
                                        </select>
                                    </div>

                                    <button 
                                        type="submit"
                                        style={{
                                            width: '100%',
                                            background: '#0284c7',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Confirm Admission & Allocate Bed
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

export default FacilityDashboard;
