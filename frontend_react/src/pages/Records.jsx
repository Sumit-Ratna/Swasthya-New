import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader, AlertCircle, CheckCircle, Volume2, PlayCircle, Trash2, ChevronDown, ChevronUp, ChevronRight, Stethoscope } from 'lucide-react';
import MedicalExplainerVideo from '../components/MedicalExplainerVideo';

const Records = ({ viewingPatientId }) => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [explainerStoryboard, setExplainerStoryboard] = useState(null);
    const [showExplainer, setShowExplainer] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [manualMedicine, setManualMedicine] = useState('');
    const [generatingExplainer, setGeneratingExplainer] = useState(false);
    const [connectedDoctors, setConnectedDoctors] = useState([]);
    const [sharingModalDoc, setSharingModalDoc] = useState(null); // Track which doc is being shared
    const [expandedVisits, setExpandedVisits] = useState({});
    const [reportText, setReportText] = useState('');
    const [analyzingText, setAnalyzingText] = useState(false);

    // Target User: Either the family member being viewed, or the logged-in user
    const targetUserId = viewingPatientId || user?.id;

    const toggleVisit = (key) => {
        setExpandedVisits(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    useEffect(() => {
        if (targetUserId) {
            fetchDocuments();
            // Fetch doctors linked to the LOGGED-IN user (parent), 
            // so they can share family reports with THEIR doctors.
            if (user?.id) fetchConnectedDoctors();
        }
    }, [user, targetUserId]);

    const fetchConnectedDoctors = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/connect/patient/doctors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConnectedDoctors(res.data);
        } catch (err) {
            console.error('Error fetching doctors:', err);
        }
    };

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`/api/documents/patient/${targetUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(res.data);
        } catch (err) {
            console.error("Fetch docs error", err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setError(null);
        setAnalysis(null);

        // Validate file type
        if (selectedFile) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!validTypes.includes(selectedFile.type)) {
                setError('Please upload an image (JPG, PNG) or PDF file');
                setFile(null);
            }
        }
    };

    const handleUpload = async (shouldAnalyze = false) => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        if (!user?.id) {
            setError('User not authenticated');
            return;
        }

        setUploading(true);
        setAnalysis(null);
        setError(null);

        const formData = new FormData();
        formData.append('report', file);
        formData.append('patient_id', targetUserId); // Use target user (e.g. child)
        formData.append('analyze', shouldAnalyze);

        try {
            console.log(`Uploading file ${shouldAnalyze ? '(with analysis)' : ''}...`, file.name);
            const res = await axios.post('/api/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
            });

            console.log('Upload response:', res.data);
            if (res.data.analysis) {
                setAnalysis(res.data.analysis);
            }
            fetchDocuments(); // Refresh list
            setFile(null);
            // Reset file input
            if (document.getElementById('file-input')) {
                document.getElementById('file-input').value = '';
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleShareUpdate = async (docId, doctorIds) => {
        try {
            await axios.patch(`/api/documents/${docId}/share`, {
                doctor_ids: doctorIds
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            fetchDocuments(); // Refresh to update UI
            setSharingModalDoc(null);
        } catch (err) {
            console.error("Share error", err);
            alert("Failed to update sharing settings");
        }
    };

    const handleDelete = async (docId, isShared) => {
        const warning = isShared
            ? "⚠️ This report is currently shared with your doctor.\n\nDeleting it will also remove their access and they won't be able to see it in their portal anymore.\n\nAre you sure you want to permanently delete this file?"
            : "Are you sure you want to permanently delete this file?";

        if (window.confirm(warning)) {
            try {
                await axios.delete(`/api/documents/${docId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                fetchDocuments(); // Refresh list
                alert("File deleted successfully");
            } catch (err) {
                console.error("Delete error", err);
                alert("Failed to delete document");
            }
        }
    };

    const handleAnalyzeText = async () => {
        if (!reportText.trim()) {
            setError('Please paste your report text first.');
            return;
        }

        setAnalyzingText(true);
        setAnalysis(null);
        setError(null);

        try {
            console.log("Analyzing direct text input...");
            const token = localStorage.getItem('accessToken');
            const res = await axios.post('/api/ai/analyze-text', {
                report_text: reportText
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Text analysis response:', res.data);
            if (res.data.summary_text) {
                setAnalysis(res.data);
                alert("Text Analysis Complete!");
            }
        } catch (err) {
            console.error('Text analysis error:', err);
            setError(err.response?.data?.error || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzingText(false);
        }
    };

    const handleAnalyze = async (docId) => {
        setUploading(true); // Reuse uploading state to show loading spinner
        try {
            console.log("Requesting AI analysis for doc:", docId);
            const res = await axios.post(`/api/documents/${docId}/analyze`, {}, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            console.log("Analysis result:", res.data);
            if (res.data.analysis) {
                setAnalysis(res.data.analysis);
            }
            fetchDocuments(); // Refresh to show new data
            alert("Analysis Complete!");
        } catch (err) {
            console.error("Analysis error", err);
            alert("Failed to analyze document. " + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateExplainer = async (medName) => {
        const medicine = medName || selectedMedicine || manualMedicine;
        if (!medicine) return;

        setGeneratingExplainer(true);
        setError(null);
        try {
            console.log("Generating explainer for:", medicine);
            // Ensure analysis is a plain object strings are parsed
            let contextData = analysis;
            if (typeof analysis === 'string') {
                try {
                    contextData = JSON.parse(analysis);
                } catch (e) {
                    contextData = { summary_text: analysis };
                }
            }

            const res = await axios.post('/api/ai/explainer', {
                medicine_name: medicine,
                patient_id: targetUserId,
                report_context: JSON.stringify(contextData || {})
            });

            console.log("Storyboard received:", res.data.storyboard);
            setExplainerStoryboard(res.data.storyboard);
            setShowExplainer(true);
        } catch (err) {
            console.error("Explainer error", err);
            const msg = err.response?.data?.error || err.message || "Failed to generate explainer video.";
            setError("Error: " + msg);
        } finally {
            setGeneratingExplainer(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 className="animate-enter">Health Records</h1>
                <p className="animate-enter" style={{ animationDelay: '0.1s', color: '#8E8E93' }}>
                    Upload lab reports and manage shared documents
                </p>
            </header>

            {/* Upload Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0 }}>Upload New Lab Report</h3>
                <div style={{ marginTop: '16px' }}>
                    <input
                        id="file-input"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px dashed #E5E5EA',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}
                    />
                    {file && (
                        <div style={{ fontSize: '12px', color: '#34C759', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                            <CheckCircle size={16} style={{ marginRight: '6px' }} />
                            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                            className="btn-outline"
                            onClick={() => handleUpload(false)}
                            disabled={uploading || !file}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
                        >
                            <Upload size={18} style={{ marginRight: '8px' }} />
                            Just Upload
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => handleUpload(true)}
                            disabled={uploading || !file}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
                        >
                            {uploading ? (
                                <Loader className="spin" size={18} />
                            ) : (
                                <>
                                    <CheckCircle size={18} style={{ marginRight: '8px' }} />
                                    Upload & Analyze
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Direct Text Analysis Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0 }}>Paste Report Text</h3>
                <p style={{ fontSize: '13px', color: '#8E8E93', marginBottom: '12px' }}>
                    Don't have an image? Paste your lab report text below for MedGemma analysis.
                </p>
                <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Paste your medical report text here..."
                    style={{
                        width: '100%',
                        height: '120px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E5EA',
                        background: '#F9F9F9',
                        marginBottom: '12px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none'
                    }}
                />
                <button
                    className="btn-primary"
                    onClick={handleAnalyzeText}
                    disabled={analyzingText || !reportText.trim()}
                    style={{
                        width: '100%',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#5856D6'
                    }}
                >
                    {analyzingText ? (
                        <Loader className="spin" size={18} />
                    ) : (
                        <>
                            <FileText size={18} style={{ marginRight: '8px' }} />
                            Analyze Text Note
                        </>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{ border: '2px solid #FF2D55', backgroundColor: '#FFF0F5', marginBottom: '24px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', color: '#FF2D55' }}>
                        <AlertCircle size={20} style={{ marginRight: '10px' }} />
                        <div>
                            <strong>Error</strong>
                            <div style={{ fontSize: '14px', marginTop: '4px' }}>{error}</div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Analysis Result */}
            {analysis && (
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ border: '2px solid #34C759', backgroundColor: '#F0FFF4', marginBottom: '24px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <CheckCircle size={24} color="#34C759" style={{ marginRight: '10px' }} />
                        <h3 style={{ color: '#34C759', margin: 0 }}>
                            {analysis?.mentions_medgemma ? "🏥 MedGemma Medical Analysis" : "✨ Gemini AI Analysis"}
                        </h3>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => {
                                    window.speechSynthesis.cancel();
                                }}
                                style={{ background: 'none', border: '1px solid #FF2D55', borderRadius: '8px', cursor: 'pointer', color: '#FF2D55', display: 'flex', alignItems: 'center', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}
                            >
                                Stop
                            </button>
                            <button
                                onClick={() => {
                                    window.speechSynthesis.cancel();
                                    // Use summary_text if available, otherwise fallback
                                    const text = analysis?.summary_text || (typeof analysis === 'string' ? analysis : JSON.stringify(analysis));
                                    const speech = new SpeechSynthesisUtterance(text);
                                    window.speechSynthesis.speak(speech);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34C759', display: 'flex', alignItems: 'center', fontWeight: 600 }}
                            >
                                <Volume2 size={20} style={{ marginRight: '6px' }} />
                                Listen
                            </button>
                        </div>
                    </div>
                    <div style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.7)',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.6'
                    }}>
                        {analysis?.summary_text || (typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2))}
                    </div>
                </motion.div>
            )}

            {/* Medical Explainer Section */}
            <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <PlayCircle size={24} color="#0A84FF" style={{ marginRight: '10px' }} />
                    <h3 style={{ margin: 0, color: 'white' }}>Understand Your Medicine</h3>
                </div>
                <p style={{ fontSize: '14px', color: '#AEAEB2', marginBottom: '16px' }}>
                    Select a medicine from your report or enter one manually to see how it works.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Medicine Dropdown (if available) */}
                    {analysis && (typeof analysis === 'object' || JSON.parse(analysis).mentioned_medicines) && (() => {
                        let meds = [];
                        try {
                            const data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
                            meds = data.mentioned_medicines || [];
                        } catch (e) { meds = []; }

                        if (meds.length > 0) {
                            return (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {meds.map((med, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedMedicine(med);
                                                handleGenerateExplainer(med);
                                            }}
                                            disabled={generatingExplainer}
                                            style={{
                                                background: selectedMedicine === med ? '#0A84FF' : 'rgba(255,255,255,0.1)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '20px',
                                                padding: '8px 16px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {generatingExplainer && selectedMedicine === med && <Loader size={14} className="spin" style={{ marginRight: '6px' }} />}
                                            {med}
                                        </button>
                                    ))}
                                </div>
                            );
                        }
                        return <div style={{ fontSize: '13px', color: '#636366', fontStyle: 'italic' }}>No medicines detected in report. Enter manually below.</div>;
                    })()}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <input
                            type="text"
                            value={manualMedicine}
                            onChange={(e) => setManualMedicine(e.target.value)}
                            placeholder="Type medicine name manually..."
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <button
                            className="btn-primary"
                            onClick={() => handleGenerateExplainer(manualMedicine)}
                            disabled={generatingExplainer || !manualMedicine}
                            style={{ background: '#32D74B', color: 'black', whiteSpace: 'nowrap', fontWeight: 600 }}
                        >
                            {generatingExplainer && !selectedMedicine ? 'Generating...' : 'Watch Video'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            {showExplainer && explainerStoryboard && (
                <MedicalExplainerVideo
                    storyboard={explainerStoryboard}
                    onClose={() => setShowExplainer(false)}
                />
            )}

            {/* Mock Trend Graph */}
            <motion.div
                className="card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ padding: '24px', marginBottom: '24px' }}
            >
                <h3 style={{ margin: '0 0 16px' }}>Health Trends (Demo)</h3>
                <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #E5E5EA' }}>
                    {[40, 60, 45, 80, 55, 70].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 0.2 + (i * 0.1), type: 'spring' }}
                            style={{ width: '12%', backgroundColor: i === 5 ? '#007AFF' : '#E1F0FF', borderRadius: '4px' }}
                        />
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#8E8E93' }}>
                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                </div>
            </motion.div>

            {/* Consultation History */}
            <h3 style={{ marginTop: '24px' }}>Consultation History</h3>
            {(() => {
                const clinicalDocs = documents.filter(doc => doc.type === 'prescription' || doc.type === 'diagnosis_note');

                if (clinicalDocs.length === 0) {
                    return (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                            <Stethoscope size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No clinical records yet</p>
                        </div>
                    );
                }

                // Group by Doctor + Date
                const visits = {};
                clinicalDocs.forEach(doc => {
                    const date = new Date(doc.createdAt).toLocaleDateString();
                    const docId = doc.extracted_data?.doctor_id;

                    // Resolve Doctor Name
                    let docName = doc.extracted_data?.doctor_name;
                    const linkedDoc = connectedDoctors.find(d => d.id == docId);

                    if ((!docName || docName === 'Dr. Unknown' || docName === 'Doctor') && linkedDoc) {
                        docName = linkedDoc.name;
                    }
                    if (!docName) docName = 'Dr. Unknown';

                    // Clean up doctor name
                    const cleanName = docName.replace(/^Dr\.\s+/i, '');

                    // Group Key: Use Doctor ID if available for routing
                    const routeDocId = docId || 'unknown';
                    // We need format YYYY-MM-DD for URL params ideally, or use exact string match
                    // Let's use ISO string date part for reliable URL
                    const dateURL = new Date(doc.createdAt).toISOString().split('T')[0];

                    const key = `${date}_${cleanName}`;

                    if (!visits[key]) visits[key] = {
                        displayDate: date,
                        urlDate: dateURL,
                        doctorName: cleanName,
                        doctorId: routeDocId,
                        docs: [],
                        timestamp: new Date(doc.createdAt)
                    };
                    visits[key].docs.push(doc);
                });

                return Object.entries(visits)
                    .sort(([, a], [, b]) => b.timestamp - a.timestamp)
                    .map(([key, visit], idx) => (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="card"
                            style={{ marginBottom: '16px', overflow: 'hidden', border: '1px solid #E5E5EA' }}
                        >
                            <div
                                onClick={() => navigate(`/consultation/${visit.urlDate}/${visit.doctorId}`)}
                                style={{
                                    padding: '16px',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: '#E1F0FF',
                                        color: '#007AFF',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginRight: '16px', fontSize: '18px', fontWeight: 'bold',
                                        transition: 'all 0.3s'
                                    }}>
                                        {visit.doctorName[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '16px', color: '#1C1C1E' }}>Dr. {visit.doctorName}</div>
                                        <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>
                                            Visited on {visit.displayDate} • {visit.docs.length} Record{visit.docs.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', color: '#007AFF', fontSize: '13px', fontWeight: 600 }}>
                                    View Details <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                                </div>
                            </div>
                        </motion.div>
                    ));
            })()}

            {/* Uploaded Lab Reports */}
            <h3 style={{ marginTop: '24px' }}>Your Lab Reports & Prescriptions</h3>
            {
                documents.filter(doc => doc.type === 'lab_report' || doc.type === 'prescription').length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                        <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No reports uploaded yet</p>
                    </div>
                ) : (
                    documents.filter(doc => doc.type === 'lab_report' || doc.type === 'prescription').map((doc, index) => (
                        <motion.div
                            key={doc.id}
                            className="card"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '16px', marginBottom: '12px' }}
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: doc.type === 'prescription' ? '#34C759' : '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '16px' }}>
                                <FileText size={24} />
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '15px' }}>
                                    {doc.type === 'prescription' ? 'Prescription Report' : 'Lab Report'}
                                </div>
                                <div style={{ fontSize: '13px', color: '#8E8E93', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>
                                        {new Date(doc.createdAt).toLocaleDateString()} <span style={{ color: '#ccc' }}>|</span> {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span>•</span>
                                    <span style={{
                                        color: doc.shared_with?.length > 0 ? '#34C759' : '#8E8E93',
                                        fontWeight: 500,
                                        background: doc.shared_with?.length > 0 ? '#E8FCE8' : '#F2F2F7',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px'
                                    }}>
                                        {doc.shared_with?.length > 0 ? `Shared (${doc.shared_with.length})` : 'Private'}
                                    </span>
                                    {doc.extracted_data && (
                                        <span style={{
                                            background: '#E1F0FF', color: '#007AFF',
                                            padding: '2px 8px', borderRadius: '4px',
                                            fontSize: '11px', fontWeight: 600
                                        }}>
                                            AI Analyzed
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginLeft: '16px',
                                alignItems: 'flex-end',
                                minWidth: 'fit-content'
                            }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => window.open(`/${doc.file_url}`, '_blank')}
                                        disabled={!doc.file_url}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            background: '#E1F0FF',
                                            border: 'none',
                                            cursor: doc.file_url ? 'pointer' : 'not-allowed',
                                            color: '#007AFF',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            height: '32px'
                                        }}
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => setSharingModalDoc(doc)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            background: '#F2F2F7',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#333',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            height: '32px'
                                        }}
                                    >
                                        Share
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleAnalyze(doc.id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            background: '#34C759',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            height: '32px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        Analyze
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc.id, doc.shared_with?.length > 0 || doc.is_shared)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: '#FFF0F0',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#FF3B30',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Delete report"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )
            }
            {/* Sharing Modal */}
            {sharingModalDoc && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card"
                        style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
                    >
                        <h3 style={{ marginTop: 0 }}>Share with Doctors</h3>
                        <p style={{ fontSize: '14px', color: '#8E8E93', marginBottom: '20px' }}>
                            Select the doctors who can view this report.
                        </p>

                        {connectedDoctors.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#8E8E93', padding: '20px' }}>
                                No connected doctors found. Link a doctor first.
                            </p>
                        ) : (
                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
                                {connectedDoctors.map(doctor => {
                                    const isSelected = sharingModalDoc.shared_with?.includes(doctor.id);
                                    // Check if this doctor is the Uploader
                                    const isUploader = sharingModalDoc.extracted_data?.doctor_id === doctor.id;

                                    return (
                                        <div
                                            key={doctor.id}
                                            onClick={() => {
                                                if (isUploader) return; // Prevent unsharing if uploader
                                                const currentShared = sharingModalDoc.shared_with || [];
                                                const newShared = isSelected
                                                    ? currentShared.filter(id => id !== doctor.id)
                                                    : [...currentShared, doctor.id];
                                                setSharingModalDoc({ ...sharingModalDoc, shared_with: newShared });
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', padding: '12px',
                                                borderRadius: '12px', marginBottom: '8px', cursor: isUploader ? 'not-allowed' : 'pointer',
                                                backgroundColor: isSelected ? '#F2F2F7' : 'transparent',
                                                border: isSelected ? '1px solid #007AFF' : '1px solid #E5E5EA',
                                                opacity: isUploader ? 0.7 : 1
                                            }}
                                        >
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                backgroundColor: '#E1F0FF', marginRight: '12px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '16px', fontWeight: 'bold', color: '#007AFF'
                                            }}>
                                                {doctor.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                                    {doctor.name} {isUploader && <span style={{ fontSize: '10px', color: '#FF9500', marginLeft: '5px' }}>(Uploader)</span>}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#8E8E93' }}>{doctor.specialization}</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                disabled={isUploader}
                                                style={{ width: '20px', height: '20px' }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button
                                className="btn-outline"
                                onClick={() => setSharingModalDoc(null)}
                                style={{ padding: '12px' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => handleShareUpdate(sharingModalDoc.id, sharingModalDoc.shared_with || [])}
                                style={{ padding: '12px' }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div >
    );
};

export default Records;
