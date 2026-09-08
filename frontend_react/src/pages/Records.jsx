import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Upload, FileText, Loader, AlertCircle, CheckCircle, Volume2, 
    PlayCircle, Trash2, ChevronDown, ChevronUp, ChevronRight, 
    Stethoscope, Search, Sparkles, BookOpen, Pill, Clock, ArrowRight 
} from 'lucide-react';
import MedicalExplainerVideo from '../components/MedicalExplainerVideo';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Records = ({ viewingPatientId, defaultTab }) => {
    const { user } = useContext(AuthContext);
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Tab state: 'ocr' (Lab Report OCR & Diagnostics), 'medicines' (Medicine Explainer & Videos), 'history' (Saved Documents & History)
    const [activeTab, setActiveTab] = useState(defaultTab || searchParams.get('tab') || 'ocr');

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    
    // Medicine Explainer States
    const [explainerStoryboard, setExplainerStoryboard] = useState(null);
    const [showExplainer, setShowExplainer] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [generatingExplainer, setGeneratingExplainer] = useState(false);
    const [prescribedMedicines, setPrescribedMedicines] = useState([]);

    const [connectedDoctors, setConnectedDoctors] = useState([]);
    const [sharingModalDoc, setSharingModalDoc] = useState(null);
    const [reportText, setReportText] = useState('');
    const [analyzingText, setAnalyzingText] = useState(false);

    // Target User: Either the family member being viewed, or the logged-in user
    const targetUserId = viewingPatientId || user?.id;

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'medicines' || tabParam === 'explainer') {
            setActiveTab('medicines');
        } else if (tabParam === 'history' || tabParam === 'records') {
            navigate('/medical-history');
        } else {
            setActiveTab('ocr');
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        if (targetUserId) {
            fetchDocuments();
            if (user?.id) fetchConnectedDoctors();
        }
    }, [user, targetUserId]);

    // Extract prescribed medicines across all documents for fast explainer lookup
    useEffect(() => {
        const meds = new Set();
        documents.forEach(doc => {
            if (doc.type === 'prescription' && doc.extracted_data?.medicines) {
                doc.extracted_data.medicines.forEach(m => {
                    const name = typeof m === 'string' ? m.split(' ')[0] : m?.name;
                    if (name) meds.add(name);
                });
            }
            if (doc.extracted_data?.mentioned_medicines) {
                doc.extracted_data.mentioned_medicines.forEach(m => {
                    const name = typeof m === 'string' ? m.split(' ')[0] : m?.name;
                    if (name) meds.add(name);
                });
            }
        });
        setPrescribedMedicines(Array.from(meds));
    }, [documents]);

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
        formData.append('patient_id', targetUserId);
        formData.append('analyze', shouldAnalyze);

        try {
            const res = await axios.post('/api/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
            });

            if (res.data.analysis) {
                setAnalysis(res.data.analysis);
            }
            fetchDocuments();
            setFile(null);
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
            fetchDocuments();
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
                fetchDocuments();
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
            const token = localStorage.getItem('accessToken');
            const res = await axios.post('/api/ai/analyze-text', {
                report_text: reportText
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.summary_text) {
                setAnalysis(res.data);
            }
        } catch (err) {
            console.error('Text analysis error:', err);
            setError(err.response?.data?.error || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzingText(false);
        }
    };

    const handleAnalyze = async (docId) => {
        setUploading(true);
        try {
            const res = await axios.post(`/api/documents/${docId}/analyze`, {}, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            if (res.data.analysis) {
                setAnalysis(res.data.analysis);
                setActiveTab('ocr');
            }
            fetchDocuments();
        } catch (err) {
            console.error("Analysis error", err);
            alert("Failed to analyze document. " + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateExplainer = async (medicineName) => {
        const targetMedicine = medicineName || searchTerm || selectedMedicine;
        if (!targetMedicine || !targetMedicine.trim()) {
            setError("Please specify a medicine name.");
            return;
        }

        setGeneratingExplainer(true);
        setSelectedMedicine(targetMedicine);
        setError(null);

        try {
            let contextData = analysis;
            if (typeof analysis === 'string') {
                try {
                    contextData = JSON.parse(analysis);
                } catch (e) {
                    contextData = { summary_text: analysis };
                }
            }

            const res = await axios.post('/api/ai/explainer', {
                medicine_name: targetMedicine,
                patient_id: targetUserId || 'guest',
                report_context: JSON.stringify(contextData || {
                    summary_text: `Patient is learning about ${targetMedicine}. Provide dosage, purpose, and precautions.`
                })
            });

            if (res.data?.storyboard) {
                setExplainerStoryboard(res.data.storyboard);
                setShowExplainer(true);
            } else {
                throw new Error("Invalid storyboard response from server");
            }
        } catch (err) {
            console.error("Explainer error", err);
            const msg = err.response?.data?.error || err.message || "Failed to generate explainer video.";
            setError("Explainer Error: " + msg);
        } finally {
            setGeneratingExplainer(false);
        }
    };

    const popularMedicines = [
        "Paracetamol", "Amoxicillin", "Ibuprofen", "Metformin", 
        "Amlodipine", "Omeprazole", "Azithromycin", "Pantoprazole"
    ];

    return (
        <div style={{ padding: '20px 16px 120px 16px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Header */}
            <header style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.5px'
                    }}>
                        MEDGEMMA AI UNIFIED
                    </span>
                </div>
                <h1 style={{ margin: '4px 0', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary, #111827)' }}>
                    Lab Report OCR & Medicine Explainer
                </h1>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '13.5px' }}>
                    Automated report scanning, diagnostic AI breakdown, and visual dosage explainer videos in one unified hub.
                </p>
            </header>

            {/* Segmented Tab Bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                background: '#e2e8f0',
                padding: '4px',
                borderRadius: '14px',
                marginBottom: '22px'
            }}>
                <button
                    onClick={() => setActiveTab('ocr')}
                    style={{
                        padding: '11px 12px',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: activeTab === 'ocr' ? '#ffffff' : 'transparent',
                        color: activeTab === 'ocr' ? '#7c3aed' : '#475569',
                        boxShadow: activeTab === 'ocr' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <FileText size={16} />
                    <span>{t('tabOcr', 'Report OCR')}</span>
                </button>

                <button
                    onClick={() => setActiveTab('medicines')}
                    style={{
                        padding: '11px 12px',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: activeTab === 'medicines' ? '#ffffff' : 'transparent',
                        color: activeTab === 'medicines' ? '#d97706' : '#475569',
                        boxShadow: activeTab === 'medicines' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Pill size={16} />
                    <span>{t('tabMedicines', 'Medicine Explainer')}</span>
                </button>
            </div>

            {/* Error Message Notification */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        marginBottom: '20px',
                        color: '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px'
                    }}
                >
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>{error}</div>
                    <button 
                        onClick={() => setError(null)} 
                        style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}
                    >
                        ✕
                    </button>
                </motion.div>
            )}

            {/* TAB 1: LAB REPORT OCR & DIAGNOSTIC ANALYZER */}
            {activeTab === 'ocr' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    {/* Upload Card */}
                    <div className="card" style={{ marginBottom: '20px', padding: '18px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                                <Upload size={17} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Upload Lab Report / Prescription</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Supports scanned JPG, PNG photos or multi-page PDF documents</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '14px' }}>
                            <input
                                id="file-input"
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*,.pdf"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '12px',
                                    marginBottom: '12px',
                                    background: '#f8fafc',
                                    fontSize: '13px'
                                }}
                            />

                            {file && (
                                <div style={{ fontSize: '12.5px', color: '#15803d', marginBottom: '12px', display: 'flex', alignItems: 'center', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px' }}>
                                    <CheckCircle size={15} style={{ marginRight: '6px' }} />
                                    <span>Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button
                                    onClick={() => handleUpload(false)}
                                    disabled={uploading || !file}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '11px',
                                        background: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        color: '#334155',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: file && !uploading ? 'pointer' : 'not-allowed',
                                        opacity: file && !uploading ? 1 : 0.6
                                    }}
                                >
                                    <Upload size={15} style={{ marginRight: '6px' }} />
                                    Just Upload
                                </button>
                                
                                <button
                                    onClick={() => handleUpload(true)}
                                    disabled={uploading || !file}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '11px',
                                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: file && !uploading ? 'pointer' : 'not-allowed',
                                        boxShadow: file && !uploading ? '0 3px 10px rgba(124, 58, 237, 0.35)' : 'none',
                                        opacity: file && !uploading ? 1 : 0.6
                                    }}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader className="spin" size={15} style={{ marginRight: '6px' }} />
                                            Scanning with OCR...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={15} style={{ marginRight: '6px' }} />
                                            Upload & AI Analyze
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Direct Text Analyzer Option */}
                    <div className="card" style={{ marginBottom: '20px', padding: '18px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                            Paste Medical / Prescription Text Directly
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                            No digital image available? Paste prescription notes or lab values for immediate MedGemma extraction.
                        </p>
                        <textarea
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="e.g. CBC test: Hemoglobin 11.2 g/dL, WBC 11,500 /uL. Prescribed: Tab Amoxicillin 500mg TDS x 5 days, Paracetamol 650mg SOS..."
                            style={{
                                width: '100%',
                                height: '90px',
                                padding: '10px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                marginBottom: '10px',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                resize: 'none',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleAnalyzeText}
                            disabled={analyzingText || !reportText.trim()}
                            style={{
                                width: '100%',
                                padding: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: reportText.trim() && !analyzingText ? 'pointer' : 'not-allowed',
                                opacity: reportText.trim() && !analyzingText ? 1 : 0.6
                            }}
                        >
                            {analyzingText ? (
                                <>
                                    <Loader className="spin" size={15} style={{ marginRight: '6px' }} />
                                    Analyzing Text Notes...
                                </>
                            ) : (
                                <>
                                    <FileText size={15} style={{ marginRight: '6px' }} />
                                    Analyze Medical Text Notes
                                </>
                            )}
                        </button>
                    </div>

                    {/* AI Analysis Result & Explainer Bridge */}
                    {analysis && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                border: '1px solid #86efac',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '16px',
                                padding: '18px',
                                marginBottom: '20px',
                                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.08)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={22} color="#16a34a" />
                                    <h3 style={{ color: '#15803d', margin: 0, fontSize: '16px', fontWeight: 800 }}>
                                        {analysis?.mentions_medgemma ? "MedGemma Clinical Analysis" : "Diagnostic AI Summary"}
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => window.speechSynthesis.cancel()}
                                        style={{
                                            background: '#ffffff',
                                            border: '1px solid #fca5a5',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#dc2626',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 700
                                        }}
                                    >
                                        Stop Audio
                                    </button>
                                    <button
                                        onClick={() => {
                                            window.speechSynthesis.cancel();
                                            const text = analysis?.summary_text || (typeof analysis === 'string' ? analysis : JSON.stringify(analysis));
                                            const speech = new SpeechSynthesisUtterance(text);
                                            window.speechSynthesis.speak(speech);
                                        }}
                                        style={{
                                            background: '#16a34a',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 12px',
                                            fontSize: '11.5px',
                                            fontWeight: 700
                                        }}
                                    >
                                        <Volume2 size={14} /> Listen
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                whiteSpace: 'pre-wrap',
                                fontSize: '13.5px',
                                background: 'rgba(255,255,255,0.9)',
                                padding: '14px',
                                borderRadius: '12px',
                                lineHeight: '1.6',
                                color: '#1e293b',
                                border: '1px solid #bbf7d0',
                                marginBottom: '14px'
                            }}>
                                {analysis?.summary_text || (typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2))}
                            </div>

                            {/* Detected Medicines Quick Bridge */}
                            {(() => {
                                let detectedMeds = [];
                                try {
                                    const parsed = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
                                    if (parsed?.mentioned_medicines) detectedMeds = parsed.mentioned_medicines;
                                } catch (e) {
                                    // fallback regex match
                                }

                                if (detectedMeds && detectedMeds.length > 0) {
                                    return (
                                        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
                                                <Pill size={14} /> Medicines Detected in Report — Watch Visual Guide:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {detectedMeds.map((med, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleGenerateExplainer(med)}
                                                        disabled={generatingExplainer}
                                                        style={{
                                                            background: '#fef3c7',
                                                            border: '1px solid #f59e0b',
                                                            borderRadius: '8px',
                                                            padding: '6px 12px',
                                                            fontSize: '12.5px',
                                                            fontWeight: 700,
                                                            color: '#92400e',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        <PlayCircle size={13} color="#d97706" />
                                                        {med}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* TAB 2: MEDICINE EXPLAINER & ANIMATED VIDEO GENERATOR */}
            {activeTab === 'medicines' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    
                    {/* Search / Generate Medicine Explainer */}
                    <div className="card" style={{
                        marginBottom: '22px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                        color: 'white',
                        borderRadius: '18px',
                        boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <PlayCircle size={22} color="#fbbf24" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'white' }}>
                                    Medicine Visual Storyboard Explainer
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#c7d2fe' }}>
                                    Generate dynamic, animated step-by-step dosage videos & safety precautions
                                </p>
                            </div>
                        </div>

                        {/* Search Input Bar */}
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
                                <input
                                    type="text"
                                    placeholder="Enter medicine name (e.g. Paracetamol, Amoxicillin, Metformin)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateExplainer(searchTerm)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 42px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontSize: '14px',
                                        outline: 'none',
                                        background: 'rgba(255,255,255,0.12)',
                                        color: '#ffffff',
                                        fontWeight: 500
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => handleGenerateExplainer(searchTerm)}
                                disabled={generatingExplainer || !searchTerm.trim()}
                                style={{
                                    marginTop: '12px',
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: searchTerm.trim() && !generatingExplainer ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
                                    opacity: searchTerm.trim() && !generatingExplainer ? 1 : 0.65
                                }}
                            >
                                {generatingExplainer ? (
                                    <>
                                        <Loader className="spin" size={18} />
                                        Generating Visual Explainer Video...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle size={18} />
                                        Watch Explainer Video
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Prescribed Medicines from OCR & Care Records */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#1e293b' }}>
                                Your Prescriptions & Scanned Meds
                            </h3>
                            <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                                Extracted from OCR
                            </span>
                        </div>

                        {prescribedMedicines.length === 0 ? (
                            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                No medicines found in prescriptions yet. Upload a prescription in the OCR tab or choose from popular medicines below.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                                {prescribedMedicines.map((med, idx) => (
                                    <motion.button
                                        key={idx}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => {
                                            setSearchTerm(med);
                                            handleGenerateExplainer(med);
                                        }}
                                        style={{
                                            background: '#f0fdf4',
                                            border: '1px solid #86efac',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            fontSize: '13.5px',
                                            fontWeight: 700,
                                            color: '#166534',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        <span>{med}</span>
                                        <PlayCircle size={15} color="#16a34a" />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Popular Medicines Catalog */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: '15.5px', fontWeight: 700, color: '#1e293b' }}>
                            Popular & Essential Medicines Catalog
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                            {popularMedicines.map((med, idx) => (
                                <motion.button
                                    key={idx}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                        setSearchTerm(med);
                                        handleGenerateExplainer(med);
                                    }}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        fontSize: '13.5px',
                                        fontWeight: 600,
                                        color: '#334155',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <span>{med}</span>
                                    <ArrowRight size={14} color="#94a3b8" />
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}



            {/* Video Modal */}
            {showExplainer && explainerStoryboard && (
                <MedicalExplainerVideo
                    storyboard={explainerStoryboard}
                    onClose={() => setShowExplainer(false)}
                />
            )}

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
                        style={{ width: '100%', maxWidth: '400px', padding: '22px', background: '#ffffff', borderRadius: '16px' }}
                    >
                        <h3 style={{ marginTop: 0, fontSize: '17px', fontWeight: 800 }}>Share with Doctors</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                            Select registered doctors to grant secure viewing access to this record.
                        </p>

                        {connectedDoctors.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '16px', fontSize: '13px' }}>
                                No connected doctors found. Link a doctor in Care Team first.
                            </p>
                        ) : (
                            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px' }}>
                                {connectedDoctors.map(doctor => {
                                    const isSelected = sharingModalDoc.shared_with?.includes(doctor.id);
                                    const isUploader = sharingModalDoc.extracted_data?.doctor_id === doctor.id;

                                    return (
                                        <div
                                            key={doctor.id}
                                            onClick={() => {
                                                if (isUploader) return;
                                                const currentShared = sharingModalDoc.shared_with || [];
                                                const newShared = isSelected
                                                    ? currentShared.filter(id => id !== doctor.id)
                                                    : [...currentShared, doctor.id];
                                                setSharingModalDoc({ ...sharingModalDoc, shared_with: newShared });
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', padding: '10px 12px',
                                                borderRadius: '10px', marginBottom: '6px',
                                                cursor: isUploader ? 'not-allowed' : 'pointer',
                                                backgroundColor: isSelected ? '#e0f2fe' : '#f8fafc',
                                                border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                                                opacity: isUploader ? 0.7 : 1
                                            }}
                                        >
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '50%',
                                                backgroundColor: '#bae6fd', marginRight: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '14px', fontWeight: 'bold', color: '#0369a1'
                                            }}>
                                                {doctor.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                                                    {doctor.name} {isUploader && <span style={{ fontSize: '10px', color: '#d97706' }}>(Uploader)</span>}
                                                </div>
                                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>{doctor.specialization}</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                disabled={isUploader}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                onClick={() => setSharingModalDoc(null)}
                                style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleShareUpdate(sharingModalDoc.id, sharingModalDoc.shared_with || [])}
                                style={{ padding: '10px', borderRadius: '10px', border: 'none', background: '#0284c7', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
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

export default Records;
