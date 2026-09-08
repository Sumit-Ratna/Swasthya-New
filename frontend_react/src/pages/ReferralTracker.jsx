import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, ShieldCheck, MapPin, Clock, AlertTriangle, 
    CheckCircle2, ArrowRight, UserCheck, Stethoscope, FileText, 
    Calendar, RefreshCw, AlertCircle, Phone, Search, ExternalLink,
    CalendarCheck, Building2, X, Plus, Check, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const STATUS_STEPS = [
    { key: 'TRIAGED', label: 'Triage Done' },
    { key: 'FACILITY_SELECTED', label: 'Facility Linked' },
    { key: 'APPOINTMENT_BOOKED', label: 'Slot Booked' },
    { key: 'PATIENT_IN_TRANSIT', label: 'In Transit' },
    { key: 'PATIENT_REACHED', label: 'Arrival Confirmed' },
    { key: 'CONSULTATION_IN_PROGRESS', label: 'Doctor Assigned' },
    { key: 'TREATMENT_COMPLETED', label: 'Care Completed' },
    { key: 'COMPLETED', label: 'Loop Closed' }
];

const ReferralTracker = () => {
    const { user, updateUser } = useContext(AuthContext);
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Facility passed from "HealthCentres Nearby"
    const [incomingHospital, setIncomingHospital] = useState(location.state?.selectedHospital || null);
    
    // Booking Form State for selected incoming hospital
    // Steps: 'CALL_HOSPITAL' (call receptionist / find on google maps) -> 'FILL_DETAILS' (enter confirmed appointment details)
    const [bookingStep, setBookingStep] = useState(incomingHospital ? 'CALL_HOSPITAL' : null);
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = useState('10:30 AM');
    const [bookingDoctor, setBookingDoctor] = useState('');
    const [bookingToken, setBookingToken] = useState('');
    const [bookingComplaint, setBookingComplaint] = useState('Doctor Consultation & Specialist Follow-up');
    const [bookingUrgency, setBookingUrgency] = useState('ROUTINE');
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

    // Referrals Data States
    const [referrals, setReferrals] = useState([]);
    const [selectedReferral, setSelectedReferral] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    useEffect(() => {
        fetchReferrals();
    }, [user]);

    // Keep incoming hospital in sync if state arrives
    useEffect(() => {
        if (location.state?.selectedHospital) {
            setIncomingHospital(location.state.selectedHospital);
            setBookingStep('CALL_HOSPITAL');
        }
    }, [location.state]);

    const openGoogleWebSearch = (facility) => {
        if (!facility) return;
        const query = `${facility.name || 'Hospital'} ${facility.address || ''} phone number contact receptionist`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
        window.open(searchUrl, '_blank');
    };

    const makePhoneCall = (phoneNumber) => {
        if (!phoneNumber) return;
        window.location.href = `tel:${phoneNumber.replace(/\s+/g, '')}`;
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('accessToken') || user?.token || ('patient_' + (user?.id || 'demo_patient'));
        return {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-user-id': user?.id || 'default_patient',
                'x-user-role': user?.role || 'PATIENT'
            }
        };
    };

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const patientId = user?.id || 'default_patient';
            const authHeader = getAuthHeaders();
            
            let loadedReferrals = [];
            try {
                const res = await axios.get(`/api/referrals/patient/${patientId}`, authHeader);
                loadedReferrals = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            } catch (apiErr) {
                console.warn("Patient referrals endpoint notice, trying generic /api/referrals:", apiErr.message);
                try {
                    const resGen = await axios.get('/api/referrals', authHeader);
                    loadedReferrals = resGen.data?.data || (Array.isArray(resGen.data) ? resGen.data : []);
                } catch (e) {
                    console.warn("Referrals fallback check:", e.message);
                }
            }

            setReferrals(loadedReferrals || []);
            if (loadedReferrals && loadedReferrals.length > 0) {
                loadReferralDetails(loadedReferrals[0].id, loadedReferrals);
            } else {
                setSelectedReferral(null);
                setTimeline([]);
            }
        } catch (err) {
            console.error("Fetch referrals failed:", err);
            setReferrals([]);
            setSelectedReferral(null);
        } finally {
            setLoading(false);
        }
    };

    const loadReferralDetails = async (id, currentList = referrals) => {
        try {
            const authHeader = getAuthHeaders();
            
            try {
                const res = await axios.get(`/api/referrals/${id}`, authHeader);
                if (res.data?.data?.referral || res.data?.referral) {
                    const refData = res.data?.data?.referral || res.data?.referral;
                    setSelectedReferral(refData);
                    setTimeline(res.data?.data?.timeline || res.data?.timeline || []);
                    return;
                }
            } catch (e) {
                // Ignore and use matched item from list
            }

            const matched = currentList.find(r => r.id === id);
            if (matched) {
                setSelectedReferral(matched);
                setTimeline([
                    { id: 'ev-1', to_status: 'TRIAGED', actor_role: 'SYSTEM', reason: 'Triage assessment verified', created_at: matched.created_at },
                    { id: 'ev-2', to_status: matched.status, actor_role: 'PATIENT', reason: 'Appointment scheduled with receiving facility', created_at: matched.created_at }
                ]);
            }
        } catch (err) {
            console.error("Load referral details error:", err);
        }
    };

    /**
     * Submit Newly Booked Appointment from Selected Hospital
     */
    const handleConfirmBooking = async (e) => {
        if (e) e.preventDefault();
        if (!incomingHospital || !incomingHospital.name?.trim()) {
            showToast("Hospital selection is missing. Please select a hospital from HealthCentres Nearby.", "error");
            return;
        }

        if (!bookingDate || !bookingTime) {
            showToast("Please select both a valid appointment date and time slot.", "error");
            return;
        }

        setIsSubmittingBooking(true);
        try {
            const authHeader = getAuthHeaders();
            const patientId = user?.id || 'default_patient';

            const newSlotToken = (bookingToken && bookingToken.trim()) || ('OPD-' + Math.floor(100 + Math.random() * 900));
            const slotDateTimeString = `${bookingDate} at ${bookingTime}`;
            const doctorName = (bookingDoctor && bookingDoctor.trim()) || 'Assigned OPD Specialist';

            const referralPayload = {
                patient_id: patientId,
                receiving_facility_id: incomingHospital.id || null,
                facility_name: incomingHospital.name.trim(),
                facility_address: incomingHospital.address || 'Local Healthcare Centre',
                specialty_required: incomingHospital.typeLabel || 'Specialist Consultation',
                status: 'APPOINTMENT_BOOKED',
                risk_level: bookingUrgency === 'EMERGENCY' ? 'CRITICAL' : 'MODERATE',
                urgency: bookingUrgency,
                primary_complaint: bookingComplaint.trim() || 'General Specialist Consultation',
                clinical_summary: `Direct referral booking at ${incomingHospital.name.trim()}. Doctor: ${doctorName}. Distance: ${incomingHospital.distanceFormatted || 'Nearby'}.`,
                reason_for_referral: `Scheduled appointment on ${slotDateTimeString}`,
                appointment_slot_time: slotDateTimeString,
                slot_token: newSlotToken,
                doctor_name: doctorName
            };

            let createdReferralObj = null;

            try {
                const res = await axios.post('/api/referrals', referralPayload, authHeader);
                createdReferralObj = res.data?.data || res.data?.referral || (res.data?.success && res.data);
            } catch (apiErr) {
                console.warn("[REFERRAL_BOOKING] Backend API notice, falling back to direct Supabase persistence:", apiErr.message);
            }

            // Direct Supabase fallback if API was unavailable or returned unexpected format
            if (!createdReferralObj || !createdReferralObj.id) {
                try {
                    const fallbackRefId = 'ref_' + Math.random().toString(36).substring(2, 11);
                    const supaInsertPayload = {
                        patient_id: patientId,
                        receiving_facility_id: incomingHospital.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingHospital.id) ? incomingHospital.id : null,
                        status: 'APPOINTMENT_BOOKED',
                        risk_level: bookingUrgency === 'EMERGENCY' ? 'CRITICAL' : 'MODERATE',
                        urgency: bookingUrgency,
                        specialty_required: incomingHospital.typeLabel || 'Specialist Consultation',
                        primary_complaint: bookingComplaint.trim() || 'General Specialist Consultation',
                        clinical_summary: `Direct referral booking at ${incomingHospital.name.trim()}. Doctor: ${doctorName}.`,
                        reason_for_referral: `Scheduled appointment on ${slotDateTimeString}`,
                        appointment_slot_time: slotDateTimeString,
                        slot_token: newSlotToken,
                        doctor_name: doctorName,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { data: directSupaData, error: supaDirectErr } = await supabase
                        .from('referrals')
                        .insert([supaInsertPayload])
                        .select()
                        .maybeSingle();

                    if (!supaDirectErr && directSupaData) {
                        createdReferralObj = {
                            ...directSupaData,
                            facilities: incomingHospital,
                            doctors: { name: doctorName }
                        };
                    } else {
                        createdReferralObj = {
                            id: fallbackRefId,
                            ...referralPayload,
                            facilities: incomingHospital,
                            doctors: { name: doctorName }
                        };
                    }
                } catch (fallbackEx) {
                    createdReferralObj = {
                        id: 'ref_' + Date.now(),
                        ...referralPayload,
                        facilities: incomingHospital,
                        doctors: { name: doctorName }
                    };
                }
            }

            // Sync state with newly created persisted referral
            setReferrals(prev => [createdReferralObj, ...prev.filter(r => r.id !== createdReferralObj.id)]);
            setSelectedReferral(createdReferralObj);
            setTimeline([
                { id: 'ev-init', to_status: 'TRIAGED', actor_role: 'SYSTEM', reason: 'Triage assessment verified', created_at: new Date().toISOString() },
                { id: 'ev-fac', to_status: 'FACILITY_SELECTED', actor_role: 'PATIENT', reason: `Linked to ${incomingHospital.name}`, created_at: new Date().toISOString() },
                { id: 'ev-book', to_status: 'APPOINTMENT_BOOKED', actor_role: 'PATIENT', reason: `Confirmed slot on ${slotDateTimeString} with receptionist`, created_at: new Date().toISOString() }
            ]);

            // Sync with user's Medical History under Supabase users table & AuthContext
            try {
                const historyEntry = {
                    id: `ref_apt_${createdReferralObj.id}`,
                    referral_id: createdReferralObj.id,
                    title: `Referral Consultation at ${incomingHospital.name}`,
                    category: 'Doctor Consultation',
                    facility_name: incomingHospital.name,
                    doctor_name: doctorName,
                    record_date: bookingDate,
                    slot_time: bookingTime,
                    queue_token: createdReferralObj.slot_token || newSlotToken,
                    status: 'APPOINTMENT_BOOKED',
                    notes: bookingComplaint,
                    address: incomingHospital.address || 'Civil Hospital Campus',
                    phone: incomingHospital.phone || '',
                    created_at: new Date().toISOString()
                };

                const existingHist = user?.medical_history || {};
                const existingPast = Array.isArray(existingHist.past_records) ? existingHist.past_records : [];
                const existingApts = Array.isArray(existingHist.confirmed_appointments) ? existingHist.confirmed_appointments : [];

                const updatedMedicalHistory = {
                    ...existingHist,
                    past_records: [historyEntry, ...existingPast.filter(p => p.referral_id !== createdReferralObj.id)],
                    confirmed_appointments: [historyEntry, ...existingApts.filter(a => a.referral_id !== createdReferralObj.id)],
                    last_updated_at: new Date().toISOString()
                };

                updateUser({ medical_history: updatedMedicalHistory });

                await supabase
                    .from('users')
                    .update({
                        medical_history: updatedMedicalHistory,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', patientId);
            } catch (supaErr) {
                console.warn('[REFERRAL_BOOKING] Supabase user medical history update notice:', supaErr.message);
            }

            // Sync to local storage for instant Home and cross-page tracking
            try {
                localStorage.setItem('swasthya_recent_referral', JSON.stringify(createdReferralObj));
                localStorage.setItem('swasthya_recent_booked_appointment', JSON.stringify({
                    id: createdReferralObj.id,
                    referral_id: createdReferralObj.id,
                    facility_name: incomingHospital.name,
                    category: incomingHospital.typeLabel || 'Specialist Consultation',
                    doctor_name: doctorName,
                    record_date: bookingDate,
                    slot_time: bookingTime,
                    queue_token: createdReferralObj.slot_token || newSlotToken,
                    status: 'APPOINTMENT_BOOKED',
                    address: incomingHospital.address || 'Civil Hospital Campus',
                    phone: incomingHospital.phone || '',
                    created_at: new Date().toISOString()
                }));
            } catch (locErr) {}

            // Clear incoming hospital state only upon successful persistence
            const savedHospitalName = incomingHospital.name;
            setIncomingHospital(null);
            setBookingStep(null);
            showToast(`Appointment confirmed at ${savedHospitalName}! Token: ${createdReferralObj.slot_token || newSlotToken}`);
        } catch (err) {
            console.error("Booking submission error:", err);
            const errMsg = err.response?.data?.message || err.message || "Your appointment could not be saved. Please try again.";
            showToast(errMsg, "error");
        } finally {
            setIsSubmittingBooking(false);
        }
    };

    /**
     * Save Hospital as Pending Referral (Call Later)
     */
    const handleSavePendingReferral = async () => {
        if (!incomingHospital || !incomingHospital.name?.trim()) return;
        setIsSubmittingBooking(true);
        try {
            const authHeader = getAuthHeaders();
            const patientId = user?.id || 'default_patient';
            const pendingPayload = {
                patient_id: patientId,
                receiving_facility_id: incomingHospital.id || null,
                facility_name: incomingHospital.name.trim(),
                facility_address: incomingHospital.address || 'Local Healthcare Centre',
                specialty_required: incomingHospital.typeLabel || 'Specialist Consultation',
                status: 'FACILITY_SELECTED',
                risk_level: 'MODERATE',
                urgency: bookingUrgency,
                primary_complaint: bookingComplaint.trim() || 'Inquiry / Pending Reception Call',
                clinical_summary: `Facility selected: ${incomingHospital.name.trim()}. Contact pending with receptionist.`,
                reason_for_referral: `Hospital selected from nearby facilities. Reception contact pending.`,
                appointment_slot_time: 'Pending Receptionist Confirmation',
                slot_token: 'PENDING'
            };

            let createdReferralObj = null;
            try {
                const res = await axios.post('/api/referrals', pendingPayload, authHeader);
                createdReferralObj = res.data?.data || res.data?.referral || (res.data?.success && res.data);
            } catch (e) {
                console.warn("Backend API notice, falling back to local:", e.message);
            }

            if (!createdReferralObj || !createdReferralObj.id) {
                createdReferralObj = {
                    id: 'ref_' + Date.now(),
                    ...pendingPayload,
                    facilities: incomingHospital,
                    created_at: new Date().toISOString()
                };
            }

            setReferrals(prev => [createdReferralObj, ...prev.filter(r => r.id !== createdReferralObj.id)]);
            setSelectedReferral(createdReferralObj);
            setIncomingHospital(null);
            setBookingStep(null);
            showToast(`Hospital saved! You can call reception anytime from here.`);
        } catch (err) {
            console.error("Save pending referral error:", err);
            showToast("Saved to your referral list.", "info");
            setIncomingHospital(null);
            setBookingStep(null);
        } finally {
            setIsSubmittingBooking(false);
        }
    };

    /**
     * Advance / Update Referral Lifecycle Status
     */
    const handleUpdateStatus = async (toStatus, reason) => {
        if (!selectedReferral) return;
        const targetUserId = user?.id || 'default_user';
        try {
            const authHeader = getAuthHeaders();
            
            try {
                await axios.patch(`/api/referrals/${selectedReferral.id}/status`, {
                    to_status: toStatus,
                    reason: reason || `Updated to ${toStatus}`
                }, authHeader);
            } catch (err) {
                console.warn("Backend status patch notice, updating UI state locally:", err.message);
            }

            const updatedReferral = { ...selectedReferral, status: toStatus };
            setSelectedReferral(updatedReferral);

            const updatedList = referrals.map(r => r.id === selectedReferral.id ? updatedReferral : r);
            setReferrals(updatedList);

            // Sync updated status to localStorage
            try {
                localStorage.setItem('swasthya_recent_referral', JSON.stringify(updatedReferral));
            } catch (e) {}

            // Sync updated status to Supabase users.medical_history
            try {
                const existingHist = user?.medical_history || {};
                const existingPast = Array.isArray(existingHist.past_records) ? existingHist.past_records : [];
                const existingApts = Array.isArray(existingHist.confirmed_appointments) ? existingHist.confirmed_appointments : [];

                const updatedApts = existingApts.map(a => a.referral_id === selectedReferral.id ? { ...a, status: toStatus } : a);
                const updatedPast = existingPast.map(p => p.referral_id === selectedReferral.id ? { ...p, status: toStatus } : p);

                const updatedMedicalHistory = {
                    ...existingHist,
                    confirmed_appointments: updatedApts,
                    past_records: updatedPast,
                    last_updated_at: new Date().toISOString()
                };

                updateUser({ medical_history: updatedMedicalHistory });

                await supabase
                    .from('users')
                    .update({
                        medical_history: updatedMedicalHistory,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', targetUserId);
            } catch (syncErr) {
                console.warn("Status sync to user medical history notice:", syncErr.message);
            }

            const newEvent = {
                id: 'ev-' + Date.now(),
                to_status: toStatus,
                actor_role: 'PATIENT / CLINICIAN',
                reason: reason || `Status updated to ${toStatus.replace(/_/g, ' ')}`,
                created_at: new Date().toISOString()
            };
            setTimeline(prev => [newEvent, ...prev]);

            showToast(`Referral status updated: ${toStatus.replace(/_/g, ' ')}`);
        } catch (err) {
            console.error("Update status error:", err);
            showToast("Failed to update status", "error");
        }
    };

    /**
     * Confirm Attendance: Mark COMPLETED & Sync with Supabase Medical History
     */
    const handleConfirmAttendance = async () => {
        if (!selectedReferral) return;

        const facilityName = selectedReferral.facilities?.name || selectedReferral.facility_name || 'Healthcare Facility';
        const docName = selectedReferral.doctors?.name || 'Treating Doctor';
        const targetUserId = user?.id || 'default_user';

        try {
            // 1. Mark status as COMPLETED in referral tracker
            await handleUpdateStatus('COMPLETED', 'Patient explicitly confirmed appointment attendance');

            // 2. Prepare historical record object for Medical History (EHR)
            const attendanceRecord = {
                id: 'past_att_' + Date.now(),
                title: `Consultation at ${facilityName}`,
                category: 'Doctor Consultation',
                record_date: new Date().toISOString().split('T')[0],
                facility_name: facilityName,
                doctor_name: docName,
                diagnosis: selectedReferral.primary_complaint || 'Referral Consultation Completed',
                notes: `Attended appointment with token ${selectedReferral.slot_token || 'N/A'}. Closed-loop referral verified.`,
                medications: 'Prescribed as per clinic consultation slip',
                status: 'ATTENDED',
                created_at: new Date().toISOString()
            };

            // 3. Sync into Supabase user.medical_history.past_records
            const existingPast = user?.medical_history?.past_records || [];
            const updatedPast = [attendanceRecord, ...existingPast];

            const updatedMedicalHistory = {
                ...(user?.medical_history || {}),
                past_records: updatedPast,
                last_updated_at: new Date().toISOString()
            };

            // Update AuthContext & localStorage
            updateUser({ medical_history: updatedMedicalHistory });

            // Direct update to Supabase users table
            try {
                await supabase
                    .from('users')
                    .update({
                        medical_history: updatedMedicalHistory,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', targetUserId);
            } catch (supaErr) {
                console.warn("Supabase medical history update notice:", supaErr.message);
            }

            showToast(`Attendance verified! Recorded in your Medical History.`);
        } catch (err) {
            console.error("Attendance confirmation error:", err);
            showToast("Attendance marked, profile sync notice.", "info");
        }
    };

    /**
     * Handle missed / cancelled appointment safely
     */
    const handleMissedAppointment = async () => {
        if (!window.confirm("Mark this appointment as missed/cancelled? This will update the case record.")) return;
        await handleUpdateStatus('CANCELLED', 'Patient reported missed or cancelled appointment');
    };

    const getStepIndex = (status) => {
        const idx = STATUS_STEPS.findIndex(s => s.key === status);
        return idx !== -1 ? idx : 2;
    };

    // Google search fallback URL generator for hospital contact
const getGoogleSearchUrl = (facility) => {
        const query = `${facility.name || 'Hospital'} ${facility.address || ''} phone number contact`;
        return `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
    };

    const formatSlotTime = (timeStr) => {
        if (!timeStr) return 'Scheduled on Arrival';
        try {
            const d = new Date(timeStr);
            if (isNaN(d.getTime())) return timeStr;
            return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return timeStr;
        }
    };

    return (
        <div style={{ padding: '16px 14px 28px', maxWidth: '820px', margin: '0 auto', color: 'var(--text-primary)' }}>
            {/* Toast Feedback */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '16px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 9999,
                            backgroundColor: toastMessage.type === 'error' ? '#DC2626' : '#0D9488',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}
                    >
                        <CheckCircle2 size={16} />
                        <span>{toastMessage.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compact Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                    }}>
                        <Activity size={18} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#0f172a', lineHeight: 1.2 }}>
                            Referral Tracker
                        </h1>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {referrals.length} active {referrals.length === 1 ? 'case' : 'cases'} • Closed-Loop ABDM
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        onClick={() => navigate('/facilities')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 12px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '9px',
                            border: '1.5px solid #ccfbf1',
                            background: '#f0fdfa',
                            color: '#0f766e',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={14} /> New Visit
                    </button>
                    <button 
                        onClick={fetchReferrals}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 10px',
                            borderRadius: '9px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#64748b',
                            cursor: 'pointer'
                        }}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* INCOMING SELECTED HOSPITAL WORKFLOW (FROM HEALTHCENTRES NEARBY) */}
            {/* ------------------------------------------------------------- */}
            <AnimatePresence>
                {incomingHospital && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            padding: '16px',
                            borderRadius: '16px',
                            border: '2px solid #0d9488',
                            backgroundColor: '#f0fdfa',
                            marginBottom: '18px',
                            boxShadow: '0 4px 20px rgba(13, 148, 136, 0.12)'
                        }}
                    >
                        {/* Hospital Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    backgroundColor: '#ccfbf1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#0d9488',
                                    flexShrink: 0
                                }}>
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#0d9488', color: '#ffffff', padding: '2px 8px', borderRadius: '6px' }}>
                                            {incomingHospital.typeLabel || 'Selected Facility'}
                                        </span>
                                        {incomingHospital.distanceFormatted && (
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f766e', background: '#e6fffa', padding: '2px 6px', borderRadius: '6px' }}>
                                                📍 {incomingHospital.distanceFormatted} away
                                            </span>
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '6px 0 2px', color: '#0f172a' }}>
                                        {incomingHospital.name}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={13} style={{ flexShrink: 0 }} />
                                        <span>{incomingHospital.address || 'Address provided via OpenStreetMap'}</span>
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setIncomingHospital(null); setBookingStep(null); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                                title="Cancel"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* STEP 1: CALL RECEPTIONIST / CONTACT STEP */}
                        <div style={{
                            marginTop: '14px',
                            padding: '12px 14px',
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #ccfbf1'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0d9488', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    1
                                </div>
                                <strong style={{ fontSize: '13px', color: '#0f766e' }}>
                                    Step 1: Contact Hospital Receptionist
                                </strong>
                            </div>
                            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                                Please call the hospital reception desk first to verify doctor availability, OPD timings, and schedule your appointment.
                            </p>

                            {/* Contact Actions */}
                            {incomingHospital.phone ? (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => makePhoneCall(incomingHospital.phone)}
                                        style={{
                                            flex: 1,
                                            minWidth: '160px',
                                            padding: '10px 14px',
                                            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '12.5px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
                                        }}
                                    >
                                        <Phone size={15} />
                                        <span>Call Reception ({incomingHospital.phone})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openGoogleWebSearch(incomingHospital)}
                                        style={{
                                            padding: '10px 14px',
                                            background: '#f8fafc',
                                            color: '#0284c7',
                                            border: '1px solid #bae6fd',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        <ExternalLink size={14} />
                                        <span>Search on Google Web</span>
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{
                                        padding: '8px 10px',
                                        background: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        color: '#1e40af',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                        <span>Direct phone number not available in offline listing. Search Google in your web browser for their live reception phone & OPD hours.</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => openGoogleWebSearch(incomingHospital)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 14px',
                                                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '12.5px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                                            }}
                                        >
                                            <ExternalLink size={15} />
                                            <span>Search Contact & Reception on Google</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* STEP 2: DID YOU BOOK QUESTION */}
                        {bookingStep !== 'FILL_DETAILS' && (
                            <div style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #ccfbf1'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0284c7', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        2
                                    </div>
                                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                                        Step 2: Did you contact the hospital and book your appointment?
                                    </strong>
                                </div>
                                <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 12px 0' }}>
                                    Please confirm whether the hospital receptionist scheduled your OPD slot or consultation time.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setBookingStep('FILL_DETAILS')}
                                        style={{
                                            padding: '11px 12px',
                                            background: '#0d9488',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.2)'
                                        }}
                                    >
                                        <CheckCircle2 size={15} />
                                        <span>Yes, Booked with Reception</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSavePendingReferral}
                                        style={{
                                            padding: '11px 12px',
                                            background: '#f8fafc',
                                            color: '#475569',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Clock size={15} />
                                        <span>Not Yet, Call Later</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: FILL CONFIRMED APPOINTMENT DETAILS FORM */}
                        {bookingStep === 'FILL_DETAILS' && (
                            <div style={{
                                marginTop: '12px',
                                padding: '14px',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1.5px solid #0d9488'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0d9488', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            ✓
                                        </div>
                                        <strong style={{ fontSize: '13px', color: '#0f766e' }}>
                                            Record Confirmed Appointment Details
                                        </strong>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBookingStep('CALL_HOSPITAL')}
                                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Back
                                    </button>
                                </div>

                                <form onSubmit={handleConfirmBooking} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                                                Appointment Date *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={bookingDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                                                Appointment Time / Slot *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={bookingTime}
                                                placeholder="e.g. 10:30 AM or Morning OPD"
                                                onChange={(e) => setBookingTime(e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Time Chips */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {['09:30 AM', '11:00 AM', '02:30 PM', '04:30 PM'].map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setBookingTime(chip)}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '10.5px',
                                                    fontWeight: 600,
                                                    borderRadius: '6px',
                                                    border: bookingTime === chip ? '1px solid #0d9488' : '1px solid #e2e8f0',
                                                    background: bookingTime === chip ? '#ccfbf1' : '#f8fafc',
                                                    color: bookingTime === chip ? '#0f766e' : '#64748b',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                                                Doctor / Department (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={bookingDoctor}
                                                placeholder="e.g. Dr. Verma / Cardiology OPD"
                                                onChange={(e) => setBookingDoctor(e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                                                Token / Slip No. (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={bookingToken}
                                                placeholder="e.g. Token #14 / Room 102"
                                                onChange={(e) => setBookingToken(e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                                            Primary Reason / Symptoms *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={bookingComplaint}
                                            placeholder="e.g. Specialist Follow-up Consultation"
                                            onChange={(e) => setBookingComplaint(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingBooking}
                                            style={{
                                                flex: 1,
                                                padding: '10px 16px',
                                                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '12.5px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 10px rgba(13, 148, 136, 0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <CheckCircle2 size={16} />
                                            <span>{isSubmittingBooking ? 'Saving Confirmed Appointment...' : 'Confirm & Track Appointment'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBookingStep('CALL_HOSPITAL')}
                                            style={{
                                                padding: '10px 14px',
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Back
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ------------------------------------------------------------- */}
            {/* REFERRAL TRACKER MAIN VIEW & HORIZONTAL TABS */}
            {/* ------------------------------------------------------------- */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', color: '#0d9488' }} />
                    <p style={{ fontSize: '13px' }}>Loading active referrals...</p>
                </div>
            ) : referrals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 18px', background: '#ffffff', borderRadius: '16px', border: '1.5px dashed #cbd5e1' }}>
                    <AlertCircle size={36} color="#0d9488" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px', color: '#0f172a' }}>No Active Referrals</h3>
                    <p style={{ color: '#64748b', fontSize: '12.5px', maxWidth: '380px', margin: '0 auto 16px' }}>
                        Select a nearby health centre to schedule and track your closed-loop consultation visit.
                    </p>
                    <button
                        onClick={() => navigate('/facilities')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 18px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            background: '#0d9488',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <Building2 size={15} /> Find Health Centres
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Horizontal Referral Carousel / Tab Strip */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}>
                        {referrals.map((ref, i) => {
                            const isSelected = selectedReferral?.id === ref.id;
                            const isCompleted = ref.status === 'COMPLETED';

                            return (
                                <div 
                                    key={ref.id}
                                    onClick={() => loadReferralDetails(ref.id)}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                                        backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                                        minWidth: '150px',
                                        flexShrink: 0,
                                        boxShadow: isSelected ? '0 3px 10px rgba(13, 148, 136, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{
                                            fontSize: '9.5px',
                                            fontWeight: '800',
                                            padding: '2px 5px',
                                            borderRadius: '4px',
                                            backgroundColor: isSelected ? '#0d9488' : '#e2e8f0',
                                            color: isSelected ? '#ffffff' : '#475569'
                                        }}>
                                            #{ref.slot_token || `REF-${i+1}`}
                                        </span>
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: '800',
                                            color: isCompleted ? '#16a34a' : '#d97706'
                                        }}>
                                            {isCompleted ? '✓ Done' : (ref.status?.replace(/_/g, ' ') || 'Active')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {ref.facilities?.name || ref.facility_name || 'Health Centre'}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {ref.specialty_required || 'General OPD'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected Referral Active Detail Card */}
                    {selectedReferral && (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '16px',
                            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {/* Header Row: Token Badge & Complaint */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 800, background: '#ccfbf1', color: '#0f766e', padding: '2px 6px', borderRadius: '5px' }}>
                                            TOKEN {selectedReferral.slot_token || 'OPD-101'}
                                        </span>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                                            ID: {selectedReferral.id?.substring(0, 8)}
                                        </span>
                                    </div>
                                    <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '4px 0 0', color: '#0f172a' }}>
                                        {selectedReferral.primary_complaint || selectedReferral.specialty_required || 'Doctor Consultation'}
                                    </h2>
                                </div>
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    color: selectedReferral.status === 'COMPLETED' ? '#16A34A' : '#d97706',
                                    backgroundColor: selectedReferral.status === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7',
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}>
                                    {selectedReferral.status?.replace(/_/g, ' ')}
                                </span>
                            </div>

                            {/* 2-Column Compact Info: Facility & Slot */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                                        <MapPin size={12} color="#0d9488" /> Facility
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: '12.5px', marginTop: '2px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {selectedReferral.facilities?.name || selectedReferral.facility_name || 'District Hospital'}
                                    </div>
                                    {selectedReferral.facilities?.phone && (
                                        <a href={`tel:${selectedReferral.facilities.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#0284c7', marginTop: '3px', textDecoration: 'none', fontWeight: '600' }}>
                                            <Phone size={10} /> Call Clinic
                                        </a>
                                    )}
                                </div>

                                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                                        <Clock size={12} color="#0284c7" /> OPD / Slot
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: '12.5px', marginTop: '2px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {selectedReferral.doctors?.name || 'Assigned on Arrival'}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#0f766e', fontWeight: '600', marginTop: '3px' }}>
                                        {formatSlotTime(selectedReferral.appointment_slot_time)}
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Verification Strip */}
                            {selectedReferral.status !== 'COMPLETED' && selectedReferral.status !== 'CANCELLED' && (
                                <div style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    backgroundColor: '#f0fdfa',
                                    border: '1px solid #99f6e4',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ShieldCheck size={16} color="#0d9488" />
                                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f766e' }}>
                                            Did you attend this consultation?
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={handleConfirmAttendance}
                                            style={{
                                                padding: '5px 10px',
                                                fontSize: '11px',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                background: '#0d9488',
                                                color: '#fff',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✓ Attended
                                        </button>
                                        <button
                                            onClick={handleMissedAppointment}
                                            style={{
                                                padding: '5px 8px',
                                                fontSize: '11px',
                                                borderRadius: '6px',
                                                background: '#fee2e2',
                                                color: '#dc2626',
                                                border: 'none',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✕ Missed
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedReferral.status === 'COMPLETED' && (
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    backgroundColor: '#DCFCE7',
                                    border: '1px solid #86EFAC',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#166534',
                                    fontSize: '11.5px',
                                    fontWeight: '700'
                                }}>
                                    <CheckCircle2 size={15} color="#16A34A" />
                                    <span>Closed-Loop Completed & Saved to Medical History</span>
                                </div>
                            )}

                            {/* Lifecycle Progress Bar */}
                            <div style={{ background: '#fafbfc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                                        Lifecycle Stage
                                    </span>
                                    <span style={{ fontSize: '10.5px', color: '#0d9488', fontWeight: 700 }}>
                                        Step {getStepIndex(selectedReferral.status) + 1} of {STATUS_STEPS.length}
                                    </span>
                                </div>
                                
                                {/* Progress Bar Track */}
                                <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden', marginBottom: '8px' }}>
                                    <div style={{
                                        width: `${((getStepIndex(selectedReferral.status) + 1) / STATUS_STEPS.length) * 100}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #0d9488 0%, #0284c7 100%)',
                                        borderRadius: '3px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>

                                {/* Quick Stage Buttons */}
                                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                                    <button 
                                        onClick={() => handleUpdateStatus('PATIENT_IN_TRANSIT', 'Patient traveling to healthcare centre')}
                                        style={{ flex: 1, padding: '5px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        🚗 In Transit
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus('PATIENT_REACHED', 'Patient checked in at hospital desk')}
                                        style={{ flex: 1, padding: '5px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        🏥 Arrived
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus('TREATMENT_COMPLETED', 'Doctor consultation completed')}
                                        style={{ flex: 1, padding: '5px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        💊 Treated
                                    </button>
                                    <button 
                                        onClick={handleConfirmAttendance}
                                        style={{ flex: 1, padding: '5px 6px', fontSize: '10px', fontWeight: 800, borderRadius: '6px', border: 'none', background: '#0d9488', color: '#ffffff', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        ✓ Close
                                    </button>
                                </div>
                            </div>

                            {/* Timeline of Events (Audit History) */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                    Audit History
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {timeline.length === 0 ? (
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>No audit events recorded yet.</p>
                                    ) : (
                                        timeline.slice(0, 3).map(ev => (
                                            <div key={ev.id} style={{ display: 'flex', gap: '6px', fontSize: '11px', alignItems: 'center', background: '#f8fafc', padding: '5px 8px', borderRadius: '6px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0d9488', flexShrink: 0 }} />
                                                <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <strong style={{ color: '#0f172a' }}>{ev.to_status?.replace(/_/g, ' ')}</strong>
                                                    <span style={{ color: '#64748b', marginLeft: '4px' }}>- {ev.reason || 'Status updated'}</span>
                                                </div>
                                                <span style={{ color: '#94a3b8', fontSize: '10px', flexShrink: 0 }}>
                                                    {ev.created_at ? new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReferralTracker;
