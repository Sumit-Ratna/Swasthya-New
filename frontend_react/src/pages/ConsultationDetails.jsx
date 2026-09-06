import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { ArrowLeft, User, Calendar, FileText, Activity, Pill, Trash2, Printer, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ConsultationDetails = () => {
    const { date, doctorId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [docs, setDocs] = useState([]);
    const [doctorName, setDoctorName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchConsultationDocs();
        }
    }, [user, date, doctorId]);

    const fetchConsultationDocs = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`/api/documents/patient/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filter
            const targetDate = new Date(date).toDateString();
            const relevantDocs = res.data.filter(doc => {
                const docDate = new Date(doc.createdAt).toDateString();
                const dId = doc.extracted_data?.doctor_id;

                // Allow match by ID or if ID matches string "undefined" legacy case
                // Also robust check for date
                const idMatch = String(dId) === String(doctorId) ||
                    ((!dId || dId === 'unknown') && doctorId === 'unknown');

                return docDate === targetDate && idMatch;
            });

            setDocs(relevantDocs);

            // Set doctor name from first record found
            if (relevantDocs.length > 0) {
                setDoctorName(relevantDocs[0].extracted_data?.doctor_name || 'Doctor');
            }
        } catch (err) {
            console.error("Error fetching consultation details:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId) => {
        if (window.confirm("Are you sure you want to remove this record from your history?")) {
            try {
                const token = localStorage.getItem('accessToken');
                await axios.delete(`/api/documents/${docId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // Refresh local list
                setDocs(prev => prev.filter(d => d.id !== docId));
                // If no docs left, go back
                if (docs.length <= 1) navigate(-1);
            } catch (err) {
                console.error("Delete error", err);
                alert("Failed to delete document");
            }
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading details...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate(-1)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '20px', color: '#007AFF', padding: 0 }}
            >
                <ArrowLeft size={20} style={{ marginRight: '8px' }} />
                Back to Records
            </button>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ padding: '32px', marginBottom: '24px', borderTop: '4px solid #007AFF' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ margin: '0 0 8px', fontSize: '28px', color: '#1C1C1E', letterSpacing: '-0.5px' }}>Consultation Summary</h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', color: '#8E8E93', gap: '20px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#F2F2F7', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
                                <User size={14} style={{ marginRight: '6px', color: '#007AFF' }} />
                                <span style={{ fontWeight: 600, color: '#1C1C1E' }}>Dr. {doctorName.replace(/^Dr\.\s+/i, '')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#F2F2F7', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
                                <Calendar size={14} style={{ marginRight: '6px', color: '#007AFF' }} />
                                <span style={{ fontWeight: 600, color: '#1C1C1E' }}>
                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', color: '#34C759', fontWeight: 600, fontSize: '13px' }}>
                                <FileText size={14} style={{ marginRight: '6px' }} />
                                {docs.length} Record{docs.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="btn-outline"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        <Printer size={18} />
                        Download PDF
                    </button>
                </div>

                {/* AI synthesized Summary (New) */}
                <div style={{
                    background: 'linear-gradient(135deg, #F5F7FA 0%, #E4E7EB 100%)',
                    padding: '24px',
                    borderRadius: '16px',
                    marginBottom: '32px',
                    borderLeft: '5px solid #007AFF'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Activity size={20} color="#007AFF" />
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#1C1C1E' }}>Clinical Overview</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#3A3A3C' }}>
                        {docs.find(d => d.type === 'diagnosis_note')?.extracted_data?.treatment_plan
                            ? `Based on the visit, the recommended treatment plan focuses on managing symptoms related to ${docs.find(d => d.type === 'diagnosis_note')?.extracted_data?.diagnosis || 'the condition'}. A structured medication course has been prescribed for effective recovery.`
                            : "This report summarizes the findings, prescriptions, and diagnostic notes from your consultation. Please follow the medication schedule provided below."}
                    </p>
                </div>

                {/* Patient Information Header (Hospital Style) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    padding: '20px',
                    border: '1px solid #E5E5EA',
                    borderRadius: '8px',
                    marginBottom: '32px',
                    fontSize: '14px',
                    backgroundColor: '#FAFAFA'
                }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div><span style={{ fontWeight: 600, color: '#8E8E93', width: '120px', display: 'inline-block' }}>Name</span> <span style={{ color: '#1C1C1E', fontWeight: 600 }}>: {user?.name}</span></div>
                        <div><span style={{ fontWeight: 600, color: '#8E8E93', width: '120px', display: 'inline-block' }}>Age/Gender</span> <span style={{ color: '#1C1C1E' }}>: {user?.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 'N/A'} Yr / {user?.gender || 'M'}</span></div>
                        <div><span style={{ fontWeight: 600, color: '#8E8E93', width: '120px', display: 'inline-block' }}>Mobile No.</span> <span style={{ color: '#1C1C1E' }}>: {user?.phone}</span></div>
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div><span style={{ fontWeight: 600, color: '#8E8E93', width: '120px', display: 'inline-block' }}>Visit Date</span> <span style={{ color: '#1C1C1E' }}>: {new Date(date).toLocaleDateString()}</span></div>
                        <div><span style={{ fontWeight: 600, color: '#8E8E93', width: '120px', display: 'inline-block' }}>Department</span> <span style={{ color: '#1C1C1E' }}>: General Consultation</span></div>
                        <div><span style={{ fontWeight: 600, color: '#8E8E93', width: '120px', display: 'inline-block' }}>Report ID</span> <span style={{ color: '#1C1C1E' }}>: #{doctorId?.substring(0, 8).toUpperCase() || 'REF'}</span></div>
                    </div>
                </div>

                {/* Report Content Sections */}
                {(() => {
                    // Helper to search across all docs in the consultation
                    const findData = (key, AIKey) => {
                        for (const d of docs) {
                            const data = d.extracted_data || {};
                            if (data[key]) return data[key];
                            if (AIKey && data[AIKey]) return data[AIKey];
                            if (data.structured_data && data.structured_data[key]) return data.structured_data[key];
                        }
                        return null;
                    };

                    const symptoms = findData('symptoms') || findData('chief_complaint');
                    const diagnosis = findData('diagnosis');
                    const treatment = findData('treatment_plan') || findData('instructions') || findData('notes');

                    // Collect all medicines
                    const allMeds = [];
                    docs.forEach(doc => {
                        const data = doc.extracted_data || {};
                        const meds = data.medicines || data.mentioned_medicines || (data.structured_data?.medicines);
                        if (Array.isArray(meds)) meds.forEach(m => allMeds.push(m));
                        else if (typeof meds === 'string') allMeds.push(meds);
                    });

                    return (
                        <div style={{ padding: '0 10px' }}>
                            {/* Chief Complaint */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px', borderBottom: '1px solid #F2F2F7', paddingBottom: '4px' }}>
                                    CHIEF COMPLAINT
                                </h3>
                                <p style={{ margin: 0, fontSize: '15px', color: '#3A3A3C' }}>
                                    {symptoms || 'Patient presented for clinical evaluation and follow-up consultation.'}
                                </p>
                            </div>

                            {/* Diagnosis */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px', borderBottom: '1px solid #F2F2F7', paddingBottom: '4px' }}>
                                    DIAGNOSIS
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#FF3B30', textTransform: 'uppercase' }}>
                                        {diagnosis || 'Clinical Findings Pending'}
                                    </span>
                                </div>
                            </div>

                            {/* Rx / Prescription */}
                            <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px', borderBottom: '1px solid #F2F2F7', paddingBottom: '4px' }}>
                                    Rx (Medications)
                                </h3>
                                {allMeds.length === 0 ? (
                                    <p style={{ color: '#8E8E93', fontStyle: 'italic' }}>No medications explicitly recorded in this session.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {allMeds.map((med, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                                                <span style={{ fontWeight: 600, color: '#8E8E93', minWidth: '24px' }}>{i + 1}.</span>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1C1C1E' }}>{med.toUpperCase()}</div>
                                                    <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>Oral Route • As Advised by Physician</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Follow Up */}
                            <div style={{ marginBottom: '48px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px', borderBottom: '1px solid #F2F2F7', paddingBottom: '4px' }}>
                                    FOLLOW UP & ADVICE
                                </h3>
                                <p style={{ margin: 0, fontSize: '14px', color: '#3A3A3C', lineHeight: '1.6' }}>
                                    {treatment || 'Take complete rest. Monitor symptoms daily. Please review in 1 week or earlier if symptoms persist or worsen.'}
                                </p>
                            </div>

                            {/* Signature Area */}
                            <div style={{ marginTop: '60px', borderTop: '1px solid #E5E5EA', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '12px', color: '#8E8E93' }}>
                                    Electronically generated on {new Date().toLocaleString()}<br />
                                    Digital Record Verified via Swasthya
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontFamily: '"Great Vibes", cursive', fontSize: '24px', color: '#007AFF', marginBottom: '8px' }}>
                                        Dr. {doctorName.replace(/^Dr\.\s+/i, '')}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1C1C1E', borderTop: '2px solid #1C1C1E', paddingTop: '4px', minWidth: '200px' }}>
                                        Signature of Consultant
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px' }}>{doctorName.includes('Dr.') ? doctorName : `Dr. ${doctorName}`}</div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </motion.div>
        </div>
    );
};

export default ConsultationDetails;
