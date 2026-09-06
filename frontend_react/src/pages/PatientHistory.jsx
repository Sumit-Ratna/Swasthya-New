import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { User, FileText, Calendar, Pill, Stethoscope, ArrowLeft, AlertCircle, Volume2, Trash2, Loader, CheckCircle, Upload, Edit2 } from 'lucide-react';

const PatientHistory = () => {
    const { patient_id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [data, setData] = useState({ patient: null, documents: [], appointments: [] });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('records');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        allergies: '',
        chronic_diseases: '',
        smoking: 'no',
        alcohol: 'no',
        activity: 'moderate',
        diet: 'veg'
    });

    const handleEditProfileSave = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const medical_history = {
                allergies: editFormData.allergies.split(',').map(s => s.trim()).filter(Boolean),
                chronic_diseases: editFormData.chronic_diseases.split(',').map(s => s.trim()).filter(Boolean)
            };
            const lifestyle = {
                smoking: editFormData.smoking,
                alcohol: editFormData.alcohol,
                activity_level: editFormData.activity,
                food_preference: editFormData.diet
            };

            await axios.put(`/api/doctor/patients/${patient_id}/profile`,
                { medical_history, lifestyle },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Patient profile updated successfully!");
            setShowEditProfileModal(false);
            fetchPatientHistory();
        } catch (err) {
            console.error("Update error:", err);
            alert("Failed to update profile");
        }
    };

    const handleUpload = async (shouldAnalyze = true) => {
        if (!selectedFile) return;

        console.log(`📤 Uploading as User: ${user?.id} (Analyze: ${shouldAnalyze})`);

        setUploading(true);
        const formData = new FormData();

        // APPEND TEXT FIELDS FIRST for Multer processing stability
        formData.append('patient_id', patient_id);
        formData.append('analyze', shouldAnalyze);

        if (user?.role === 'doctor') {
            formData.append('doctor_id', user.id);
            formData.append('is_doctor_upload', 'true');
        }

        // Append File LAST
        formData.append('report', selectedFile);

        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post('/api/documents/upload', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log("📥 Upload Response:", res.data);

            if (res.data.document?.is_shared) {
                alert('Report uploaded and shared with you successfully!');
            } else {
                alert('Report uploaded successfully!');
            }

            setShowUploadModal(false);
            setSelectedFile(null);
            fetchPatientHistory();
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload report');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/');
            return;
        }
        fetchPatientHistory();
    }, [patient_id]);

    const fetchPatientHistory = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`/api/connect/doctor/patient/${patient_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("📄 Patient History Data:", res.data);
            setData({ ...res.data, appointments: res.data.appointments || [] });
        } catch (err) {
            console.error('Error fetching patient history:', err);
            alert('Error loading patient data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId) => {
        if (window.confirm("Are you sure? This will remove the record from your portal. (Note: Only records you created will be permanently deleted; patient-shared reports will simply be unshared).")) {
            try {
                const token = localStorage.getItem('accessToken');
                const res = await axios.delete(`/api/documents/${docId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchPatientHistory(); // Refresh
                alert(res.data.message); // Show specific message from backend
            } catch (err) {
                console.error("Delete error", err);
                alert(err.response?.data?.error || "Failed to process request");
            }
        }
    };

    const handleAnalyze = async (docId) => {
        if (!confirm("Run AI Analysis on this report again?")) return;

        // Indicate loading somehow? We don't have per-item loading state yet.
        // Let's use global loading for simplicity or just alert on start/end.
        // Better: just alert start.
        alert("Analysis started. Please wait...");

        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post(`/api/documents/${docId}/analyze`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Analysis Complete!");
            fetchPatientHistory(); // Refresh to see data
        } catch (err) {
            console.error("Analysis error", err);
            alert("Failed to analyze: " + (err.response?.data?.error || err.message));
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading patient history...</div>;
    }

    const { patient, documents, appointments } = data;

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <button
                onClick={() => navigate('/doctor/patients')}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', color: '#007AFF', marginBottom: '16px', cursor: 'pointer' }}
            >
                <ArrowLeft size={20} style={{ marginRight: '6px' }} />
                Back to Patients
            </button>

            {/* Patient Info Card */}
            <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', background: '#E1F0FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: '24px', fontSize: '32px', fontWeight: 'bold', color: '#007AFF',
                        flexShrink: 0
                    }}>
                        {patient?.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: '0 0 8px', fontSize: '24px' }}>{patient?.name || 'Unknown Patient'}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '15px', color: '#555' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 500 }}>
                                    {patient?.phone ? (patient.phone.startsWith('+') ? patient.phone : `+91 ${patient.phone}`) : ''}
                                </span>
                                {patient?.email && <span style={{ color: '#8E8E93' }}>• {patient.email}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {patient?.gender && <span style={{ background: '#F2F2F7', padding: '4px 10px', borderRadius: '6px', fontSize: '13px' }}>{patient.gender}</span>}
                                {patient?.blood_group && <span style={{ background: '#FFF0F5', color: '#FF2D55', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>Blood: {patient.blood_group}</span>}
                                {patient?.dob && <span style={{ background: '#F9F9F9', border: '1px solid #E5E5EA', padding: '4px 10px', borderRadius: '6px', fontSize: '13px' }}>Born: {new Date(patient.dob).toLocaleDateString()}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar - separated for better mobile/desktop layout */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px',
                    paddingTop: '20px', borderTop: '1px solid #F2F2F7'
                }}>
                    <button
                        onClick={() => navigate(`/doctor/prescribe?patient=${patient_id}`)}
                        style={{ background: '#34C759', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 5px rgba(52, 199, 89, 0.2)' }}
                    >
                        <Pill size={18} style={{ marginRight: '8px' }} />
                        Prescribe
                    </button>
                    <button
                        onClick={() => navigate(`/doctor/diagnosis?patient=${patient_id}`)}
                        style={{ background: '#FF9500', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 5px rgba(255, 149, 0, 0.2)' }}
                    >
                        <Stethoscope size={18} style={{ marginRight: '8px' }} />
                        Diagnose
                    </button>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        style={{ background: '#007AFF', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 5px rgba(0, 122, 255, 0.2)' }}
                    >
                        <FileText size={18} style={{ marginRight: '8px' }} />
                        Upload Report
                    </button>
                </div>

                {/* Medical & Lifestyle History */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #F2F2F7', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px' }}>

                    {/* Medical Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: '0', color: '#333', fontSize: '16px' }}>Medical Profile</h4>
                            <button
                                onClick={() => {
                                    setEditFormData({
                                        allergies: patient?.medical_history?.allergies?.join(', ') || '',
                                        chronic_diseases: patient?.medical_history?.chronic_diseases?.join(', ') || '',
                                        smoking: patient?.lifestyle?.smoking || 'no',
                                        alcohol: patient?.lifestyle?.alcohol || 'no',
                                        activity: patient?.lifestyle?.activity_level || 'moderate',
                                        diet: patient?.lifestyle?.food_preference || 'veg'
                                    });
                                    setShowEditProfileModal(true);
                                }}
                                style={{
                                    border: 'none', background: 'none', color: '#007AFF', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#FF2D55', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                                ALLERGIES
                            </div>
                            {patient?.medical_history?.allergies?.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {patient.medical_history.allergies.map(a => (
                                        <span key={a} style={{ background: '#FFF0F5', color: '#FF2D55', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>{a}</span>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ fontSize: '14px', color: '#8E8E93', fontStyle: 'italic' }}>None recorded</span>
                            )}
                        </div>

                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#007AFF', marginBottom: '6px' }}>CHRONIC CONDITIONS</div>
                            {patient?.medical_history?.chronic_diseases?.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {patient.medical_history.chronic_diseases.map(d => (
                                        <span key={d} style={{ background: '#E1F0FF', color: '#007AFF', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>{d}</span>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ fontSize: '14px', color: '#8E8E93', fontStyle: 'italic' }}>None recorded</span>
                            )}
                        </div>
                    </div>

                    {/* Lifestyle Section */}
                    <div>
                        <h4 style={{ margin: '0 0 12px', color: '#333', fontSize: '16px' }}>Lifestyle</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                            <div style={{ background: '#F9F9F9', padding: '10px', borderRadius: '10px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Smoking</span>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#333' }}>
                                    {patient?.lifestyle?.smoking || 'Unknown'}
                                </span>
                            </div>
                            <div style={{ background: '#F9F9F9', padding: '10px', borderRadius: '10px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Alcohol</span>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#333' }}>
                                    {patient?.lifestyle?.alcohol || 'Unknown'}
                                </span>
                            </div>
                            <div style={{ background: '#F9F9F9', padding: '10px', borderRadius: '10px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Activity</span>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#333' }}>
                                    {patient?.lifestyle?.activity_level || 'Unknown'}
                                </span>
                            </div>
                            <div style={{ background: '#F9F9F9', padding: '10px', borderRadius: '10px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Diet</span>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#333' }}>
                                    {patient?.lifestyle?.food_preference || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#E5E5EA', padding: '4px', borderRadius: '12px', marginBottom: '24px' }}>
                {['records', 'appointments'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '10px',
                            borderRadius: '10px',
                            background: tab === t ? 'white' : 'transparent',
                            color: tab === t ? 'black' : '#8E8E93',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Content */}
            {tab === 'records' && (
                <div>
                    <h3>Medical Records</h3>
                    {documents.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No records available</p>
                        </div>
                    ) : (
                        documents.map(doc => (
                            <motion.div
                                key={doc.id}
                                className="card"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ marginBottom: '12px', padding: '16px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: doc.type === 'prescription' ? '#34C759' : '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                                        <FileText size={20} color="white" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{doc.type.replace('_', ' ').toUpperCase()}</div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93' }}>
                                            {new Date(doc.createdAt).toLocaleDateString()} <span style={{ color: '#ccc' }}>|</span> {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {doc.file_url && (
                                            <button
                                                onClick={() => window.open(`/${doc.file_url}`, '_blank')}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    background: '#F2F2F7',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#007AFF',
                                                    fontWeight: 600,
                                                    fontSize: '12px'
                                                }}
                                            >
                                                View Original
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '8px',
                                                background: '#FFE5E5',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#FF3B30',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Delete Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                {doc.extracted_data && (
                                    <div style={{ marginTop: '12px', fontSize: '13px', background: '#F2F2F7', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 800, color: '#007AFF', fontSize: '11px', textTransform: 'uppercase' }}>Clinical Data</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {!doc.extracted_data && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAnalyze(doc.id);
                                                        }}
                                                        style={{ background: '#34C759', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '10px', padding: '2px 8px', fontWeight: 600 }}
                                                    >
                                                        Analyze
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.speechSynthesis.cancel();
                                                    }}
                                                    style={{ background: 'none', border: '1px solid #FF2D55', borderRadius: '4px', cursor: 'pointer', color: '#FF2D55', fontSize: '10px', padding: '2px 6px' }}
                                                    title="Stop Reading"
                                                >
                                                    Stop
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        let text = "";
                                                        if (doc.type === 'diagnosis_note') {
                                                            text = `Diagnosis: ${doc.extracted_data.diagnosis}. Symptoms: ${doc.extracted_data.symptoms}. Plan: ${doc.extracted_data.treatment_plan}`;
                                                        } else if (doc.extracted_data?.summary_text) {
                                                            text = doc.extracted_data.summary_text;
                                                        } else {
                                                            text = JSON.stringify(doc.extracted_data).replace(/[{"},]/g, ' ');
                                                        }

                                                        const speech = new SpeechSynthesisUtterance("Summary for " + doc.type.replace('_', ' ') + ". " + text);
                                                        window.speechSynthesis.cancel();
                                                        window.speechSynthesis.speak(speech);
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF' }}
                                                    title="Read Aloud"
                                                >
                                                    <Volume2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Diagnosis Note Specific View */}
                                        {doc.type === 'diagnosis_note' ? (
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <div>
                                                    <span style={{ fontWeight: 600, color: '#333' }}>Diagnosis: </span>
                                                    <span>{doc.extracted_data.diagnosis}</span>
                                                </div>
                                                <div>
                                                    <span style={{ fontWeight: 600, color: '#333' }}>Symptoms: </span>
                                                    <span>{doc.extracted_data.symptoms}</span>
                                                </div>
                                                {doc.extracted_data.treatment_plan && (
                                                    <div style={{ marginTop: '4px', padding: '8px', background: 'white', borderRadius: '6px', borderLeft: '3px solid #FF9500' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '11px', color: '#FF9500' }}>TREATMENT PLAN</div>
                                                        {doc.extracted_data.treatment_plan}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                                                {doc.extracted_data?.summary_text
                                                    ? doc.extracted_data.summary_text
                                                    : (typeof doc.extracted_data === 'string'
                                                        ? doc.extracted_data
                                                        : Object.entries(doc.extracted_data).map(([key, val]) => (
                                                            <div key={key}><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</div>
                                                        ))
                                                    )
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {tab === 'appointments' && (
                <div>
                    <h3>Appointments</h3>
                    {appointments.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No appointments scheduled</p>
                        </div>
                    ) : (
                        appointments.map(apt => (
                            <div key={apt.id} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{apt.date}</div>
                                        <div style={{ fontSize: '14px', color: '#8E8E93' }}>{apt.time}</div>
                                    </div>
                                    <span style={{ padding: '6px 12px', background: apt.status === 'confirmed' ? '#E1F0FF' : '#F2F2F7', color: apt.status === 'confirmed' ? '#007AFF' : '#8E8E93', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                                        {apt.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {/* Upload Modal */}
            {showUploadModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card"
                        style={{ width: '90%', maxWidth: '400px', padding: '24px', background: 'white' }}
                    >
                        <h3>Upload Patient Report</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Select File</label>
                            <input
                                type="file"
                                name="report"
                                accept="image/*,.pdf"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #E5E5EA',
                                    borderRadius: '8px'
                                }}
                            />
                            {selectedFile && (
                                <div style={{ fontSize: '12px', color: '#34C759', marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                                    <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                                </div>
                            )}
                            <p style={{ fontSize: '12px', color: '#8E8E93', marginTop: '4px' }}>Supports Images & PDF.</p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleUpload(false)}
                                    disabled={uploading || !selectedFile}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid #007AFF',
                                        background: 'white',
                                        color: '#007AFF',
                                        fontWeight: 600,
                                        cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Just Upload
                                </button>
                                <button
                                    onClick={() => handleUpload(true)}
                                    disabled={uploading || !selectedFile}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: '#007AFF',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    {uploading ? <Loader size={16} className="spin" style={{ marginRight: '6px' }} /> : <CheckCircle size={16} style={{ marginRight: '6px' }} />}
                                    Analyze & Upload
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFile(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#F2F2F7',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: '#8E8E93'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Edit Profile Modal */}
            {showEditProfileModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card"
                        style={{ width: '90%', maxWidth: '500px', padding: '24px', background: 'white', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <h3>Edit Patient Medical Profile</h3>

                        <h4 style={{ fontSize: '14px', color: '#007AFF', margin: '16px 0 8px' }}>Medical History</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>Allergies (comma separated)</label>
                            <input
                                type="text"
                                value={editFormData.allergies}
                                onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                                placeholder="Peanuts, Penicillin..."
                                style={{ width: '100%', padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>Chronic Diseases (comma separated)</label>
                            <input
                                type="text"
                                value={editFormData.chronic_diseases}
                                onChange={(e) => setEditFormData({ ...editFormData, chronic_diseases: e.target.value })}
                                placeholder="Diabetes, Hypertension..."
                                style={{ width: '100%', padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                            />
                        </div>

                        <h4 style={{ fontSize: '14px', color: '#007AFF', margin: '16px 0 8px' }}>Lifestyle</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>Smoking</label>
                                <select
                                    value={editFormData.smoking}
                                    onChange={(e) => setEditFormData({ ...editFormData, smoking: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                >
                                    <option value="no">No</option>
                                    <option value="occasionally">Occasionally</option>
                                    <option value="regularly">Regularly</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>Alcohol</label>
                                <select
                                    value={editFormData.alcohol}
                                    onChange={(e) => setEditFormData({ ...editFormData, alcohol: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                >
                                    <option value="no">No</option>
                                    <option value="occasionally">Occasionally</option>
                                    <option value="regularly">Regularly</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>Activity</label>
                                <select
                                    value={editFormData.activity}
                                    onChange={(e) => setEditFormData({ ...editFormData, activity: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                >
                                    <option value="sedentary">Sedentary</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="active">Active</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>Diet</label>
                                <select
                                    value={editFormData.diet}
                                    onChange={(e) => setEditFormData({ ...editFormData, diet: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                >
                                    <option value="veg">Vegetarian</option>
                                    <option value="non-veg">Non-Vegetarian</option>
                                    <option value="vegan">Vegan</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={() => setShowEditProfileModal(false)}
                                style={{ flex: 1, padding: '12px', background: '#F2F2F7', color: '#333', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditProfileSave}
                                style={{ flex: 1, padding: '12px', background: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default PatientHistory;
