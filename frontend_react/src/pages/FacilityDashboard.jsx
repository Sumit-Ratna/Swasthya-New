import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Bed, Stethoscope, AlertTriangle, CheckCircle2,
    Clock, Users, Activity, RefreshCw, Flame, Wind, Droplets,
    Phone, ChevronRight, Check, Search, ShieldCheck, Ambulance,
    ArrowRight, UserCheck, Plus, Filter, Zap, Calendar, HeartPulse,
    FileText, Sparkles, Navigation, Send, Radio, Lock, CheckCircle
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';

const FacilityDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Tabs: 'catalog' (Hospital Facilities), 'booking' (Book Bed / Service), 'tracker' (Live Booking Tracker), 'ops' (Staff Operations)
    const [activeTab, setActiveTab] = useState('catalog');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Selected Hospital for viewing details / booking
    const [selectedHospitalId, setSelectedHospitalId] = useState('hosp-pune');

    // Bed Booking Form State
    const [bookingForm, setBookingForm] = useState({
        patientName: '',
        patientPhone: '',
        patientAbha: '',
        age: '35',
        gender: 'Male',
        facilityId: 'hosp-pune',
        serviceType: 'ICU_BED', // 'ICU_BED', 'OXYGEN_BED', 'GENERAL_WARD', 'NICU_BED', 'OPD_SPECIALIST', 'CT_MRI_SCAN', 'DIALYSIS'
        urgency: 'URGENT_HIGH', // 'EMERGENCY_CRITICAL', 'URGENT_HIGH', 'ROUTINE'
        symptoms: '',
        preferredDate: new Date().toISOString().split('T')[0]
    });

    // Active Bookings Store (with initial sample bookings)
    const [bookingsList, setBookingsList] = useState([
        {
            id: 'HOSP-PUN-84920',
            patientName: 'Rameshwar Patil',
            patientPhone: '9876543210',
            abhaId: '91-8492-4589-7080',
            hospitalName: 'Pune District General Hospital',
            serviceType: 'ICU Bed (Cardiac Monitoring)',
            urgency: 'EMERGENCY_CRITICAL',
            bedNumber: 'ICU-Bed #04',
            assignedDoctor: 'Dr. Anita Joshi (Cardiologist)',
            status: 'BED_RESERVED',
            statusStep: 3,
            bookedAt: 'Today, 10:30 AM',
            timeline: [
                { stage: 'BOOKING_SUBMITTED', title: 'Booking Received', time: '10:30 AM', done: true, desc: 'Request logged via Swasthya Citizen Gateway.' },
                { stage: 'TRIAGE_VERIFIED', title: 'Triage Risk Verified', time: '10:34 AM', done: true, desc: 'Medical Officer confirmed Emergency Tier 1.' },
                { stage: 'BED_RESERVED', title: 'Bed #ICU-04 Reserved', time: '10:38 AM', done: true, desc: 'ICU Bed locked under Dr. Anita Joshi.' },
                { stage: 'PATIENT_IN_TRANSIT', title: 'Patient In-Transit', time: 'Pending ETA', done: false, desc: '108 Ambulance en route to hospital emergency bay.' },
                { stage: 'ADMITTED_ACTIVE_CARE', title: 'Admitted & Active Care', time: 'Pending Arrival', done: false, desc: 'Intake examination & active clinical protocol.' }
            ]
        },
        {
            id: 'HOSP-BAR-71204',
            patientName: 'Sunita Deshmukh',
            patientPhone: '9822334455',
            abhaId: '91-7120-9944-1122',
            hospitalName: 'Rural Hospital Baramati',
            serviceType: 'Oxygen-Supported Inpatient Bed',
            urgency: 'URGENT_HIGH',
            bedNumber: 'Ward-B, Bed #12',
            assignedDoctor: 'Dr. Rajesh Deshpande',
            status: 'PATIENT_IN_TRANSIT',
            statusStep: 4,
            bookedAt: 'Today, 09:15 AM',
            timeline: [
                { stage: 'BOOKING_SUBMITTED', title: 'Booking Received', time: '09:15 AM', done: true, desc: 'Request logged by ASHA worker Sumitra.' },
                { stage: 'TRIAGE_VERIFIED', title: 'Triage Risk Verified', time: '09:20 AM', done: true, desc: 'SpO2 91% flagged for high-flow oxygen.' },
                { stage: 'BED_RESERVED', title: 'Bed #12 Reserved', time: '09:25 AM', done: true, desc: 'Oxygen bed pre-warmed in Ward B.' },
                { stage: 'PATIENT_IN_TRANSIT', title: 'Patient In-Transit', time: '09:40 AM', done: true, desc: 'Patient in transit via rural transport.' },
                { stage: 'ADMITTED_ACTIVE_CARE', title: 'Admitted & Active Care', time: 'Expected 10:15 AM', done: false, desc: 'Nurse triage check-in ready.' }
            ]
        }
    ]);

    // Active Tracking State
    const [searchToken, setSearchToken] = useState('HOSP-PUN-84920');
    const [activeTrackedBooking, setActiveTrackedBooking] = useState(bookingsList[0]);

    // Hospitals Master Data with complete facilities directory
    const hospitalsData = [
        {
            id: 'hosp-pune',
            name: 'Pune District General Hospital',
            type: 'District Hospital (Tertiary Multi-Specialty Hub)',
            district: 'Pune, Maharashtra',
            contact: '+91 20 2612 3456',
            emergencyHotline: '108 / 102',
            address: 'Station Road, Pune Medical Enclave, Pune - 411001',
            telemetryUpdated: '4 mins ago',
            operationalStatus: 'OPTIMAL_ACTIVE',
            bedStats: {
                totalBeds: 450,
                occupiedBeds: 368,
                availableBeds: 82,
                icuBeds: { total: 40, occupied: 34, available: 6 },
                oxygenBeds: { total: 150, occupied: 118, available: 32 },
                generalBeds: { total: 200, occupied: 172, available: 28 },
                nicuBeds: { total: 20, occupied: 14, available: 6 },
                dialysisUnits: { total: 12, occupied: 9, available: 3 }
            },
            facilitiesCatalog: [
                { name: '24x7 Level-1 Emergency & Trauma Bay', icon: 'Ambulance', desc: '4 Resuscitation bays, cardiac defibrillators, point-of-care ultrasound.' },
                { name: 'Intensive Coronary Care Unit (ICCU / ICU)', icon: 'HeartPulse', desc: '40 Advanced ventilator-supported beds with 24x7 intensivist coverage.' },
                { name: 'Neonatal & Pediatric Intensive Care (NICU)', icon: 'Users', desc: '20 Warmers, phototherapy units and neonatal CPAP ventilators.' },
                { name: 'Advanced Radiology & Imaging Complex', icon: 'Activity', desc: '128-Slice Multidetector CT, 1.5 Tesla MRI, 3D Ultrasound & Digital X-Ray.' },
                { name: '24x7 In-House Blood Bank & Component Separation', icon: 'Droplets', desc: 'Platelets, Fresh Frozen Plasma (FFP), Packed Red Blood Cells (PRBC).' },
                { name: 'Central Pathology & Molecular Diagnostics', icon: 'FileText', desc: 'Automated biochemistry, lipid panels, hematology & viral RT-PCR tests.' },
                { name: 'Hemodialysis Unit', icon: 'Wind', desc: '12 High-flux dialysis stations with dedicated RO water plant.' },
                { name: 'Dedicated Liquid Medical Oxygen (LMO) Plant', icon: 'Flame', desc: '20,000 Liter cryogenic tank delivering 99.5% medical oxygen pipeline.' }
            ]
        },
        {
            id: 'hosp-baramati',
            name: 'Rural Hospital Baramati',
            type: 'Sub-District Hospital (Secondary Care)',
            district: 'Pune District, Maharashtra',
            contact: '+91 2112 222100',
            emergencyHotline: '108',
            address: 'MIDC Health Complex, Baramati - 413133',
            telemetryUpdated: '12 mins ago',
            operationalStatus: 'OPTIMAL_ACTIVE',
            bedStats: {
                totalBeds: 120,
                occupiedBeds: 78,
                availableBeds: 42,
                icuBeds: { total: 10, occupied: 7, available: 3 },
                oxygenBeds: { total: 40, occupied: 24, available: 16 },
                generalBeds: { total: 60, occupied: 42, available: 18 },
                nicuBeds: { total: 5, occupied: 2, available: 3 },
                dialysisUnits: { total: 4, occupied: 3, available: 1 }
            },
            facilitiesCatalog: [
                { name: '24x7 Emergency Stabilization & Triage', icon: 'Ambulance', desc: 'Emergency intake with instant tele-triage connection to District Hub.' },
                { name: 'Secondary Care ICU & High-Dependency Unit', icon: 'HeartPulse', desc: '10 Monitor-equipped beds for acute stabilization.' },
                { name: 'Maternal & Child Health Care (OB-GYN)', icon: 'Users', desc: 'Comprehensive obstetric care, normal delivery & emergency C-section suites.' },
                { name: 'Digital Diagnostic X-Ray & Ultrasound', icon: 'Activity', desc: 'Emergency X-ray, obstetric sonography & basic pathology.' },
                { name: 'Daycare Dialysis Unit', icon: 'Wind', desc: '4 Hemodialysis beds under weekly nephrologist rounds.' },
                { name: 'PSA Oxygen Generator Plant', icon: 'Flame', desc: '500 LPM on-site oxygen generation with cylinder manifold backup.' }
            ]
        },
        {
            id: 'hosp-shirwal',
            name: 'Primary Health Centre Shirwal',
            type: 'PHC (24x7 Primary Care & Delivery Hub)',
            district: 'Satara District, Maharashtra',
            contact: '+91 2169 244222',
            emergencyHotline: '102 / 108',
            address: 'National Highway 48, Shirwal - 412801',
            telemetryUpdated: '18 mins ago',
            operationalStatus: 'OPTIMAL_ACTIVE',
            bedStats: {
                totalBeds: 30,
                occupiedBeds: 11,
                availableBeds: 19,
                icuBeds: { total: 2, occupied: 0, available: 2 },
                oxygenBeds: { total: 10, occupied: 4, available: 6 },
                generalBeds: { total: 16, occupied: 7, available: 9 },
                nicuBeds: { total: 2, occupied: 0, available: 2 },
                dialysisUnits: { total: 0, occupied: 0, available: 0 }
            },
            facilitiesCatalog: [
                { name: '24x7 Delivery & Postnatal Ward', icon: 'Users', desc: 'Government institutional delivery center with newborn resuscitation warmers.' },
                { name: 'First-Line Emergency Stabilization Room', icon: 'Ambulance', desc: 'Oxygen concentrators, nebulization & acute wound management.' },
                { name: 'eSanjeevani Tele-Consultation Room', icon: 'Stethoscope', desc: 'Daily video-consultation with District Hospital specialists.' },
                { name: 'Essential Drug Dispensing Pharmacy', icon: 'CheckCircle2', desc: 'Free distribution of 150+ essential NLEM medications.' },
                { name: 'Immunization & RCH Cold-Chain Unit', icon: 'Droplets', desc: 'Deep freezers & ILR for universal vaccine storage.' }
            ]
        }
    ];

    const currentHospital = hospitalsData.find(h => h.id === selectedHospitalId) || hospitalsData[0];

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4500);
    };

    // Handle New Bed / Service Booking
    const handleCreateBooking = (e) => {
        e.preventDefault();
        if (!bookingForm.patientName || !bookingForm.patientPhone) {
            alert('Please fill in patient name and phone number.');
            return;
        }

        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const newBookingId = `HOSP-${currentHospital.name.slice(0, 3).toUpperCase()}-${randomSuffix}`;
        
        const serviceLabel = bookingForm.serviceType === 'ICU_BED' ? 'ICU Bed (Ventilator Support)' :
            bookingForm.serviceType === 'OXYGEN_BED' ? 'Oxygen-Supported Inpatient Bed' :
            bookingForm.serviceType === 'GENERAL_WARD' ? 'General Inpatient Ward Bed' :
            bookingForm.serviceType === 'NICU_BED' ? 'Neonatal ICU (NICU) Bed' :
            bookingForm.serviceType === 'CT_MRI_SCAN' ? 'Advanced CT / MRI Scan' :
            bookingForm.serviceType === 'DIALYSIS' ? 'Hemodialysis Slot' : 'OPD Specialist Consultation';

        const newBooking = {
            id: newBookingId,
            patientName: bookingForm.patientName,
            patientPhone: bookingForm.patientPhone,
            abhaId: bookingForm.patientAbha || `91-${randomSuffix.toString().slice(0, 4)}-7080`,
            hospitalName: currentHospital.name,
            serviceType: serviceLabel,
            urgency: bookingForm.urgency,
            bedNumber: bookingForm.serviceType.includes('BED') ? `Bed #${bookingForm.serviceType.slice(0, 3)}-${randomSuffix.toString().slice(-2)}` : 'N/A (Outpatient Slot)',
            assignedDoctor: 'Duty Medical Officer',
            status: 'TRIAGE_VERIFIED',
            statusStep: 2,
            bookedAt: 'Just Now',
            timeline: [
                { stage: 'BOOKING_SUBMITTED', title: 'Booking Received', time: 'Just Now', done: true, desc: `Request submitted for ${currentHospital.name}.` },
                { stage: 'TRIAGE_VERIFIED', title: 'Triage Risk Verified', time: 'Just Now', done: true, desc: `Urgency level: ${bookingForm.urgency.replace('_', ' ')}.` },
                { stage: 'BED_RESERVED', title: 'Bed Reservation in Progress', time: 'Next 5 Mins', done: false, desc: 'Central coordinator allocating ward bed.' },
                { stage: 'PATIENT_IN_TRANSIT', title: 'Patient In-Transit', time: 'Pending', done: false, desc: '108 ambulance / travel dispatch coordinates.' },
                { stage: 'ADMITTED_ACTIVE_CARE', title: 'Admitted & Active Care', time: 'Pending Arrival', done: false, desc: 'Formal check-in at hospital intake desk.' }
            ]
        };

        setBookingsList([newBooking, ...bookingsList]);
        setActiveTrackedBooking(newBooking);
        setSearchToken(newBookingId);
        setActiveTab('tracker');
        showToast(`🎉 Booking Confirmed! Token: ${newBookingId} generated with live tracking.`);
    };

    const handleSearchTracker = (e) => {
        e.preventDefault();
        const term = searchToken.trim().toLowerCase();
        const found = bookingsList.find(b => b.id.toLowerCase() === term || b.patientPhone.includes(term) || b.patientName.toLowerCase().includes(term));
        if (found) {
            setActiveTrackedBooking(found);
            showToast(`Tracking status loaded for ${found.patientName} (${found.id})`);
        } else {
            alert('No booking found matching this token or phone number. Try HOSP-PUN-84920');
        }
    };

    // Advance Booking Step (for staff simulation)
    const handleAdvanceBookingStep = (bookingId) => {
        setBookingsList(prev => prev.map(b => {
            if (b.id === bookingId) {
                const nextStep = Math.min(5, (b.statusStep || 1) + 1);
                const nextStatus = nextStep === 3 ? 'BED_RESERVED' : nextStep === 4 ? 'PATIENT_IN_TRANSIT' : nextStep === 5 ? 'ADMITTED_ACTIVE_CARE' : b.status;
                const updatedTimeline = b.timeline.map((item, idx) => ({
                    ...item,
                    done: idx < nextStep,
                    time: idx < nextStep ? (item.time.includes('Pending') ? 'Just Now' : item.time) : item.time
                }));
                const updated = { ...b, statusStep: nextStep, status: nextStatus, timeline: updatedTimeline };
                if (activeTrackedBooking?.id === bookingId) {
                    setActiveTrackedBooking(updated);
                }
                return updated;
            }
            return b;
        }));
        showToast("Booking lifecycle transitioned to next canonical stage!");
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8fafc',
            color: '#0f172a',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Top Navigation & Hospital Facility Hero Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #0d53ba 0%, #033a8c 100%)',
                color: '#ffffff',
                padding: '24px 20px 0 20px',
                boxShadow: '0 4px 20px rgba(13, 83, 186, 0.25)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {/* Header Top Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Building2 size={24} color="#ffffff" />
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.3px', color: '#ffffff' }}>
                                        Hospital Facility & Bed Command Center
                                    </h1>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
                                        Public Hospital Infrastructure, Live Bed Telemetry & Citizen Booking Hub
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Hospital Selector Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Select Hospital:</span>
                            <select
                                value={selectedHospitalId}
                                onChange={(e) => setSelectedHospitalId(e.target.value)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    border: '1.5px solid rgba(255,255,255,0.4)',
                                    background: 'rgba(255,255,255,0.15)',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {hospitalsData.map(h => (
                                    <option key={h.id} value={h.id} style={{ color: '#0f172a', background: '#ffffff' }}>
                                        {h.name} ({h.district})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Navigation Tabs Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflowX: 'auto',
                        scrollbarWidth: 'none'
                    }}>
                        {[
                            { id: 'catalog', label: 'Hospital Facilities Directory', icon: Building2 },
                            { id: 'booking', label: 'Book Bed & Services', icon: Plus },
                            { id: 'tracker', label: 'Live Booking Tracker', icon: Radio, badge: `${bookingsList.length} Active` },
                            { id: 'ops', label: 'Hospital Staff Bed Operations', icon: Activity }
                        ].map((t) => {
                            const Icon = t.icon;
                            const isActive = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 18px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: isActive ? '3px solid #facc15' : '3px solid transparent',
                                        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                                        fontWeight: isActive ? '700' : '500',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Icon size={16} />
                                    <span>{t.label}</span>
                                    {t.badge && (
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: isActive ? '#facc15' : 'rgba(255,255,255,0.2)',
                                            color: isActive ? '#0f172a' : '#ffffff',
                                            fontWeight: '700'
                                        }}>
                                            {t.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 80px 16px' }}>
                {/* Toast Notification Banner */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed',
                                top: '20px',
                                right: '20px',
                                zIndex: 9999,
                                background: '#065f46',
                                color: '#ffffff',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '13px',
                                fontWeight: '600'
                            }}
                        >
                            <CheckCircle size={17} color="#34d399" />
                            <span>{toastMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* TAB 1: HOSPITAL FACILITIES DIRECTORY */}
                {activeTab === 'catalog' && (
                    <div>
                        {/* Hospital Overview Card */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: '6px' }}>
                                        {currentHospital.type}
                                    </span>
                                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '8px 0 4px 0', color: '#0f172a' }}>
                                        {currentHospital.name}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                        📍 {currentHospital.address} • 📞 {currentHospital.contact} • 🚑 Emergency: {currentHospital.emergencyHotline}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setActiveTab('booking')}
                                    style={{
                                        background: 'linear-gradient(135deg, #0d53ba 0%, #0284c7 100%)',
                                        color: '#ffffff',
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 12px rgba(13, 83, 186, 0.25)'
                                    }}
                                >
                                    <Plus size={16} />
                                    <span>Book Bed / Service at This Hospital</span>
                                </button>
                            </div>

                            {/* Live Bed Occupancy Gauges (4 Metrics) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '12px',
                                paddingTop: '16px',
                                borderTop: '1px solid #f1f5f9'
                            }}>
                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>TOTAL INPATIENT BEDS</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                                        {currentHospital.bedStats.availableBeds} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>/ {currentHospital.bedStats.totalBeds} Available</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>● Ready for Intake</div>
                                </div>

                                <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>ICU & VENTILATORS</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626' }}>
                                        {currentHospital.bedStats.icuBeds.available} <span style={{ fontSize: '12px', fontWeight: '500', color: '#991b1b' }}>/ {currentHospital.bedStats.icuBeds.total} Available</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>
                                        {currentHospital.bedStats.icuBeds.available > 0 ? '● ICU Team Active' : '⚠ High Load ICU'}
                                    </div>
                                </div>

                                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>HIGH-FLOW OXYGEN BEDS</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a' }}>
                                        {currentHospital.bedStats.oxygenBeds.available} <span style={{ fontSize: '12px', fontWeight: '500', color: '#166534' }}>/ {currentHospital.bedStats.oxygenBeds.total} Available</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>● 100% Pipeline Purity</div>
                                </div>

                                <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>NICU / PEDIATRIC BEDS</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7' }}>
                                        {currentHospital.bedStats.nicuBeds.available} <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e40af' }}>/ {currentHospital.bedStats.nicuBeds.total} Available</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600', marginTop: '2px' }}>● Pediatrician on Duty</div>
                                </div>
                            </div>
                        </div>

                        {/* All Hospital Facilities Detailed Grid */}
                        <div style={{ marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
                                Specialized Facilities & Clinical Infrastructure at {currentHospital.name}
                            </h3>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '16px'
                        }}>
                            {currentHospital.facilitiesCatalog.map((fac, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                        display: 'flex',
                                        gap: '14px',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: '#eff6ff',
                                        color: '#0d53ba',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <HeartPulse size={20} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                            {fac.name}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                                            {fac.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 2: BOOK BED & SERVICES (PATIENT / CITIZEN / ASHA) */}
                {activeTab === 'booking' && (
                    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '18px',
                            padding: '28px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#dbeafe',
                                    color: '#0d53ba',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Bed size={20} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                        Book Hospital Bed / Clinical Service
                                    </h2>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                        Direct priority booking for citizens, patients and ASHA field workers
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {/* Hospital Target Selection */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                        Target Healthcare Facility *
                                    </label>
                                    <select
                                        value={selectedHospitalId}
                                        onChange={(e) => setSelectedHospitalId(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#0f172a',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {hospitalsData.map(h => (
                                            <option key={h.id} value={h.id}>
                                                {h.name} — {h.bedStats.availableBeds} Inpatient Beds Free
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Patient Demographics (2 Cols) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            Patient Full Name (मरीज का पूरा नाम) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={bookingForm.patientName}
                                            onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                                            placeholder="e.g. Rameshwar Patil"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            Contact Mobile Number (मोबाइल नंबर) *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={bookingForm.patientPhone}
                                            onChange={(e) => setBookingForm({ ...bookingForm, patientPhone: e.target.value })}
                                            placeholder="10-digit mobile number"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Service Type & Urgency Level */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            Required Service / Bed Type *
                                        </label>
                                        <select
                                            value={bookingForm.serviceType}
                                            onChange={(e) => setBookingForm({ ...bookingForm, serviceType: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="ICU_BED">🚨 ICU Bed (Ventilator / Cardiac Support)</option>
                                            <option value="OXYGEN_BED">💨 High-Flow Oxygen-Supported Bed</option>
                                            <option value="GENERAL_WARD">🛏️ General Inpatient Ward Bed</option>
                                            <option value="NICU_BED">👶 Neonatal ICU (NICU) Bed</option>
                                            <option value="CT_MRI_SCAN">🔬 Diagnostic Radiology (CT / MRI Scan)</option>
                                            <option value="DIALYSIS">🩸 Hemodialysis Session</option>
                                            <option value="OPD_SPECIALIST">👨‍⚕️ Specialist OPD Consultation</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            Clinical Urgency Level *
                                        </label>
                                        <select
                                            value={bookingForm.urgency}
                                            onChange={(e) => setBookingForm({ ...bookingForm, urgency: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                color: bookingForm.urgency === 'EMERGENCY_CRITICAL' ? '#dc2626' : '#0f172a',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="EMERGENCY_CRITICAL">🔴 Emergency (Immediate Resuscitation / Trauma)</option>
                                            <option value="URGENT_HIGH">🟠 Urgent (Admission required within 2 hrs)</option>
                                            <option value="ROUTINE">🟢 Routine (Planned Admission / Consultation)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* ABHA ID & Symptoms */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            ABHA ID / ABDM Health Address (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={bookingForm.patientAbha}
                                            onChange={(e) => setBookingForm({ ...bookingForm, patientAbha: e.target.value })}
                                            placeholder="e.g. 91-8492-4589-7080 or name@abdm"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                            Chief Symptoms / Referral Reason
                                        </label>
                                        <input
                                            type="text"
                                            value={bookingForm.symptoms}
                                            onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                                            placeholder="e.g. Severe chest pain, dyspnea, SpO2 89%"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    style={{
                                        marginTop: '10px',
                                        padding: '14px 20px',
                                        background: 'linear-gradient(135deg, #0d53ba 0%, #0284c7 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 16px rgba(13, 83, 186, 0.35)'
                                    }}
                                >
                                    <CheckCircle size={18} />
                                    <span>Confirm Bed / Service Reservation & Generate Token</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* TAB 3: LIVE BOOKING TRACKER */}
                {activeTab === 'tracker' && (
                    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                        {/* Search Token Bar */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '18px 24px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            <Search size={20} color="#64748b" />
                            <input
                                type="text"
                                value={searchToken}
                                onChange={(e) => setSearchToken(e.target.value)}
                                placeholder="Enter Booking Token (e.g. HOSP-PUN-84920) or Mobile Number"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#0f172a'
                                }}
                            />
                            <button
                                onClick={handleSearchTracker}
                                style={{
                                    background: '#0d53ba',
                                    color: '#ffffff',
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Track Status
                            </button>
                        </div>

                        {/* Active Tracking Details Card */}
                        {activeTrackedBooking && (
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '18px',
                                padding: '28px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                            }}>
                                {/* Header of Booking */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0d53ba', background: '#dbeafe', padding: '4px 10px', borderRadius: '6px' }}>
                                                TOKEN: {activeTrackedBooking.id}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: activeTrackedBooking.urgency.includes('CRITICAL') ? '#fee2e2' : '#fef3c7',
                                                color: activeTrackedBooking.urgency.includes('CRITICAL') ? '#dc2626' : '#b45309'
                                            }}>
                                                {activeTrackedBooking.urgency.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '8px 0 2px 0', color: '#0f172a' }}>
                                            {activeTrackedBooking.patientName}
                                        </h2>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                            🏥 {activeTrackedBooking.hospitalName} • 🛏️ {activeTrackedBooking.serviceType}
                                        </p>
                                    </div>

                                    {/* Action button to simulate real-time advancement */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleAdvanceBookingStep(activeTrackedBooking.id)}
                                            style={{
                                                background: '#eff6ff',
                                                color: '#1d4ed8',
                                                border: '1.5px solid #3b82f6',
                                                padding: '8px 14px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Zap size={14} />
                                            <span>Simulate Next Stage →</span>
                                        </button>
                                        <button
                                            onClick={() => showToast(`📱 SMS / WhatsApp update sent to ${activeTrackedBooking.patientPhone}!`)}
                                            style={{
                                                background: '#f0fdf4',
                                                color: '#166534',
                                                border: '1.5px solid #22c55e',
                                                padding: '8px 14px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Send size={14} />
                                            <span>Push SMS Alert</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Patient & Assigned Bed Info Pill */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '12px',
                                    margin: '20px 0',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ASSIGNED BED & WARD</span>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                                            {activeTrackedBooking.bedNumber}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ATTENDING SPECIALIST</span>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                                            {activeTrackedBooking.assignedDoctor}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ABHA IDENTIFIER</span>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7', marginTop: '2px' }}>
                                            {activeTrackedBooking.abhaId}
                                        </div>
                                    </div>
                                </div>

                                {/* 5-Stage Live Timeline */}
                                <div style={{ marginTop: '28px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '18px' }}>
                                        Live Referral & Bed Admission Timeline
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '8px' }}>
                                        {activeTrackedBooking.timeline.map((step, idx) => {
                                            const isDone = step.done;
                                            const isCurrent = (activeTrackedBooking.statusStep || 1) === (idx + 1);
                                            return (
                                                <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}>
                                                    {/* Timeline Node Icon */}
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: isDone ? '#16a34a' : isCurrent ? '#0d53ba' : '#e2e8f0',
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: '700',
                                                        fontSize: '13px',
                                                        zIndex: 2,
                                                        flexShrink: 0
                                                    }}>
                                                        {isDone ? <Check size={16} /> : (idx + 1)}
                                                    </div>

                                                    {/* Step Description */}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                            <span style={{
                                                                fontSize: '14px',
                                                                fontWeight: isDone || isCurrent ? '700' : '500',
                                                                color: isDone ? '#0f172a' : isCurrent ? '#0d53ba' : '#94a3b8'
                                                            }}>
                                                                {step.title}
                                                            </span>
                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: isDone ? '#16a34a' : '#94a3b8' }}>
                                                                {step.time}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                                            {step.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: HOSPITAL STAFF OPERATIONS (BED & TRIAGE ADMISSION) */}
                {activeTab === 'ops' && (
                    <div>
                        {/* Operations Control Bar */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '20px 24px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                                        Facility Intake & Bed Queue Management
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                        Hospital staff desk for processing arrivals, bed locking and discharge handover
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={() => showToast("Hospital bed telemetry synchronized with State District Command!")}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            color: '#0f172a',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <RefreshCw size={14} />
                                        <span>Sync Bed Telemetry</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Inbound Patient Admissions Queue Table */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                                Active Inbound Patient Queue ({bookingsList.length} Referrals / Bookings)
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                                            <th style={{ padding: '12px 16px' }}>Token ID</th>
                                            <th style={{ padding: '12px 16px' }}>Patient Details</th>
                                            <th style={{ padding: '12px 16px' }}>Service / Bed</th>
                                            <th style={{ padding: '12px 16px' }}>Urgency</th>
                                            <th style={{ padding: '12px 16px' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookingsList.map((b) => (
                                            <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0d53ba' }}>
                                                    {b.id}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{b.patientName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {b.patientPhone}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: '600', color: '#334155' }}>{b.serviceType}</div>
                                                    <div style={{ fontSize: '11px', color: '#0284c7' }}>{b.bedNumber}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: b.urgency.includes('CRITICAL') ? '#fee2e2' : '#fef3c7',
                                                        color: b.urgency.includes('CRITICAL') ? '#dc2626' : '#b45309'
                                                    }}>
                                                        {b.urgency.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: b.status === 'ADMITTED_ACTIVE_CARE' ? '#dcfce7' : '#e0f2fe',
                                                        color: b.status === 'ADMITTED_ACTIVE_CARE' ? '#166534' : '#0284c7'
                                                    }}>
                                                        {b.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleAdvanceBookingStep(b.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: '#0d53ba',
                                                            color: '#ffffff',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Advance Status →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacilityDashboard;
