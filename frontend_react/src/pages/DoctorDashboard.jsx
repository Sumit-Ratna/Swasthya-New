import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Users, Calendar, FileText, Activity, User, Pill, Stethoscope, QrCode, Bell, MessageSquareHeart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';

const DoctorDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState({ patientCount: 0, todayAppointments: 0 });
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/');
            return;
        }
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const statsRes = await axios.get('/api/doctor/dashboard');
            setStats(statsRes.data);

            const patientsRes = await axios.get('/api/doctor/patients');
            setPatients(patientsRes.data);
        } catch (err) {
            console.error('Error fetching doctor data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="animate-enter" style={{ color: 'var(--text-primary)', margin: 0 }}>Doctor Dashboard</h1>
                    <p className="animate-enter" style={{ animationDelay: '0.1s', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        Welcome, Dr. {user?.name}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Feedback Button Near Notification Icon */}
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
                            padding: '8px 14px',
                            borderRadius: '20px',
                            border: '1px solid #bfdbfe',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)'
                        }} 
                        onClick={() => setIsFeedbackOpen(true)}
                        title="Doctor Feedback & Clinical Suggestions"
                    >
                        <MessageSquareHeart size={18} color="#0284c7" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>Feedback</span>
                    </motion.div>

                    {/* Notification Bell */}
                    <div 
                        style={{ position: 'relative', cursor: 'pointer', background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid var(--border-color)' }} 
                        onClick={() => navigate('/notifications')} 
                        title="Notifications"
                    >
                        <Bell size={20} color="var(--text-primary)" />
                        <div style={{
                            position: 'absolute', top: '-2px', right: '-2px', background: 'var(--danger-color)',
                            color: 'white', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                        }}>
                            2
                        </div>
                    </div>
                </div>
            </header>

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                        <Users size={24} color="var(--primary-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{stats.patientCount}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Patients</div>
                    </div>
                </motion.div>

                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                        <Calendar size={24} color="var(--success-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success-color)' }}>{stats.todayAppointments}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Today's Appointments</div>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/doctor/patients')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Users size={18} style={{ marginRight: '8px' }} />
                    View Patients
                </button>
                <button
                    onClick={() => navigate('/doctor/prescribe')}
                    style={{ background: 'var(--success-color)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Pill size={18} style={{ marginRight: '8px' }} />
                    Prescribe Medicine
                </button>
                <button
                    onClick={() => navigate('/doctor/diagnosis')}
                    style={{ background: 'var(--warning-color)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Stethoscope size={18} style={{ marginRight: '8px' }} />
                    Add Diagnosis
                </button>
            </div>

            {/* Facility & ASHA Clinical Collaboration Ribbon */}
            <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '14px 18px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>🏥 Hospital Network & Field Collaboration</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Check inpatient bed availability, incoming ASHA triage cases, or system audit ledger</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => navigate('/facility-dashboard')}
                        style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        🏥 Facility Bed Grid
                    </button>
                    <button 
                        onClick={() => navigate('/asha')}
                        style={{ background: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        👩‍⚕️ ASHA Field Hub
                    </button>
                    <button 
                        onClick={() => navigate('/admin')}
                        style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        🛡️ Admin Ledger
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Recent Patients</h3>
                    {patients.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>
                            <User size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No patients linked yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {patients.slice(0, 5).map((patient, index) => (
                                <motion.div
                                    key={patient.id}
                                    className="card"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                                    style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', fontSize: '16px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                        {patient.name?.[0]?.toUpperCase() || 'P'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>{patient.name || 'Unknown Patient'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {patient.phone ? (patient.phone.startsWith('+') ? patient.phone : `+91 ${patient.phone}`) : 'Unknown'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px 10px', background: 'var(--bg-color)', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        View
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Recent Reports Issued</h3>
                    {!stats.recentActivity || stats.recentActivity.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>
                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No reports issued yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {stats.recentActivity.map((doc, index) => (
                                <motion.div
                                    key={doc.id}
                                    className="card"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => navigate(`/doctor/patient/${doc.patient_id}`)}
                                    style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', borderLeft: `4px solid ${doc.type === 'prescription' ? 'var(--success-color)' : (doc.type === 'diagnosis_note' ? 'var(--warning-color)' : 'var(--primary-color)')}`, borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>
                                            {doc.type === 'prescription' ? 'Prescription' : (doc.type === 'diagnosis_note' ? 'Diagnosis' : 'Lab Report')}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            For {doc.patient?.name || 'Patient'} • {new Date(doc.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                                        <Activity size={16} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
