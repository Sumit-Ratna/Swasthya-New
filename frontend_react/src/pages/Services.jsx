import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Video, Activity, Scan, ShieldCheck, AlertCircle, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Services = () => {
    const { user } = useContext(AuthContext);
    const [booking, setBooking] = useState(false);
    const navigate = useNavigate();

    // Guardian AI State
    const [medication, setMedication] = useState('');
    const [safetyAnalysis, setSafetyAnalysis] = useState(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');

    // Modals
    const [showOpdModal, setShowOpdModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showLabModal, setShowLabModal] = useState(false);
    
    // Data
    const [doctors, setDoctors] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedClinic, setSelectedClinic] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    const clinics = [
        { id: 1, name: 'City Central Clinic', distance: '1.2 km', address: '45 MG Road' },
        { id: 2, name: 'Swasthya District Hospital', distance: '3.5 km', address: '22 Park Street' },
        { id: 3, name: 'CarePlus Point', distance: '5.0 km', address: '11 Ring Road' }
    ];

    const patientHistory = {
        allergies: user?.medical_history?.allergies || [],
        conditions: user?.medical_history?.chronic_diseases || []
    };

    useEffect(() => {
        const fetchConnectedDoctors = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const docRes = await axios.get('/api/connect/patient/doctors', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDoctors(docRes.data);
                
                const recRes = await axios.get('/api/documents/patient', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDocuments(recRes.data);
            } catch (err) {
                console.error('Data fetch error:', err);
            }
        };
        fetchConnectedDoctors();
    }, []);

    const checkSafety = async () => {
        if (!medication) {
            setError('Please enter a medication name');
            return;
        }
        setChecking(true);
        setSafetyAnalysis(null);
        setError('');
        try {
            const res = await axios.post('/api/ai/safety-check', {
                newMed: medication,
                patientHistory
            });
            setSafetyAnalysis(res.data.analysis);
        } catch (err) {
            console.error('Safety check error:', err);
            setError(err.response?.data?.error || 'Safety check failed. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    const handleBookOpd = async () => {
        if (!selectedClinic) {
            alert("Please select a clinic first.");
            return;
        }
        setBooking(true);
        try {
            await axios.post('/api/appointments/book/opd', {
                symptoms: "General Checkup",
                notes: `Self-booked at ${selectedClinic.name}`
            });
            alert("OPD Token Generated! Check Status tab.");
            setShowOpdModal(false);
        } catch (err) {
            alert("Booking Failed");
        } finally {
            setBooking(false);
        }
    };

    const handleBookVideo = async () => {
        if (!selectedDoctor) {
            alert("Please select a doctor to consult with.");
            return;
        }
        setBooking(true);
        try {
            await axios.post('/api/appointments/book/opd', {
                type: 'VIDEO',
                doctor_id: selectedDoctor.id,
                symptoms: "Follow-up consultation",
                notes: `Video Consultation with Dr. ${selectedDoctor.name}`
            });
            alert("Video Consultation Booked! Check Status tab.");
            setShowVideoModal(false);
        } catch (err) {
            alert("Booking Failed");
        } finally {
            setBooking(false);
        }
    };

    return (
        <div style={{ padding: '20px', paddingBottom: '100px', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="animate-enter" style={{ color: 'var(--text-primary)' }}>Medical Services</h1>
                <button
                    onClick={() => navigate('/scan')}
                    style={{
                        background: '#007AFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)'
                    }}
                >
                    <Scan size={20} />
                </button>
            </div>

            {/* Guardian AI Safety Check Section */}
            <motion.div
                className="card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: 'linear-gradient(135deg, #FF9500 0%, #FF2D55 100%)', color: 'white', marginTop: '24px', marginBottom: '24px', border: 'none' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <ShieldCheck size={28} style={{ marginRight: '10px' }} />
                    <h2 style={{ fontSize: '20px', margin: 0, color: 'white' }}>Guardian AI Safety Check</h2>
                </div>
                <p style={{ opacity: 0.9, marginTop: 0, fontSize: '14px', color: 'white' }}>
                    Check for drug interactions against your medical history
                    {patientHistory.allergies.length > 0 && (
                        <><br /><b>Your Allergies: </b>{patientHistory.allergies.join(", ")}</>
                    )}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Enter medication name..."
                            value={medication}
                            onChange={(e) => setMedication(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && checkSafety()}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                fontSize: '16px', color: '#1C1C1E', outline: 'none'
                            }}
                        />
                        <button
                            onClick={checkSafety}
                            disabled={checking}
                            style={{
                                background: 'white', color: '#FF2D55', fontWeight: 'bold',
                                border: 'none', borderRadius: '12px', padding: '0 20px', cursor: checking ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {checking ? '...' : 'Check'}
                        </button>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                            <AlertCircle size={16} color="white" style={{ marginRight: '8px' }} />
                            <span style={{ fontSize: '14px', color: 'white' }}>{error}</span>
                        </div>
                    )}
                </div>

                {safetyAnalysis && (
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
                        <strong style={{ color: 'white' }}>Analysis:</strong>
                        <p style={{ margin: '8px 0 0', color: 'white', fontWeight: 500, fontSize: '14px', lineHeight: '1.5' }}>{safetyAnalysis}</p>
                    </div>
                )}
            </motion.div>

            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Swasthya Healthcare & Multi-Role Hub</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/asha')}
                    style={{ border: '1px solid #99f6e4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: '#f0fdf4', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '28px', marginBottom: '6px' }}>👩‍⚕️</span>
                    <span style={{ fontWeight: 700, color: '#0f766e', fontSize: '13px', textAlign: 'center' }}>ASHA Field Hub</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/caregiver')}
                    style={{ border: '1px solid #fbcfe8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: '#fff1f2', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '28px', marginBottom: '6px' }}>👨‍👩‍👧</span>
                    <span style={{ fontWeight: 700, color: '#be185d', fontSize: '13px', textAlign: 'center' }}>Caregiver Hub</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/facility-dashboard')}
                    style={{ border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: '#f0f9ff', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '28px', marginBottom: '6px' }}>🏥</span>
                    <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '13px', textAlign: 'center' }}>Facility Ops</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin')}
                    style={{ border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: '#f8fafc', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '28px', marginBottom: '6px' }}>🛡️</span>
                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '13px', textAlign: 'center' }}>Admin Center</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/referrals')}
                    style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: 'rgba(13, 148, 136, 0.08)', cursor: 'pointer' }}
                >
                    <Activity size={28} color="var(--primary-color)" style={{ marginBottom: '8px' }} />
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '13px', textAlign: 'center' }}>Closed-Loop Referrals</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/facilities')}
                    style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: 'rgba(2, 132, 199, 0.08)', cursor: 'pointer' }}
                >
                    <MapPin size={28} color="#0284C7" style={{ marginBottom: '8px' }} />
                    <span style={{ fontWeight: 600, color: '#0284C7', fontSize: '13px', textAlign: 'center' }}>Facility Smart Match</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/triage')}
                    style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: 'rgba(234, 88, 12, 0.08)', cursor: 'pointer' }}
                >
                    <ShieldCheck size={28} color="#EA580C" style={{ marginBottom: '8px' }} />
                    <span style={{ fontWeight: 600, color: '#EA580C', fontSize: '13px', textAlign: 'center' }}>AI Clinical Triage</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/roles')}
                    style={{ border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px', background: '#fef3c7', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '28px', marginBottom: '6px' }}>🔀</span>
                    <span style={{ fontWeight: 700, color: '#b45309', fontSize: '13px', textAlign: 'center' }}>Switch Role Portal</span>
                </motion.div>
            </div>

            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Clinical & Consult Services</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowOpdModal(true)}
                    style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: 'var(--blue-badge-bg)', cursor: 'pointer' }}
                >
                    <PlusCircle size={32} color="#007AFF" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: '#007AFF' }}>OPD Booking</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowVideoModal(true)}
                    style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: 'var(--danger-bg)', cursor: 'pointer' }}
                >
                    <Video size={32} color="#FF2D55" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: '#FF2D55' }}>Video Consult</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowLabModal(true)}
                    style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: 'var(--success-bg)', cursor: 'pointer' }}
                >
                    <Activity size={32} color="#34C759" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: '#34C759' }}>Lab Tests</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/learn-medicine')}
                    style={{
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '140px',
                        background: 'linear-gradient(135deg, #FF9500 0%, #FFCC00 100%)',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    <Video size={32} color="white" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: 'white' }}>Medicine Library</span>
                </motion.div>
            </div>

            {/* General Modal Backdrop and Wrappers */}
            <AnimatePresence>
                {(showOpdModal || showVideoModal || showLabModal) && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        
                        {/* OPD Modal */}
                        {showOpdModal && (
                            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Find Nearby Clinic</h2>
                                    <button onClick={() => setShowOpdModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X /></button>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a nearby clinic or hospital for General OPD Booking.</p>
                                
                                <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                                    {clinics.map(clinic => (
                                        <div 
                                            key={clinic.id} 
                                            onClick={() => setSelectedClinic(clinic)}
                                            style={{ 
                                                padding: '16px', borderRadius: '12px', cursor: 'pointer',
                                                border: selectedClinic?.id === clinic.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                                background: selectedClinic?.id === clinic.id ? 'var(--primary-light)' : 'var(--card-bg)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <strong style={{ color: 'var(--text-primary)' }}>{clinic.name}</strong>
                                                <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 600 }}>{clinic.distance}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                                                <MapPin size={12} style={{ marginRight: '4px' }} /> {clinic.address}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button className="btn-primary" onClick={handleBookOpd} disabled={booking || !selectedClinic} style={{ opacity: booking || !selectedClinic ? 0.7 : 1 }}>
                                    {booking ? 'Booking...' : 'Confirm Booking'}
                                </button>
                            </motion.div>
                        )}

                        {/* Video Consult Modal */}
                        {showVideoModal && (
                            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Video Consult</h2>
                                    <button onClick={() => setShowVideoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X /></button>
                                </div>
                                
                                {doctors.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <Video size={48} color="var(--border-color)" style={{ margin: '0 auto 16px' }} />
                                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No connected doctors.</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>You must connect with a doctor first by scanning their QR code before requesting a video consultation.</p>
                                        <button className="btn-primary" onClick={() => { setShowVideoModal(false); navigate('/scan'); }} style={{ marginTop: '16px' }}>
                                            Scan Doctor QR
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a connected doctor for your video consultation.</p>
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                                            {doctors.map(doc => (
                                                <div 
                                                    key={doc.id} 
                                                    onClick={() => setSelectedDoctor(doc)}
                                                    style={{ 
                                                        padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                        border: selectedDoctor?.id === doc.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                                        background: selectedDoctor?.id === doc.id ? 'var(--primary-light)' : 'var(--card-bg)'
                                                    }}
                                                >
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E1F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', color: '#007AFF', fontWeight: 'bold' }}>
                                                        {doc.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{doc.name}</strong>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.specialization}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn-primary" onClick={handleBookVideo} disabled={booking || !selectedDoctor} style={{ opacity: booking || !selectedDoctor ? 0.7 : 1 }}>
                                            {booking ? 'Requesting...' : 'Request Video Consult'}
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* Lab Modal */}
                        {showLabModal && (
                            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>AI Recommended Tests</h2>
                                    <button onClick={() => setShowLabModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X /></button>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Based on analysis of your uploaded lab reports, our AI has generated the following recommendations.</p>
                                
                                {documents.filter(d => d.extracted_data?.recommendations).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                        <Activity size={32} color="var(--text-secondary)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No recommendations found yet.</p>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Upload more comprehensive reports for analysis.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        {documents.filter(d => d.extracted_data?.recommendations).map(doc => (
                                            <div key={doc.id} style={{ background: 'var(--blue-badge-bg)', padding: '16px', borderRadius: '12px' }}>
                                                <div style={{ fontSize: '11px', color: '#007AFF', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                                                    From Report: {new Date(doc.createdAt).toLocaleDateString()}
                                                </div>
                                                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '14px' }}>
                                                    {Array.isArray(doc.extracted_data?.recommendations) 
                                                        ? doc.extracted_data.recommendations.map((rec, i) => <li key={i} style={{ marginBottom: '4px' }}>{rec}</li>)
                                                        : <li>{doc.extracted_data.recommendations}</li>
                                                    }
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <button className="btn-primary" onClick={() => setShowLabModal(false)} style={{ marginTop: '20px' }}>
                                    Close
                                </button>
                            </motion.div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Services;
