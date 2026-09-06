import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { MapPin, Phone, MessageSquare, ShieldCheck, AlertTriangle } from 'lucide-react';

const CareTeam = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConnectedDoctors();
    }, []);

    const fetchConnectedDoctors = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/connect/patient/doctors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(res.data);
        } catch (err) {
            console.error('Error fetching doctors:', err);
        } finally {
            setLoading(false);
        }
    };

    // Guardian AI State
    const [medication, setMedication] = useState('');
    const [safetyAnalysis, setSafetyAnalysis] = useState(null);
    const [checking, setChecking] = useState(false);

    // Hardcoded patient history for context
    const patientHistory = {
        allergies: ["Penicillin", "Peanuts"],
        conditions: ["Hypertension", "Asthma"]
    };

    const checkSafety = async () => {
        if (!medication) return;
        setChecking(true);
        setSafetyAnalysis(null);
        try {
            const res = await axios.post('/api/ai/safety-check', {
                newMed: medication,
                patientHistory
            });
            setSafetyAnalysis(res.data.analysis);
        } catch (err) {
            alert("Check failed");
        } finally {
            setChecking(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1 className="animate-enter">My Care Team</h1>
            <p className="animate-enter" style={{ animationDelay: '0.1s' }}>Your trusted circle & AI Guardian.</p>

            {/* Guardian AI Section */}
            <motion.div
                className="card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: 'linear-gradient(135deg, #FF9500 0%, #FF2D55 100%)', color: 'white', marginTop: '16px' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <ShieldCheck size={28} style={{ marginRight: '10px' }} />
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Guardian AI Safety Check</h2>
                </div>
                <p style={{ opacity: 0.9, marginTop: 0 }}>Check for drug interactions against your allergies: <b>{patientHistory.allergies.join(", ")}</b></p>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Enter medication name..."
                        value={medication}
                        onChange={(e) => setMedication(e.target.value)}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                            fontSize: '16px', color: '#1C1C1E'
                        }}
                    />
                    <button
                        onClick={checkSafety}
                        disabled={checking}
                        style={{
                            background: 'white', color: '#FF2D55', fontWeight: 'bold',
                            border: 'none', borderRadius: '12px', padding: '0 20px', cursor: 'pointer'
                        }}
                    >
                        {checking ? '...' : 'Check'}
                    </button>
                </div>

                {safetyAnalysis && (
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
                        <strong>Analysis:</strong>
                        <p style={{ margin: '4px 0 0', color: 'white', fontWeight: 500 }}>{safetyAnalysis}</p>
                    </div>
                )}
            </motion.div>

            {/* Doctors List */}
            <div style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>Linked Doctors</h3>

                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                        Loading doctors...
                    </div>
                ) : doctors.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                        <p>No doctors connected yet</p>
                        <p style={{ fontSize: '14px' }}>Click below to link with a doctor</p>
                    </div>
                ) : (
                    doctors.map((doc, index) => (
                        <motion.div
                            key={doc.id}
                            className="card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    backgroundColor: '#E1F0FF', marginRight: '16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px', fontWeight: 'bold', color: '#007AFF'
                                }}>
                                    {doc.name?.[0]?.toUpperCase() || 'D'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '20px', margin: 0 }}>{doc.name || 'Doctor'}</h2>
                                    <div style={{ color: '#007AFF', fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
                                        {doc.specialization || 'General Physician'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '4px' }}>{doc.hospital_name}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: '#F2F2F7', borderRadius: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{doc.phone ? `+91 ${doc.phone}` : 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{doc.email || 'N/A'}</div>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <div style={{ fontSize: '11px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>Clinic Address</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{doc.lifestyle?.clinic_address || doc.hospital_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>Doctor ID</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF' }}>{doc.doctor_qr_id}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>License No.</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{doc.lifestyle?.license_number || 'N/A'}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}

                {/* Add Doctor Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        border: '2px dashed #C7C7CC',
                        borderRadius: '24px',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8E8E93',
                        marginTop: '16px',
                        cursor: 'pointer'
                    }}
                    onClick={() => window.location.href = '/scan'}
                >
                    + Link a new Doctor
                </motion.div>
            </div>
        </div>
    );
};

export default CareTeam;
