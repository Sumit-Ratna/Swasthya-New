import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pill, Plus, X, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

const PrescribeMedicine = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');

    const [patient, setPatient] = useState(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [notes, setNotes] = useState('');
    const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
    const [loading, setLoading] = useState(false);
    const [safetyResults, setSafetyResults] = useState(null);

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/');
            return;
        }
        if (patientId) {
            fetchPatient();
        }
    }, [patientId]);

    const fetchPatient = async () => {
        try {
            const res = await axios.get(`/api/doctor/patients/${patientId}/history`);
            setPatient(res.data.patient);
        } catch (err) {
            console.error('Error fetching patient:', err);
        }
    };

    const addMedicine = () => {
        setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
    };

    const removeMedicine = (index) => {
        setMedicines(medicines.filter((_, i) => i !== index));
    };

    const updateMedicine = (index, field, value) => {
        const updated = [...medicines];
        updated[index][field] = value;
        setMedicines(updated);
    };

    const handlePrescribe = async (skipAI = false) => {
        if (!patientId || !diagnosis || medicines.some(m => !m.name)) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const medicineNames = medicines.map(m => `${m.name} ${m.dosage} ${m.frequency} for ${m.duration}`);

            const res = await axios.post('/api/doctor/prescribe', {
                patient_id: patientId,
                medicines: medicineNames,
                diagnosis,
                symptoms,
                notes,
                skipAICheck: skipAI
            });

            if (!skipAI) {
                setSafetyResults(res.data.safetyChecks);
            }

            alert('Prescription created successfully! PDF Report Generated.');

            // Navigate back after 2 seconds
            setTimeout(() => {
                navigate(`/doctor/patient/${patientId}`);
            }, 2000);
        } catch (err) {
            console.error('Error creating prescription:', err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to create prescription';
            alert(`Error: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!patientId) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>No patient selected</p>
                <button className="btn-primary" onClick={() => navigate('/doctor/patients')}>
                    View Patients
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate(-1)}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', color: '#007AFF', marginBottom: '16px', cursor: 'pointer' }}
            >
                <ArrowLeft size={20} style={{ marginRight: '6px' }} />
                Back
            </button>

            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#34C759', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pill size={24} color="white" />
                    </div>
                    Prescribe Medicine
                </h1>
                {patient && (
                    <p style={{ color: '#8E8E93', marginTop: '8px' }}>
                        Patient: <strong>{patient.name}</strong> | {patient.phone}
                    </p>
                )}
            </header>

            {/* Critical Patient Info */}
            {patient && (
                <div className="card" style={{ marginBottom: '20px', padding: '16px', background: '#FFF9F0', border: '1px solid #FFE5B4' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#FF9500', textTransform: 'uppercase' }}>⚠️ Medical Alert & Profile</h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {/* Allergies */}
                        <div>
                            <span style={{ fontSize: '12px', color: '#8E8E93', display: 'block', marginBottom: '4px' }}>Allergies</span>
                            {patient.medical_history?.allergies?.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {patient.medical_history.allergies.map(a => (
                                        <span key={a} style={{ background: '#FF2D55', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{a}</span>
                                    ))}
                                </div>
                            ) : <span style={{ fontSize: '13px', color: '#333' }}>None recorded</span>}
                        </div>

                        {/* Chronic Diseases */}
                        <div>
                            <span style={{ fontSize: '12px', color: '#8E8E93', display: 'block', marginBottom: '4px' }}>Chronic Conditions</span>
                            {patient.medical_history?.chronic_diseases?.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {patient.medical_history.chronic_diseases.map(d => (
                                        <span key={d} style={{ background: '#E1F0FF', color: '#007AFF', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>{d}</span>
                                    ))}
                                </div>
                            ) : <span style={{ fontSize: '13px', color: '#333' }}>None recorded</span>}
                        </div>

                        {/* Lifestyle */}
                        <div>
                            <span style={{ fontSize: '12px', color: '#8E8E93', display: 'block', marginBottom: '4px' }}>Lifestyle</span>
                            <div style={{ fontSize: '13px', color: '#333', display: 'flex', gap: '12px' }}>
                                <span>🚬 {patient.lifestyle?.smoking || 'No'}</span>
                                <span>🍺 {patient.lifestyle?.alcohol || 'No'}</span>
                                <span>🥗 {patient.lifestyle?.food_preference || 'Standard'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Symptoms (Chief Complaint) */}
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', marginBottom: '8px', display: 'block' }}>
                    CHIEF COMPLAINT / SYMPTOMS
                </label>
                <textarea
                    placeholder="e.g. Fever, Cough, Headache..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E5EA', borderRadius: '10px', fontSize: '16px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
            </div>

            {/* Diagnosis */}
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', marginBottom: '8px', display: 'block' }}>
                    DIAGNOSIS *
                </label>
                <input
                    type="text"
                    placeholder="Enter diagnosis..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E5EA', borderRadius: '10px', fontSize: '16px', outline: 'none' }}
                />
            </div>

            {/* Medicines */}
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>MEDICINES / Rx *</label>
                    <button
                        onClick={addMedicine}
                        style={{ background: '#34C759', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    >
                        <Plus size={16} style={{ marginRight: '4px' }} />
                        Add Medicine
                    </button>
                </div>

                {medicines.map((med, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: '16px', padding: '16px', background: '#F2F2F7', borderRadius: '12px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>Medicine {index + 1}</div>
                            {medicines.length > 1 && (
                                <button
                                    onClick={() => removeMedicine(index)}
                                    style={{ background: 'none', border: 'none', color: '#FF2D55', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 120px 120px 120px', gap: '8px', minWidth: 'max-content' }}>
                                <input
                                    type="text"
                                    placeholder="Medicine name"
                                    value={med.name}
                                    onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                                    style={{ padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Dosage (e.g. 500 MG)"
                                    value={med.dosage}
                                    onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                                    style={{ padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Freq (e.g. BD)"
                                    value={med.frequency}
                                    onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                                    style={{ padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Duration (e.g. 3 Days)"
                                    value={med.duration}
                                    onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                                    style={{ padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Additional Notes */}
            <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', marginBottom: '8px', display: 'block' }}>
                    FOLLOW UP / NOTES
                </label>
                <textarea
                    placeholder="Any usage instructions or follow up (e.g. SOS)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E5EA', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
            </div>

            {/* Safety Checks Results */}
            {safetyResults && (
                <div className="card" style={{ marginBottom: '24px', padding: '20px', background: '#F0FFF4', border: '2px solid #34C759' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <CheckCircle size={24} color="#34C759" style={{ marginRight: '8px' }} />
                        <h3 style={{ margin: 0 }}>AI Safety Check Complete</h3>
                    </div>
                    {safetyResults.map((check, i) => (
                        <div key={i} style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{check.medicine}</div>
                            <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{check.safety}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => handlePrescribe(true)}
                    disabled={loading}
                    style={{
                        flex: '1 1 200px',
                        padding: '16px',
                        background: '#F2F2F7',
                        color: '#333',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {loading ? 'Processing...' : 'Create Only (Fast)'}
                </button>

                <button
                    onClick={() => handlePrescribe(false)}
                    disabled={loading}
                    style={{
                        flex: '1 1 200px',
                        padding: '16px',
                        background: loading ? '#8E8E93' : '#34C759',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {loading ? (
                        'Analysing...'
                    ) : (
                        <>
                            <Pill size={20} style={{ marginRight: '8px' }} />
                            Create & Analyse (AI)
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default PrescribeMedicine;
