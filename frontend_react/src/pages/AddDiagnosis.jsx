import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Stethoscope, ArrowLeft, FileText } from 'lucide-react';

const AddDiagnosis = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');

    const [patient, setPatient] = useState(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [treatmentPlan, setTreatmentPlan] = useState('');
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async () => {
        if (!patientId || !diagnosis || !symptoms) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/doctor/diagnosis', {
                patient_id: patientId,
                diagnosis,
                symptoms,
                treatment_plan: treatmentPlan
            });

            alert('Diagnosis note added successfully!');
            navigate(`/doctor/patient/${patientId}`);
        } catch (err) {
            console.error('Error adding diagnosis:', err);
            alert('Failed to add diagnosis note');
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
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate(-1)}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', color: '#007AFF', marginBottom: '16px', cursor: 'pointer' }}
            >
                <ArrowLeft size={20} style={{ marginRight: '6px' }} />
                Back
            </button>

            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#FF9500', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Stethoscope size={24} color="white" />
                    </div>
                    Add Diagnosis Note
                </h1>
                {patient && (
                    <p style={{ color: '#8E8E93', marginTop: '8px' }}>
                        Patient: <strong>{patient.name}</strong> | {patient.phone}
                    </p>
                )}
            </header>

            {/* Patient Medical Profile */}
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

            {/* Diagnosis */}
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', marginBottom: '8px', display: 'block' }}>
                    DIAGNOSIS *
                </label>
                <input
                    type="text"
                    placeholder="e.g., Acute Bronchitis, Type 2 Diabetes, etc."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E5EA', borderRadius: '10px', fontSize: '16px', outline: 'none' }}
                />
            </div>

            {/* Symptoms */}
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', marginBottom: '8px', display: 'block' }}>
                    SYMPTOMS OBSERVED *
                </label>
                <textarea
                    placeholder="Describe the symptoms presented by the patient..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={5}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E5EA', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
            </div>

            {/* Treatment Plan */}
            <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', marginBottom: '8px', display: 'block' }}>
                    TREATMENT PLAN
                </label>
                <textarea
                    placeholder="Recommended treatment plan, follow-up instructions, lifestyle changes, etc."
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    rows={6}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E5EA', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
            </div>

            {/* Submit Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ padding: '16px', background: '#F2F2F7', color: '#333', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        padding: '16px',
                        background: loading ? '#8E8E93' : '#FF9500',
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
                        'Saving...'
                    ) : (
                        <>
                            <FileText size={20} style={{ marginRight: '8px' }} />
                            Save Diagnosis Note
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AddDiagnosis;
