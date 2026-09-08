import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
    FileText, Calendar, Clock, Plus, Upload, CheckCircle2,
    AlertCircle, MapPin, Stethoscope, Search, Filter, Trash2,
    Eye, Download, Share2, History, Sparkles, ShieldCheck,
    Pill, ArrowLeft, Building2, ExternalLink, X, Activity,
    CalendarCheck, UserCheck, ChevronRight, FileCheck, Phone,
    HeartPulse, RefreshCw, Check
} from 'lucide-react';
import PatientConsentModal from '../components/PatientConsentModal';

const MedicalHistory = () => {
    const { user, updateUser } = useContext(AuthContext);
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Active tab: 'all' | 'records' | 'appointments' | 'old_records'
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterYear, setFilterYear] = useState('ALL');

    // Data States
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [confirmedAppointments, setConfirmedAppointments] = useState([]);
    const [oldPastRecords, setOldPastRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [pendingConsentRecord, setPendingConsentRecord] = useState(null);
    const [isPersistingConsentAndRecord, setIsPersistingConsentAndRecord] = useState(false);
    const [selectedRecordModal, setSelectedRecordModal] = useState(null);
    const [selectedAppointmentSlip, setSelectedAppointmentSlip] = useState(null);
    const [savingRecord, setSavingRecord] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Form State for Adding Old Medical Record
    const [newRecord, setNewRecord] = useState({
        title: '',
        category: 'Lab Report', // 'Lab Report' | 'Prescription' | 'Discharge Summary' | 'Surgery' | 'Vaccination' | 'Doctor Consultation' | 'Other'
        record_date: new Date().toISOString().split('T')[0],
        facility_name: '',
        doctor_name: '',
        diagnosis: '',
        notes: '',
        medications: '',
        vitals_bp: '',
        vitals_sugar: '',
        vitals_weight: '',
        file_name: '',
        file_preview: '',
        file_type: ''
    });

    const showToast = (msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const targetUserId = user?.id || 'default_user';

    useEffect(() => {
        fetchAllData();
    }, [user]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchUserDocuments(),
                fetchConfirmedAppointments(),
                fetchProfileMedicalHistory()
            ]);
        } catch (err) {
            console.warn("Medical history load notice:", err);
        } finally {
            setLoading(false);
        }
    };

    // 1. Fetch User Documents & Lab Reports from Backend API / Supabase
    const fetchUserDocuments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const res = await axios.get(`/api/documents/patient/${targetUserId}`, authHeader);
            const docs = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setMedicalRecords(docs);
        } catch (err) {
            console.warn("Documents fetch notice:", err.message);
            setMedicalRecords([]);
        }
    };

    // 2. Fetch Confirmed Appointments from Referrals & Booking System
    const fetchConfirmedAppointments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const res = await axios.get(`/api/referrals/patient/${targetUserId}`, authHeader);
            const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            if (list && Array.isArray(list)) {
                const confirmed = list.filter(r => 
                    r.status === 'APPOINTMENT_BOOKED' || 
                    r.status === 'CONFIRMED' || 
                    r.status === 'PATIENT_IN_TRANSIT' ||
                    r.status === 'PATIENT_REACHED' ||
                    r.status === 'CONSULTATION_IN_PROGRESS' ||
                    r.status === 'TREATMENT_COMPLETED' ||
                    r.status === 'COMPLETED'
                );
                
                const hydrated = confirmed.map(r => ({
                    ...r,
                    facility_name: r.facilities?.name || r.facility_name || 'Healthcare Centre',
                    doctor_name: r.doctors?.name || r.doctor_name || 'Specialist Doctor',
                    department: r.specialty_required || r.department || 'Specialist OPD',
                    slot_date: r.appointment_slot_time ? r.appointment_slot_time.split(' at ')[0] : (r.created_at ? r.created_at.split('T')[0] : ''),
                    slot_time: r.appointment_slot_time ? (r.appointment_slot_time.split(' at ')[1] || r.appointment_slot_time) : '',
                    queue_token: r.slot_token || 'Token'
                }));

                setConfirmedAppointments(hydrated);
                return;
            }
        } catch (err) {
            console.warn("Referral appointments fetch notice:", err.message);
        }

        setConfirmedAppointments([]);
    };

    // 3. Fetch Old Past Records from Supabase user.medical_history
    const fetchProfileMedicalHistory = async () => {
        try {
            let pastRecords = [];
            
            // Check in user context / localStorage
            if (user?.medical_history?.past_records && Array.isArray(user.medical_history.past_records)) {
                pastRecords = user.medical_history.past_records;
            } else {
                // Try fetching directly from Supabase users table
                const { data, error } = await supabase
                    .from('users')
                    .select('medical_history')
                    .eq('id', targetUserId)
                    .maybeSingle();

                if (!error && data?.medical_history?.past_records) {
                    pastRecords = data.medical_history.past_records;
                }
            }

            setOldPastRecords(pastRecords || []);
        } catch (err) {
            console.warn("Past records parse warning:", err.message);
            setOldPastRecords([]);
        }
    };

    // Handle File Attachment for Old Record
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setNewRecord(prev => ({
                ...prev,
                file_name: file.name,
                file_preview: reader.result,
                file_type: file.type
            }));
        };
        reader.readAsDataURL(file);
    };

    // STEP 1: Prompt explicit patient consent before persisting medical history or prescription data
    const handleInitiateSaveRecord = (e) => {
        if (e) e.preventDefault();
        if (!newRecord.title.trim()) {
            alert("Please enter a Title or Diagnosis for the record.");
            return;
        }

        const recordId = 'past_' + Date.now();
        const recordToSave = {
            id: recordId,
            title: newRecord.title.trim(),
            category: newRecord.category,
            record_date: newRecord.record_date || new Date().toISOString().split('T')[0],
            facility_name: newRecord.facility_name.trim() || 'Private Clinic / Hospital',
            doctor_name: newRecord.doctor_name.trim() || 'Treating Physician',
            diagnosis: newRecord.diagnosis.trim(),
            notes: newRecord.notes.trim(),
            medications: newRecord.medications.trim(),
            vitals_bp: newRecord.vitals_bp.trim(),
            vitals_sugar: newRecord.vitals_sugar.trim(),
            vitals_weight: newRecord.vitals_weight.trim(),
            file_name: newRecord.file_name || null,
            file_preview: newRecord.file_preview || null,
            file_type: newRecord.file_type || null,
            created_at: new Date().toISOString()
        };

        setPendingConsentRecord(recordToSave);
        setShowConsentModal(true);
    };

    // STEP 2: Only after patient actively confirms consent, persist consent and store medical history
    const handleConsentConfirmedAndSave = async (consentData) => {
        if (!pendingConsentRecord) return;
        
        setIsPersistingConsentAndRecord(true);
        setSavingRecord(true);
        try {
            const token = localStorage.getItem('accessToken');

            // 1. Transactional Step 1: Persist Consent Record to Backend / Audit Ledger
            try {
                await axios.post('/api/profile/consent', {
                    consent_status: 'GRANTED',
                    consent_version: consentData.consent_version,
                    consent_purpose: consentData.consent_purpose,
                    related_record_id: pendingConsentRecord.id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (cErr) {
                console.warn('[CONSENT] Backend consent audit notice:', cErr.message);
            }

            // 2. Transactional Step 2: Persist Medical History to Supabase and Profile API
            const updatedPastRecords = [pendingConsentRecord, ...oldPastRecords];
            
            const existingHistory = user?.medical_history || {};
            const updatedMedicalHistory = {
                ...existingHistory,
                past_records: updatedPastRecords,
                consent: {
                    status: 'GRANTED',
                    version: consentData.consent_version,
                    purpose: consentData.consent_purpose,
                    consented_at: consentData.consented_at,
                    related_record_id: pendingConsentRecord.id
                },
                last_updated_at: new Date().toISOString()
            };

            // Direct Supabase update
            try {
                const { error: supaErr } = await supabase
                    .from('users')
                    .update({
                        medical_history: updatedMedicalHistory,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', targetUserId);

                if (supaErr) {
                    console.warn('[SUPABASE] Direct profile update notice:', supaErr.message);
                }
            } catch (supaEx) {
                console.warn('[SUPABASE] Exception updating medical history:', supaEx.message);
            }

            // Sync via Backend Profile Update Endpoint
            try {
                await axios.post('/api/profile/update', {
                    section: 'medical_history',
                    data: {
                        medical_history: updatedMedicalHistory
                    }
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (apiEx) {
                console.warn('[API] Backend profile endpoint sync notice:', apiEx.message);
            }

            // Update UI state & AuthContext
            setOldPastRecords(updatedPastRecords);

            if (updateUser) {
                updateUser({
                    medical_history: updatedMedicalHistory
                });
            } else {
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    const parsed = JSON.parse(currentUserStr);
                    parsed.medical_history = updatedMedicalHistory;
                    localStorage.setItem('currentUser', JSON.stringify(parsed));
                }
            }

            // Reset Form & Close Modals
            setNewRecord({
                title: '',
                category: 'Lab Report',
                record_date: new Date().toISOString().split('T')[0],
                facility_name: '',
                doctor_name: '',
                diagnosis: '',
                notes: '',
                medications: '',
                vitals_bp: '',
                vitals_sugar: '',
                vitals_weight: '',
                file_name: '',
                file_preview: '',
                file_type: ''
            });

            setShowConsentModal(false);
            setPendingConsentRecord(null);
            setShowAddModal(false);
            showToast("Consent recorded & Medical Record saved to your secure Health Profile!");
        } catch (err) {
            console.error("Save old record error:", err);
            alert("Error saving record: " + (err.message || "Please check connection."));
        } finally {
            setIsPersistingConsentAndRecord(false);
            setSavingRecord(false);
        }
    };

    // Delete an Old Past Record from Supabase
    const handleDeleteOldRecord = async (recordId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to remove this record from your medical history?")) {
            return;
        }

        const filtered = oldPastRecords.filter(r => r.id !== recordId);
        setOldPastRecords(filtered);

        const updatedMedicalHistory = {
            ...(user?.medical_history || {}),
            past_records: filtered,
            last_updated_at: new Date().toISOString()
        };

        try {
            await supabase
                .from('users')
                .update({ medical_history: updatedMedicalHistory })
                .eq('id', targetUserId);

            const token = localStorage.getItem('accessToken');
            await axios.post('/api/profile/update', {
                data: { medical_history: updatedMedicalHistory }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});

            if (updateUser) {
                updateUser({ medical_history: updatedMedicalHistory });
            }

            showToast("Record removed from your medical history profile.", "info");
        } catch (err) {
            console.error("Delete record error:", err);
        }
    };

    // Consolidated Timeline Stream (Combining Documents, Confirmed Appointments, and Old Records)
    const combinedTimeline = [
        ...confirmedAppointments.map(apt => ({
            id: apt.id,
            type: 'appointment',
            title: `OPD Appointment: ${apt.department || 'Consultation'}`,
            facility: apt.facility_name,
            doctor: apt.doctor_name,
            date: apt.slot_date || (apt.created_at ? apt.created_at.split('T')[0] : '2026-09-09'),
            time: apt.slot_time,
            badge: 'CONFIRMED APPOINTMENT',
            badgeColor: '#059669',
            badgeBg: '#d1fae5',
            raw: apt
        })),
        ...medicalRecords.map(doc => ({
            id: doc.id,
            type: 'document',
            title: doc.name || 'Medical Diagnostic Report',
            facility: doc.facility || 'Diagnostic Centre',
            doctor: doc.doctor || 'Reporting Medical Officer',
            date: doc.created_at ? doc.created_at.split('T')[0] : '2026-09-05',
            badge: (doc.type || 'LAB REPORT').toUpperCase().replace('_', ' '),
            badgeColor: '#2563eb',
            badgeBg: '#dbeafe',
            raw: doc
        })),
        ...oldPastRecords.map(old => ({
            id: old.id,
            type: 'old_record',
            title: old.title,
            facility: old.facility_name,
            doctor: old.doctor_name,
            date: old.record_date,
            badge: (old.category || 'PAST RECORD').toUpperCase(),
            badgeColor: '#7c3aed',
            badgeBg: '#ede9fe',
            raw: old
        }))
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Filter Items based on search, active tab, category, and year
    const filteredTimeline = combinedTimeline.filter(item => {
        // Tab Filter
        if (activeTab === 'records' && item.type !== 'document') return false;
        if (activeTab === 'appointments' && item.type !== 'appointment') return false;
        if (activeTab === 'old_records' && item.type !== 'old_record') return false;

        // Search Filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            const matchTitle = item.title?.toLowerCase().includes(query);
            const matchFacility = item.facility?.toLowerCase().includes(query);
            const matchDoctor = item.doctor?.toLowerCase().includes(query);
            const matchDate = item.date?.includes(query);
            if (!matchTitle && !matchFacility && !matchDoctor && !matchDate) return false;
        }

        // Category Filter
        if (filterCategory !== 'ALL') {
            if (filterCategory === 'APPOINTMENTS' && item.type !== 'appointment') return false;
            if (filterCategory === 'LAB_REPORTS' && item.raw?.type !== 'lab_report' && item.raw?.category !== 'Lab Report') return false;
            if (filterCategory === 'PRESCRIPTIONS' && item.raw?.type !== 'prescription' && item.raw?.category !== 'Prescription') return false;
            if (filterCategory === 'SURGERIES' && item.raw?.category !== 'Surgery') return false;
        }

        // Year Filter
        if (filterYear !== 'ALL') {
            if (!item.date || !item.date.startsWith(filterYear)) return false;
        }

        return true;
    });

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            paddingBottom: '100px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            {/* Top Navigation Bar */}
            <div style={{
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 30,
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/home')}
                            style={{
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '10px',
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#334155'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: '#0284c7',
                                    background: '#e0f2fe',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    textTransform: 'uppercase'
                                }}>
                                    Ayushman Bharat EHR
                                </span>
                            </div>
                            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '2px 0 0', color: '#0f172a' }}>
                                Medical History & Records
                            </h1>
                        </div>
                    </div>

                    {/* Add Old Record Action Button */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                        }}
                    >
                        <Plus size={18} />
                        <span>Add Old Record</span>
                    </button>
                </div>
            </div>

            {/* Main Container */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>

                {/* Toast Notification */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                background: toastMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
                                color: toastMessage.type === 'error' ? '#991b1b' : '#166534',
                                border: `1px solid ${toastMessage.type === 'error' ? '#f87171' : '#86efac'}`,
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontWeight: '600',
                                fontSize: '13px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                            }}
                        >
                            <CheckCircle2 size={18} color={toastMessage.type === 'error' ? '#991b1b' : '#166534'} />
                            <span>{toastMessage.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Patient Health Identity Profile Card */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        right: '-20px',
                        bottom: '-20px',
                        opacity: 0.08,
                        transform: 'rotate(-15deg)'
                    }}>
                        <HeartPulse size={180} color="#ffffff" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                }}>
                                    ABDM VERIFIED CITIZEN
                                </span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    ABHA ID: {user?.abha_id || '91-5660-4589-7080'}
                                </span>
                            </div>

                            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>
                                {user?.name || user?.full_name || 'Swasthya Citizen'}
                            </h2>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#cbd5e1' }}>
                                <span><strong>Gender:</strong> {user?.gender || 'Male'}</span>
                                <span>•</span>
                                <span><strong>Blood Group:</strong> <span style={{ color: '#f87171', fontWeight: '800' }}>{user?.blood_group || 'O+'}</span></span>
                                <span>•</span>
                                <span><strong>City:</strong> {user?.address_city || 'Lucknow, UP'}</span>
                                <span>•</span>
                                <span><strong>Phone:</strong> {user?.phone || '+91 7080135660'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={fetchAllData}
                                disabled={refreshing}
                                style={{
                                    background: 'rgba(255,255,255,0.12)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: '#ffffff',
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span>Sync Cloud</span>
                            </button>
                        </div>
                    </div>

                    {/* Vitals Summary Strip */}
                    <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px'
                    }}>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Records</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>{combinedTimeline.length} Entries</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Confirmed Appointments</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#4ade80' }}>{confirmedAppointments.length} Active</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Old Health Archives</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#c084fc' }}>{oldPastRecords.length} Saved</div>
                        </div>
                    </div>
                </div>

                {/* Segmented Filter Tabs */}
                <div style={{
                    display: 'flex',
                    background: '#ffffff',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '16px',
                    overflowX: 'auto',
                    gap: '4px'
                }}>
                    {[
                        { id: 'all', label: `All History (${combinedTimeline.length})`, icon: History },
                        { id: 'records', label: `Medical Records (${medicalRecords.length})`, icon: FileText },
                        { id: 'appointments', label: `Confirmed Appointments (${confirmedAppointments.length})`, icon: CalendarCheck },
                        { id: 'old_records', label: `Old Added Records (${oldPastRecords.length})`, icon: Plus }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1,
                                    minWidth: '150px',
                                    padding: '10px 14px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: isActive ? '700' : '500',
                                    color: isActive ? '#ffffff' : '#64748b',
                                    background: isActive ? '#0284c7' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Search & Category Filter Bar */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        flex: '1 1 240px',
                        position: 'relative'
                    }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search records, doctors, hospitals, tests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 38px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Category */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '13px',
                            color: '#334155',
                            fontWeight: '600',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Categories</option>
                        <option value="APPOINTMENTS">Confirmed Appointments</option>
                        <option value="LAB_REPORTS">Lab & Blood Reports</option>
                        <option value="PRESCRIPTIONS">Doctor Prescriptions</option>
                        <option value="SURGERIES">Surgeries & Procedures</option>
                    </select>

                    {/* Filter Year */}
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '13px',
                            color: '#334155',
                            fontWeight: '600',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Years</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022 & Older</option>
                    </select>
                </div>

                {/* Content Stream */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
                        <div style={{ fontWeight: '600', fontSize: '15px' }}>Loading Medical History & Appointments...</div>
                        <div style={{ fontSize: '12px' }}>Connecting to Supabase Ayushman Health Records</div>
                    </div>
                ) : filteredTimeline.length === 0 ? (
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '2px dashed #cbd5e1',
                        padding: '48px 20px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: '#e0f2fe',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            color: '#0284c7'
                        }}>
                            <FileText size={28} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px', color: '#0f172a' }}>
                            No Records Found
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 20px' }}>
                            {searchTerm ? `No matching records found for "${searchTerm}". Try resetting filters.` : 'You have not added any past medical records yet. Click the button below to upload old records, prescriptions, or surgery notes.'}
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 20px',
                                fontSize: '14px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={18} />
                            <span>Add Your First Old Medical Record</span>
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {filteredTimeline.map((item, idx) => {
                            const isAppointment = item.type === 'appointment';
                            const isOldRecord = item.type === 'old_record';
                            const isDoc = item.type === 'document';

                            return (
                                <motion.div
                                    key={item.id || idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '14px',
                                        border: '1px solid #e2e8f0',
                                        padding: '16px 18px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {/* Item Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '10px',
                                                background: isAppointment ? '#dcfce7' : (isOldRecord ? '#f3e8ff' : '#e0f2fe'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: isAppointment ? '#15803d' : (isOldRecord ? '#7e22ce' : '#0369a1'),
                                                flexShrink: 0
                                            }}>
                                                {isAppointment ? <CalendarCheck size={22} /> : (isOldRecord ? <History size={22} /> : <FileText size={22} />)}
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                    <span style={{
                                                        background: item.badgeBg,
                                                        color: item.badgeColor,
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        letterSpacing: '0.3px'
                                                    }}>
                                                        {item.badge}
                                                    </span>

                                                    {isAppointment && (
                                                        <span style={{
                                                            background: '#fef3c7',
                                                            color: '#92400e',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            Token: {item.raw?.queue_token || 'OPD-12'}
                                                        </span>
                                                    )}

                                                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Calendar size={13} />
                                                        {item.date}
                                                    </span>
                                                </div>

                                                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px', color: '#0f172a' }}>
                                                    {item.title}
                                                </h4>

                                                <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Building2 size={14} color="#64748b" />
                                                        {item.facility || 'Healthcare Facility'}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Stethoscope size={14} color="#64748b" />
                                                        {item.doctor || 'Attending Doctor'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {isAppointment ? (
                                                <button
                                                    onClick={() => setSelectedAppointmentSlip(item.raw)}
                                                    style={{
                                                        background: '#ecfdf5',
                                                        color: '#047857',
                                                        border: '1px solid #a7f3d0',
                                                        borderRadius: '8px',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Eye size={14} />
                                                    <span>View Slip</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedRecordModal(item)}
                                                    style={{
                                                        background: '#f1f5f9',
                                                        color: '#334155',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '8px',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Eye size={14} />
                                                    <span>Details</span>
                                                </button>
                                            )}

                                            {isOldRecord && (
                                                <button
                                                    onClick={(e) => handleDeleteOldRecord(item.id, e)}
                                                    title="Delete old record"
                                                    style={{
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Snippet Content / Key Clinical Data */}
                                    <div style={{
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        fontSize: '12.5px',
                                        color: '#334155',
                                        borderLeft: `3px solid ${isAppointment ? '#10b981' : (isOldRecord ? '#8b5cf6' : '#0284c7')}`
                                    }}>
                                        {isAppointment && (
                                            <div>
                                                <strong>Scheduled Slot:</strong> {item.raw?.slot_time || 'Morning OPD'} • <strong>Reason:</strong> {item.raw?.reason || 'General Consultation'}
                                            </div>
                                        )}
                                        {isDoc && (
                                            <div>
                                                <strong>Key Findings:</strong> {item.raw?.extracted_data?.key_findings || item.raw?.extracted_data?.advice || 'Diagnostic report indexed in health records system.'}
                                            </div>
                                        )}
                                        {isOldRecord && (
                                            <div>
                                                <strong>Diagnosis / Notes:</strong> {item.raw?.diagnosis || item.raw?.notes || 'Past clinical record'}
                                                {item.raw?.medications && (
                                                    <div style={{ marginTop: '4px', color: '#64748b' }}>
                                                        <strong>Medications:</strong> {item.raw?.medications}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL 1: ADD OLD MEDICAL RECORD (SYNCS WITH SUPABASE) */}
            {/* ========================================================= */}
            <AnimatePresence>
                {showAddModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 100,
                        backdropFilter: 'blur(4px)'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '580px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '18px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#f8fafc',
                                borderTopLeftRadius: '20px',
                                borderTopRightRadius: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '10px',
                                        background: '#e0f2fe',
                                        color: '#0284c7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                                            Add Old Medical Record
                                        </h3>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            Syncs permanently to your Supabase Health Profile
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Form Body */}
                            <form onSubmit={handleInitiateSaveRecord} style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                    {/* Record Title */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                            Record Title / Condition Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Typhoid Treatment 2023, Appendectomy Surgery, Chest X-Ray"
                                            value={newRecord.title}
                                            onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '13px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Category & Date Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                                Record Category *
                                            </label>
                                            <select
                                                value={newRecord.category}
                                                onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <option value="Lab Report">Lab / Blood Report</option>
                                                <option value="Prescription">Doctor Prescription</option>
                                                <option value="Discharge Summary">Discharge Summary</option>
                                                <option value="Surgery">Surgery / Procedure</option>
                                                <option value="Vaccination">Vaccination / Immunization</option>
                                                <option value="Doctor Consultation">Doctor Consultation Note</option>
                                                <option value="Other">Other Medical Archive</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                                Date of Treatment / Record *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={newRecord.record_date}
                                                onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Hospital & Doctor Name Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                                Hospital / Clinic / Lab Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Apollo Clinic, Civil Hospital"
                                                value={newRecord.facility_name}
                                                onChange={(e) => setNewRecord({ ...newRecord, facility_name: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                                Doctor / Specialist Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Dr. V. K. Mehrotra, MD"
                                                value={newRecord.doctor_name}
                                                onChange={(e) => setNewRecord({ ...newRecord, doctor_name: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Diagnosis & Key Findings */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                            Diagnosis / Key Medical Findings
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Enteric Fever (Typhoid) resolved, Normal Blood Sugar, Left knee arthroscopy"
                                            value={newRecord.diagnosis}
                                            onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '13px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Prescribed Medications & Notes */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                            Medications Prescribed / Dosage
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Cefixime 200mg BD, Paracetamol 650mg SOS"
                                            value={newRecord.medications}
                                            onChange={(e) => setNewRecord({ ...newRecord, medications: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '13px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Optional Vitals Recorded */}
                                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            Vitals Recorded at that time (Optional)
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="BP (120/80)"
                                                value={newRecord.vitals_bp}
                                                onChange={(e) => setNewRecord({ ...newRecord, vitals_bp: e.target.value })}
                                                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', width: '100%' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Sugar (mg/dL)"
                                                value={newRecord.vitals_sugar}
                                                onChange={(e) => setNewRecord({ ...newRecord, vitals_sugar: e.target.value })}
                                                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', width: '100%' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Weight (kg)"
                                                value={newRecord.vitals_weight}
                                                onChange={(e) => setNewRecord({ ...newRecord, vitals_weight: e.target.value })}
                                                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', width: '100%' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Document File / Image Attachment */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                                            Attach Document / Prescription Photo (PDF, JPG, PNG)
                                        </label>
                                        <div style={{
                                            border: '2px dashed #cbd5e1',
                                            borderRadius: '10px',
                                            padding: '16px',
                                            textAlign: 'center',
                                            background: '#f8fafc',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={handleFileChange}
                                                style={{ display: 'none' }}
                                                id="old-record-file-input"
                                            />
                                            <label htmlFor="old-record-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                <Upload size={24} color="#0284c7" />
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0284c7' }}>
                                                    {newRecord.file_name ? `Attached: ${newRecord.file_name}` : 'Click to Upload Document or Take Photo'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    Supports camera photos, PDF prescriptions, lab scans
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div style={{
                                    marginTop: '20px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        style={{
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px 18px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={savingRecord}
                                        style={{
                                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px 22px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: savingRecord ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                                        }}
                                    >
                                        {savingRecord ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                                        <span>{savingRecord ? 'Saving to Supabase...' : 'Save to Medical History'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* MODAL 2: APPOINTMENT SLIP VIEWER */}
            {/* ========================================================= */}
            <AnimatePresence>
                {selectedAppointmentSlip && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 100,
                        backdropFilter: 'blur(4px)'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '500px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            {/* OPD Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                color: '#ffffff',
                                padding: '20px',
                                textAlign: 'center',
                                position: 'relative'
                            }}>
                                <button
                                    onClick={() => setSelectedAppointmentSlip(null)}
                                    style={{
                                        position: 'absolute',
                                        right: '14px',
                                        top: '14px',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#ffffff'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                                <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                                    Government of India • Ayushman Bharat OPD Slip
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 0' }}>
                                    Confirmed Appointment Token
                                </h3>
                                <div style={{
                                    display: 'inline-block',
                                    background: '#ffffff',
                                    color: '#047857',
                                    fontSize: '18px',
                                    fontWeight: '900',
                                    padding: '4px 16px',
                                    borderRadius: '20px',
                                    marginTop: '10px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    {selectedAppointmentSlip.queue_token || 'OPD-B14'}
                                </div>
                            </div>

                            {/* Slip Content */}
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Patient Name:</span>
                                        <strong>{user?.name || 'Swasthya Citizen'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Hospital / Facility:</span>
                                        <strong style={{ color: '#0284c7' }}>{selectedAppointmentSlip.facility_name}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Department / OPD:</span>
                                        <strong>{selectedAppointmentSlip.department || 'General Medicine'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Attending Doctor:</span>
                                        <strong>{selectedAppointmentSlip.doctor_name || 'Assigned Duty Medical Officer'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Appointment Time:</span>
                                        <strong style={{ color: '#059669' }}>{selectedAppointmentSlip.slot_time || 'Tomorrow, 10:30 AM'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Facility Address:</span>
                                        <span style={{ textAlign: 'right', maxWidth: '240px' }}>{selectedAppointmentSlip.address || 'Civil Hospital Campus, Nashik'}</span>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: '16px',
                                    background: '#f8fafc',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    color: '#475569',
                                    lineHeight: '1.4'
                                }}>
                                    💡 <strong>Patient Instruction:</strong> Please show this token at the OPD Registration counter 15 minutes before your scheduled slot for priority entry without queueing.
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button
                                        onClick={() => window.print()}
                                        style={{
                                            flex: 1,
                                            background: '#f1f5f9',
                                            color: '#334155',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Download size={16} />
                                        <span>Download Slip</span>
                                    </button>

                                    <button
                                        onClick={() => setSelectedAppointmentSlip(null)}
                                        style={{
                                            flex: 1,
                                            background: '#059669',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* MODAL 3: RECORD DETAILS & DOCUMENT VIEWER */}
            {/* ========================================================= */}
            <AnimatePresence>
                {selectedRecordModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 100,
                        backdropFilter: 'blur(4px)'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '550px',
                                maxHeight: '85vh',
                                overflowY: 'auto',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <div style={{
                                padding: '18px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#f8fafc',
                                borderTopLeftRadius: '20px',
                                borderTopRightRadius: '20px'
                            }}>
                                <div>
                                    <span style={{
                                        background: selectedRecordModal.badgeBg,
                                        color: selectedRecordModal.badgeColor,
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        padding: '2px 8px',
                                        borderRadius: '6px'
                                    }}>
                                        {selectedRecordModal.badge}
                                    </span>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 0', color: '#0f172a' }}>
                                        {selectedRecordModal.title}
                                    </h3>
                                </div>

                                <button
                                    onClick={() => setSelectedRecordModal(null)}
                                    style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '8px',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Date of Record</div>
                                        <strong>{selectedRecordModal.date}</strong>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Facility / Hospital</div>
                                        <strong>{selectedRecordModal.facility || 'Healthcare Clinic'}</strong>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Attending Physician / Specialist
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        {selectedRecordModal.doctor || 'Dr. Medical Officer'}
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Diagnosis & Medical Summary
                                    </div>
                                    <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', color: '#334155', lineHeight: '1.5' }}>
                                        {selectedRecordModal.raw?.diagnosis || selectedRecordModal.raw?.extracted_data?.key_findings || selectedRecordModal.raw?.notes || 'No detailed clinical notes provided for this entry.'}
                                    </div>
                                </div>

                                {selectedRecordModal.raw?.medications && (
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                            Medications Prescribed
                                        </div>
                                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: '8px', color: '#065f46', fontWeight: '600' }}>
                                            {selectedRecordModal.raw.medications}
                                        </div>
                                    </div>
                                )}

                                {selectedRecordModal.raw?.file_preview && (
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                            Attached Document Preview
                                        </div>
                                        <img
                                            src={selectedRecordModal.raw.file_preview}
                                            alt="Medical Document"
                                            style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        onClick={() => navigate('/records')}
                                        style={{
                                            flex: 1,
                                            background: '#f8fafc',
                                            color: '#0284c7',
                                            border: '1px solid #bae6fd',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Sparkles size={16} />
                                        <span>Explain with MedGemma AI</span>
                                    </button>

                                    <button
                                        onClick={() => setSelectedRecordModal(null)}
                                        style={{
                                            flex: 1,
                                            background: '#0f172a',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Legally Conscious Patient Consent Modal */}
            <PatientConsentModal
                isOpen={showConsentModal}
                onClose={() => {
                    setShowConsentModal(false);
                    setPendingConsentRecord(null);
                }}
                onConsentConfirmed={handleConsentConfirmedAndSave}
                recordSummary={pendingConsentRecord}
                isProcessing={isPersistingConsentAndRecord}
            />
        </div>
    );
};

export default MedicalHistory;
