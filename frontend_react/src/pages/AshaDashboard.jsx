import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Phone, Building2, Calendar, Clock, UserPlus,
    Search, Shield, Activity, RefreshCw, CheckCircle2,
    AlertTriangle, ChevronRight, Navigation, Sparkles, X,
    Check, Users, ExternalLink, Share2, QrCode, PhoneCall,
    Sliders, ArrowUpRight, Wifi, WifiOff, Stethoscope, HeartPulse,
    Send, Info, Compass, AlertCircle, FileText
} from 'lucide-react';
import axios from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
    fetchNearbyOsmHealthcare,
    calculateHaversineDistance,
    formatDistance,
    getFacilitiesFromLocalCache,
    saveFacilitiesToLocalCache
} from '../services/osmHealthcareService';

const OFFLINE_APPOINTMENTS_KEY = 'swasthya_asha_offline_appointments';

const AshaDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Active Dashboard Tabs: 'locator' (Hospital Finder & Calling) | 'book' (Assisted Booking) | 'passes' (Visit Schedule & Passes) | 'emergency' (108 Ambulance & ICU)
    const [activeTab, setActiveTab] = useState('locator');

    // Network & GPS State
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [userGps, setUserGps] = useState({ lat: 28.3588, lon: 77.5516, accuracy: 15, name: 'Dankaur / Greater Noida Catchment' });
    const [detectingGps, setDetectingGps] = useState(false);
    const [searchRadius, setSearchRadius] = useState(15000); // 15 km default
    const [facilityFilter, setFacilityFilter] = useState('all'); // 'all' | 'hospital' | 'clinic' | 'government' | 'emergency'

    // Facilities & Hospitals State
    const [facilities, setFacilities] = useState([]);
    const [loadingFacilities, setLoadingFacilities] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
    const [searchQuery, setSearchQuery] = useState('');

    // Assisted Appointment Booking Modal & Form State
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingForm, setBookingForm] = useState({
        patientName: '',
        patientPhone: '',
        patientAge: '',
        patientGender: 'Female',
        patientAbha: '',
        primaryComplaint: '',
        urgency: 'ROUTINE', // 'ROUTINE' | 'PRIORITY' | 'EMERGENCY'
        selectedFacilityId: '',
        selectedFacilityName: '',
        selectedFacilityPhone: '',
        selectedFacilityAddress: '',
        selectedFacilityLat: null,
        selectedFacilityLon: null,
        department: 'General Medicine',
        appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        timeSlot: '10:00 AM - 12:00 PM',
        ashaNotes: 'Patient assisted by ASHA worker. No personal smartphone available.'
    });
    const [bookingSubmitting, setBookingSubmitting] = useState(false);
    const [bookingSuccessModal, setBookingSuccessModal] = useState(null);

    // Booked Assisted Appointments List (Supabase + Offline SQLite/LocalStorage)
    const [appointments, setAppointments] = useState([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [offlineQueueCount, setOfflineQueueCount] = useState(0);
    const [syncingOffline, setSyncingOffline] = useState(false);
    const [syncSuccessToast, setSyncSuccessToast] = useState(false);

    // Hospital Bed & Facility Verification Checklist Tracker
    const [hospitalReadiness, setHospitalReadiness] = useState({});

    // Network status listener
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncOfflineAppointments();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Initial GPS Location Detection & Data Loading
    useEffect(() => {
        detectCurrentGpsLocation();
        loadAppointments();
    }, []);

    // Re-fetch facilities whenever GPS or radius changes
    useEffect(() => {
        if (userGps.lat && userGps.lon) {
            loadNearbyHospitals(userGps.lat, userGps.lon, searchRadius);
        }
    }, [userGps.lat, userGps.lon, searchRadius]);

    // Update offline queue count
    const updateOfflineCount = () => {
        try {
            const raw = localStorage.getItem(OFFLINE_APPOINTMENTS_KEY);
            const list = raw ? JSON.parse(raw) : [];
            setOfflineQueueCount(list.length);
        } catch (e) {
            setOfflineQueueCount(0);
        }
    };

    // Detect GPS Coordinates via Capacitor Geolocation / HTML5
    const detectCurrentGpsLocation = () => {
        setDetectingGps(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const accuracy = Math.round(pos.coords.accuracy || 20);
                    setUserGps({
                        lat,
                        lon,
                        accuracy,
                        name: `GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (±${accuracy}m)`
                    });
                    setDetectingGps(false);
                },
                (err) => {
                    console.warn('[GPS Detection Notice] Using village catchment coordinates:', err.message);
                    setDetectingGps(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        } else {
            setDetectingGps(false);
        }
    };

    // Load Nearby Hospitals (Dual Engine: OpenStreetMap / Google API + Offline Cache)
    const loadNearbyHospitals = async (lat, lon, radius) => {
        setLoadingFacilities(true);
        try {
            const result = await fetchNearbyOsmHealthcare(lat, lon, radius);
            if (result && result.facilities) {
                setFacilities(result.facilities);
            }
        } catch (err) {
            console.warn('[Hospital Locator Error] Using local cache fallback:', err);
            const cached = getFacilitiesFromLocalCache(lat, lon);
            if (cached && cached.facilities) {
                setFacilities(cached.facilities);
            }
        } finally {
            setLoadingFacilities(false);
        }
    };

    // Load Appointments (Online from Supabase + Offline Queue)
    const loadAppointments = async () => {
        setLoadingAppointments(true);
        updateOfflineCount();
        let onlineList = [];
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/appointments/asha/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(res.data)) {
                onlineList = res.data;
            }
        } catch (err) {
            console.warn('[Appointments Fetch Notice] Server offline, loading local records:', err.message);
        }

        // Merge with local offline queue
        try {
            const rawOffline = localStorage.getItem(OFFLINE_APPOINTMENTS_KEY);
            const offlineList = rawOffline ? JSON.parse(rawOffline) : [];
            const map = new Map();

            // Offline items take high visual priority with pending badge
            offlineList.forEach(a => {
                map.set(a.id || a.token, { ...a, is_offline_pending: true });
            });
            onlineList.forEach(a => {
                if (!map.has(a.id) && !map.has(a.token)) {
                    map.set(a.id, a);
                }
            });

            const merged = Array.from(map.values()).sort((a, b) => {
                return new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date);
            });

            setAppointments(merged);
        } catch (e) {
            setAppointments(onlineList);
        } finally {
            setLoadingAppointments(false);
        }
    };

    // Sync Offline Appointments to Supabase Backend
    const syncOfflineAppointments = async () => {
        const raw = localStorage.getItem(OFFLINE_APPOINTMENTS_KEY);
        if (!raw) return;
        let offlineList = [];
        try {
            offlineList = JSON.parse(raw);
        } catch (e) {
            return;
        }

        if (offlineList.length === 0) return;

        setSyncingOffline(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post('/api/appointments/sync-batch', {
                appointments: offlineList
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.synced > 0) {
                localStorage.removeItem(OFFLINE_APPOINTMENTS_KEY);
                setOfflineQueueCount(0);
                setSyncSuccessToast(true);
                setTimeout(() => setSyncSuccessToast(false), 4000);
                loadAppointments();
            }
        } catch (err) {
            console.warn('[Offline Sync Warning] Sync failed, keeping local queue:', err.message);
        } finally {
            setSyncingOffline(false);
        }
    };

    // Handle One-Tap Calling to Hospital Phone
    const handleCallHospital = (phone, hospitalName) => {
        if (!phone) {
            alert(`Direct contact number for "${hospitalName}" is not listed. Please check district health emergency number 108.`);
            return;
        }
        const cleanNumber = phone.replace(/[^0-9+]/g, '');
        window.location.href = `tel:${cleanNumber}`;
    };

    // Open Native Google Maps Navigation
    const handleOpenMapDirections = (hospital) => {
        if (!hospital) return;
        const lat = hospital.lat;
        const lon = hospital.lon;
        const name = encodeURIComponent(hospital.name);
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${name}`;
        window.open(url, '_blank');
    };

    // Search hospital contact number and details on Google
    const handleSearchHospitalOnGoogle = (hospital) => {
        if (!hospital) return;
        const query = encodeURIComponent(`${hospital.name} ${hospital.address || ''} hospital contact phone number`);
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
    };

    // Open Pre-filled Booking Modal for specific hospital
    const handleInitiateBooking = (hospital) => {
        setSelectedHospital(hospital);
        setBookingForm(prev => ({
            ...prev,
            selectedFacilityId: hospital.id || '',
            selectedFacilityName: hospital.name || '',
            selectedFacilityPhone: hospital.phone || '',
            selectedFacilityAddress: hospital.address || 'Address on record',
            selectedFacilityLat: hospital.lat,
            selectedFacilityLon: hospital.lon
        }));
        setShowBookingModal(true);
    };

    // Toggle hospital readiness notes (bed status check)
    const toggleReadinessCheck = (hospitalId, key) => {
        setHospitalReadiness(prev => {
            const current = prev[hospitalId] || {};
            return {
                ...prev,
                [hospitalId]: {
                    ...current,
                    [key]: !current[key]
                }
            };
        });
    };

    // Submit Assisted Appointment Booking (Supabase + Local SQLite Queue)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!bookingForm.patientName.trim()) {
            alert('Please enter patient name.');
            return;
        }

        setBookingSubmitting(true);

        const appointmentToken = `APT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const appointmentPayload = {
            id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            patient_id: user?.id || 'guest-patient',
            patient_name: bookingForm.patientName.trim(),
            patient_phone: bookingForm.patientPhone.trim() || '+91 9800000000',
            patient_age: bookingForm.patientAge || '32',
            patient_gender: bookingForm.patientGender || 'Female',
            patient_abha: bookingForm.patientAbha.trim() || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            facility_id: bookingForm.selectedFacilityId,
            facility_name: bookingForm.selectedFacilityName,
            facility_phone: bookingForm.selectedFacilityPhone,
            facility_address: bookingForm.selectedFacilityAddress,
            facility_lat: bookingForm.selectedFacilityLat,
            facility_lon: bookingForm.selectedFacilityLon,
            appointment_date: bookingForm.appointmentDate,
            time_slot: bookingForm.timeSlot,
            department: bookingForm.department,
            urgency: bookingForm.urgency,
            reason: bookingForm.primaryComplaint.trim() || `${bookingForm.department} OPD Consultation`,
            status: 'confirmed',
            token: appointmentToken,
            booked_by_asha: true,
            asha_worker_id: user?.id || 'ASHA-OFFICIAL',
            asha_worker_name: user?.name || 'ASHA Worker',
            asha_notes: bookingForm.ashaNotes,
            created_at: new Date().toISOString()
        };

        let savedOnline = false;

        // 1. Try saving online to Supabase via backend API
        let confirmedData = appointmentPayload;
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post('/api/appointments/book', appointmentPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 200 || res.status === 201) {
                savedOnline = true;
                if (res.data?.appointment) {
                    confirmedData = { ...appointmentPayload, ...res.data.appointment };
                }
            }
        } catch (err) {
            console.warn('[Booking Online Post Notice] Saving to local offline database queue:', err.message);
        }

        // 2. Always persist into local appointments array and queue for offline safety & immediate Record sync
        try {
            const raw = localStorage.getItem(OFFLINE_APPOINTMENTS_KEY);
            const currentQueue = raw ? JSON.parse(raw) : [];
            const filteredQueue = currentQueue.filter(item => item.id !== confirmedData.id && item.token !== confirmedData.token);
            if (!savedOnline) {
                filteredQueue.unshift(confirmedData);
                localStorage.setItem(OFFLINE_APPOINTMENTS_KEY, JSON.stringify(filteredQueue));
                updateOfflineCount();
            }
            
            // Also dispatch global sync event so Record / MedicalHistory page updates automatically
            window.dispatchEvent(new CustomEvent('swasthya_appointment_updated', { detail: confirmedData }));
        } catch (e) {
            console.error('Offline storage sync error:', e);
        }

        setBookingSubmitting(false);
        setShowBookingModal(false);
        setBookingSuccessModal(confirmedData);
        loadAppointments();
    };

    // Filtered Facilities List
    const filteredFacilities = facilities.filter(f => {
        if (!f) return false;
        const matchesQuery = searchQuery.trim() === '' || 
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            f.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.typeLabel.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;

        if (facilityFilter === 'all') return true;
        if (facilityFilter === 'hospital') return f.typeKey === 'hospital';
        if (facilityFilter === 'clinic') return f.typeKey === 'clinic';
        if (facilityFilter === 'government') return f.is_government;
        if (facilityFilter === 'emergency') return f.emergency_capable;
        return true;
    });

    return (
        <div style={{ padding: '16px 14px 120px 14px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* 1. COMPACT ASHA FIELD WORKER HEADER */}
            <header style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 60%, #134e4a 100%)',
                borderRadius: '16px',
                padding: '12px 16px',
                color: 'white',
                marginBottom: '14px',
                boxShadow: '0 4px 15px rgba(15, 118, 110, 0.2)',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name || 'Sunita Sharma'} (ASHA Official)
                            </h1>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isOnline ? '#4ade80' : '#f87171',
                                flexShrink: 0
                            }} title={isOnline ? 'Online' : 'Offline'} />
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#ccfbf1', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            ABDM ID: <strong style={{ color: 'white', fontFamily: 'monospace' }}>ASHA-UP-GBN-084</strong> • Shirwal & Dankaur
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                            onClick={detectCurrentGpsLocation}
                            disabled={detectingGps}
                            style={{
                                background: 'rgba(255, 255, 255, 0.18)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 9px',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="Refresh GPS"
                        >
                            <RefreshCw size={12} className={detectingGps ? 'animate-spin' : ''} />
                            <span>{detectingGps ? 'Locating...' : 'GPS'}</span>
                        </button>

                        <button
                            onClick={() => navigate('/profile')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.18)',
                                border: 'none',
                                borderRadius: '8px',
                                width: '32px',
                                height: '32px',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                            title="View Profile"
                        >
                            <Shield size={16} />
                        </button>
                    </div>
                </div>

                {offlineQueueCount > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={syncOfflineAppointments}
                            disabled={syncingOffline || !isOnline}
                            style={{
                                background: '#f59e0b',
                                color: '#78350f',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: isOnline ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <RefreshCw size={11} className={syncingOffline ? 'animate-spin' : ''} />
                            Sync {offlineQueueCount} Offline Passes
                        </button>
                    </div>
                )}
            </header>

            {/* Sync Success Toast */}
            {syncSuccessToast && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#166534',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: 600
                    }}
                >
                    <CheckCircle2 size={16} />
                    <span>All offline appointments successfully synchronized with Supabase cloud database!</span>
                </motion.div>
            )}

            {/* 2. DEDICATED ASHA NAVIGATION TABS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: '#e2e8f0',
                padding: '4px',
                borderRadius: '14px',
                marginBottom: '18px'
            }}>
                <button
                    onClick={() => setActiveTab('locator')}
                    style={{
                        padding: '10px 8px',
                        border: 'none',
                        borderRadius: '10px',
                        background: activeTab === 'locator' ? '#ffffff' : 'transparent',
                        color: activeTab === 'locator' ? '#0f766e' : '#64748b',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'locator' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Building2 size={16} />
                    <span>Hospital Locator & Phone</span>
                </button>

                <button
                    onClick={() => {
                        setActiveTab('book');
                        setShowBookingModal(true);
                    }}
                    style={{
                        padding: '10px 8px',
                        border: 'none',
                        borderRadius: '10px',
                        background: activeTab === 'book' ? '#ffffff' : 'transparent',
                        color: activeTab === 'book' ? '#0f766e' : '#64748b',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'book' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <UserPlus size={16} />
                    <span>Book For Patient</span>
                </button>

                <button
                    onClick={() => setActiveTab('passes')}
                    style={{
                        padding: '10px 8px',
                        border: 'none',
                        borderRadius: '10px',
                        background: activeTab === 'passes' ? '#ffffff' : 'transparent',
                        color: activeTab === 'passes' ? '#0f766e' : '#64748b',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'passes' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Calendar size={16} />
                    <span>Visit Passes ({appointments.length})</span>
                </button>
            </div>

            {/* TAB 1: HOSPITAL LOCATOR, GOOGLE MAPS & DIRECT CALLING RADAR */}
            {activeTab === 'locator' && (
                <div>
                    {/* Filter & Search Bar */}
                    <div style={{
                        background: '#ffffff',
                        padding: '14px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '16px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search hospital name, CHC, PHC, or specialty..."
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px 9px 38px',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* View Toggle */}
                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
                                <button
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        padding: '6px 12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: viewMode === 'list' ? '#ffffff' : 'transparent',
                                        color: viewMode === 'list' ? '#0f766e' : '#64748b',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => setViewMode('map')}
                                    style={{
                                        padding: '6px 12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: viewMode === 'map' ? '#ffffff' : 'transparent',
                                        color: viewMode === 'map' ? '#0f766e' : '#64748b',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Map
                                </button>
                            </div>
                        </div>

                        {/* Search Radius & Category Filters */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Filter:</span>
                            {[
                                { key: 'all', label: 'All Facilities' },
                                { key: 'hospital', label: 'Hospitals (FRU/CHC)' },
                                { key: 'clinic', label: 'PHC / Clinics' },
                                { key: 'government', label: '🏛️ Govt / Ayushman' },
                                { key: 'emergency', label: '🚨 24/7 Emergency' }
                            ].map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setFacilityFilter(filter.key)}
                                    style={{
                                        padding: '5px 11px',
                                        borderRadius: '20px',
                                        border: '1px solid',
                                        borderColor: facilityFilter === filter.key ? '#0d9488' : '#e2e8f0',
                                        background: facilityFilter === filter.key ? '#ccfbf1' : '#f8fafc',
                                        color: facilityFilter === filter.key ? '#0f766e' : '#475569',
                                        fontSize: '11.5px',
                                        fontWeight: facilityFilter === filter.key ? 700 : 500,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interactive Map Canvas View */}
                    {viewMode === 'map' && (
                        <div style={{
                            background: '#1e293b',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            marginBottom: '18px',
                            height: '350px',
                            position: 'relative',
                            border: '1px solid #cbd5e1'
                        }}>
                            {/* Google Map / OSM Embed */}
                            <iframe
                                title="Healthcare Map"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${userGps.lon - 0.08}%2C${userGps.lat - 0.06}%2C${userGps.lon + 0.08}%2C${userGps.lat + 0.06}&layer=mapnik&marker=${userGps.lat}%2C${userGps.lon}`}
                                style={{ filter: 'contrast(1.05)' }}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '12px',
                                background: 'rgba(15, 23, 42, 0.85)',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                backdropFilter: 'blur(8px)'
                            }}>
                                📍 Showing {filteredFacilities.length} nearest verified health centres
                            </div>
                        </div>
                    )}

                    {/* Hospital Facility Cards */}
                    {loadingFacilities ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                            <p style={{ margin: 0, fontSize: '13px' }}>Scanning nearest hospitals & primary health centres...</p>
                        </div>
                    ) : filteredFacilities.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '30px',
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <Building2 size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                            <h4 style={{ margin: '0 0 4px', color: '#334155' }}>No facilities found in this filter range</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Try expanding your search radius or clearing query filter.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {filteredFacilities.map((hospital, idx) => {
                                const readiness = hospitalReadiness[hospital.id] || {};
                                return (
                                    <div
                                        key={hospital.id || idx}
                                        style={{
                                            background: '#ffffff',
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            padding: '16px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {/* Card Header: Name, Distance & Badges */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        background: hospital.badgeBg || '#fee2e2',
                                                        color: hospital.badgeColor || '#dc2626',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '2px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        {hospital.typeLabel || 'Hospital'}
                                                    </span>

                                                    {hospital.is_government && (
                                                        <span style={{
                                                            background: '#e0f2fe',
                                                            color: '#0369a1',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            🏛️ Govt. Health Facility
                                                        </span>
                                                    )}

                                                    {hospital.emergency_capable && (
                                                        <span style={{
                                                            background: '#fef2f2',
                                                            color: '#b91c1c',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            🚨 24/7 Emergency
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 style={{ margin: '0 0 3px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                                                    {hospital.name}
                                                </h3>

                                                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                                                    {hospital.address}
                                                </p>
                                            </div>

                                            {/* Distance Badge */}
                                            <div style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '10px',
                                                padding: '6px 10px',
                                                textAlign: 'right',
                                                flexShrink: 0
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f766e' }}>
                                                    {hospital.distanceFormatted}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>from village GPS</div>
                                            </div>
                                        </div>

                                        {/* Contact Phone & Readiness Checklist */}
                                        <div style={{
                                            background: '#f8fafc',
                                            borderRadius: '12px',
                                            padding: '10px 12px',
                                            marginTop: '10px',
                                            marginBottom: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '10px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Phone size={15} color={hospital.phone ? "#0d9488" : "#94a3b8"} />
                                                <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                                                    {hospital.phone ? (
                                                        <strong style={{ fontFamily: 'monospace' }}>{hospital.phone}</strong>
                                                    ) : (
                                                        <span style={{ color: '#64748b', fontSize: '12px' }}>Phone not listed on map</span>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Quick Call Verification Notes */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <button
                                                    onClick={() => toggleReadinessCheck(hospital.id, 'beds_available')}
                                                    style={{
                                                        background: readiness.beds_available ? '#dcfce7' : '#f1f5f9',
                                                        color: readiness.beds_available ? '#166534' : '#64748b',
                                                        border: '1px solid',
                                                        borderColor: readiness.beds_available ? '#86efac' : '#cbd5e1',
                                                        borderRadius: '6px',
                                                        padding: '3px 7px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {readiness.beds_available ? '✓ Beds Confirmed' : '+ Check Beds'}
                                                </button>

                                                <button
                                                    onClick={() => toggleReadinessCheck(hospital.id, 'doctor_on_duty')}
                                                    style={{
                                                        background: readiness.doctor_on_duty ? '#dbeafe' : '#f1f5f9',
                                                        color: readiness.doctor_on_duty ? '#1e40af' : '#64748b',
                                                        border: '1px solid',
                                                        borderColor: readiness.doctor_on_duty ? '#93c5fd' : '#cbd5e1',
                                                        borderRadius: '6px',
                                                        padding: '3px 7px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {readiness.doctor_on_duty ? '✓ Doctor on Duty' : '+ Check Doctor'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Buttons: Call Now OR Search Google, Map Directions, Book Patient */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1.2fr 1fr 1.2fr',
                                            gap: '8px'
                                        }}>
                                            {/* 1. Direct Phone Call OR Google Search Button */}
                                            {hospital.phone ? (
                                                <button
                                                    onClick={() => handleCallHospital(hospital.phone, hospital.name)}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        padding: '10px 8px',
                                                        fontSize: '12.5px',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                                                    }}
                                                >
                                                    <PhoneCall size={15} />
                                                    <span>Call Facility</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSearchHospitalOnGoogle(hospital)}
                                                    style={{
                                                        background: '#f8fafc',
                                                        color: '#2563eb',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: '10px',
                                                        padding: '10px 8px',
                                                        fontSize: '11.5px',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 4px rgba(37, 99, 235, 0.08)'
                                                    }}
                                                    title="Search hospital phone number on Google"
                                                >
                                                    <Search size={14} color="#2563eb" />
                                                    <span>Google Search</span>
                                                </button>
                                            )}

                                            {/* 2. Google Maps Navigation Link */}
                                            <button
                                                onClick={() => handleOpenMapDirections(hospital)}
                                                style={{
                                                    background: '#f1f5f9',
                                                    color: '#334155',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '10px',
                                                    padding: '10px 8px',
                                                    fontSize: '12.5px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Navigation size={15} color="#0284c7" />
                                                <span>Map Route</span>
                                            </button>

                                            {/* 3. Book Patient Appointment */}
                                            <button
                                                onClick={() => handleInitiateBooking(hospital)}
                                                style={{
                                                    background: '#0284c7',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    padding: '10px 8px',
                                                    fontSize: '12.5px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                                                }}
                                            >
                                                <UserPlus size={15} />
                                                <span>Book Patient</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2 & MODAL: ASSISTED PATIENT APPOINTMENT BOOKING FORM */}
            {(showBookingModal || activeTab === 'book') && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '560px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                        position: 'relative'
                    }}>
                        {/* Form Header */}
                        <div style={{
                            padding: '18px 20px',
                            background: 'linear-gradient(135deg, #0f766e, #115e59)',
                            color: 'white',
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800 }}>
                                    Assisted Citizen Appointment Booking
                                </h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#ccfbf1' }}>
                                    Book on behalf of rural patient • Supabase & Offline SQLite Storage
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBookingModal(false);
                                    if (activeTab === 'book') setActiveTab('locator');
                                }}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleFormSubmit} style={{ padding: '20px' }}>
                            {/* Selected Facility Card */}
                            <div style={{
                                background: '#f0fdfa',
                                border: '1px solid #99f6e4',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>
                                    Target Healthcare Facility
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#134e4a', marginTop: '2px' }}>
                                    {bookingForm.selectedFacilityName || 'Select Hospital Below'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#0d9488', marginTop: '2px' }}>
                                    {bookingForm.selectedFacilityPhone && `📞 ${bookingForm.selectedFacilityPhone} • `}
                                    {bookingForm.selectedFacilityAddress}
                                </div>
                            </div>

                            {/* Patient Info Fields */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Patient Full Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={bookingForm.patientName}
                                    onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                                    placeholder="e.g. Ramesh Jadhav / Meena Devi"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13.5px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={bookingForm.patientPhone}
                                        onChange={(e) => setBookingForm({ ...bookingForm, patientPhone: e.target.value })}
                                        placeholder="+91 98XXX XXXXX"
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Age
                                    </label>
                                    <input
                                        type="number"
                                        value={bookingForm.patientAge}
                                        onChange={(e) => setBookingForm({ ...bookingForm, patientAge: e.target.value })}
                                        placeholder="e.g. 34"
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Gender
                                    </label>
                                    <select
                                        value={bookingForm.patientGender}
                                        onChange={(e) => setBookingForm({ ...bookingForm, patientGender: e.target.value })}
                                        style={{ width: '100%', padding: '9px 8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                                    >
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Symptoms & Urgency */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Primary Complaint / Symptoms
                                </label>
                                <input
                                    type="text"
                                    value={bookingForm.primaryComplaint}
                                    onChange={(e) => setBookingForm({ ...bookingForm, primaryComplaint: e.target.value })}
                                    placeholder="e.g. Persistent high fever, acute chest pain, 32 wk pregnancy checkup"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>

                            {/* Department, Date & Time Slot */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Department / Specialty
                                    </label>
                                    <select
                                        value={bookingForm.department}
                                        onChange={(e) => setBookingForm({ ...bookingForm, department: e.target.value })}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                                    >
                                        <option value="General Medicine">General Medicine (OPD)</option>
                                        <option value="Obstetrics & Gynecology">Maternity & OB-GYN</option>
                                        <option value="Pediatrics">Pediatrics (Child Health)</option>
                                        <option value="Cardiology">Cardiology</option>
                                        <option value="Orthopedics">Orthopedics</option>
                                        <option value="Emergency Care">Emergency Care</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Visit Date
                                    </label>
                                    <input
                                        type="date"
                                        value={bookingForm.appointmentDate}
                                        onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Visit Time Window
                                </label>
                                <select
                                    value={bookingForm.timeSlot}
                                    onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}
                                    style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
                                >
                                    <option value="09:00 AM - 11:00 AM">Morning Slot: 09:00 AM - 11:00 AM</option>
                                    <option value="11:00 AM - 01:00 PM">Morning Slot: 11:00 AM - 01:00 PM</option>
                                    <option value="02:00 PM - 04:00 PM">Afternoon Slot: 02:00 PM - 04:00 PM</option>
                                    <option value="04:00 PM - 06:00 PM">Evening Slot: 04:00 PM - 06:00 PM</option>
                                    <option value="Emergency Walk-in">Emergency / Urgent Walk-in</option>
                                </select>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={bookingSubmitting}
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    cursor: bookingSubmitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 15px rgba(15, 118, 110, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {bookingSubmitting ? (
                                    <>
                                        <RefreshCw size={17} className="animate-spin" />
                                        <span>Confirming Appointment Pass...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirm & Generate Patient Visit Pass</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRMED BOOKING SUCCESS PASS MODAL */}
            {bookingSuccessModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: '#ffffff',
                            borderRadius: '24px',
                            width: '100%',
                            maxWidth: '520px',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            padding: '24px',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: '#dcfce7',
                            color: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 14px'
                        }}>
                            <CheckCircle2 size={32} />
                        </div>

                        <span style={{
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            letterSpacing: '0.5px'
                        }}>
                            APPOINTMENT PASS CONFIRMED
                        </span>

                        <h2 style={{ margin: '10px 0 4px', fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                            Patient Visit Pass: {bookingSuccessModal.patient_name}
                        </h2>

                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#0f766e',
                            background: '#f0fdfa',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            display: 'inline-block',
                            margin: '8px 0 16px',
                            border: '1px dashed #0d9488'
                        }}>
                            TOKEN: {bookingSuccessModal.token}
                        </div>

                        {/* Visit Schedule Box */}
                        <div style={{
                            background: '#f8fafc',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '16px',
                            textAlign: 'left',
                            marginBottom: '18px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Calendar size={16} color="#0f766e" />
                                <span style={{ fontSize: '13px', color: '#334155' }}>
                                    <strong>Visit Date:</strong> {bookingSuccessModal.appointment_date}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Clock size={16} color="#0f766e" />
                                <span style={{ fontSize: '13px', color: '#334155' }}>
                                    <strong>Time Window:</strong> {bookingSuccessModal.time_slot}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                <Building2 size={16} color="#0f766e" style={{ marginTop: '2px' }} />
                                <span style={{ fontSize: '13px', color: '#334155' }}>
                                    <strong>Hospital:</strong> {bookingSuccessModal.facility_name}
                                </span>
                            </div>

                            {bookingSuccessModal.facility_phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={16} color="#0f766e" />
                                    <span style={{ fontSize: '13px', color: '#334155' }}>
                                        <strong>Hospital Phone:</strong> <strong style={{ fontFamily: 'monospace' }}>{bookingSuccessModal.facility_phone}</strong>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Action buttons inside confirmation */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {bookingSuccessModal.facility_phone ? (
                                <button
                                    onClick={() => handleCallHospital(bookingSuccessModal.facility_phone, bookingSuccessModal.facility_name)}
                                    style={{
                                        background: '#0d9488',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '11px',
                                        fontSize: '13.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <PhoneCall size={16} />
                                    <span>Call Hospital Desk Now</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSearchHospitalOnGoogle({ name: bookingSuccessModal.facility_name, address: bookingSuccessModal.facility_address })}
                                    style={{
                                        background: '#f8fafc',
                                        color: '#2563eb',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '12px',
                                        padding: '11px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Search size={15} color="#2563eb" />
                                    <span>Search Hospital Phone on Google</span>
                                </button>
                            )}

                            <button
                                onClick={() => handleOpenMapDirections({
                                    lat: bookingSuccessModal.facility_lat || userGps.lat,
                                    lon: bookingSuccessModal.facility_lon || userGps.lon,
                                    name: bookingSuccessModal.facility_name
                                })}
                                style={{
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    padding: '11px',
                                    fontSize: '13.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Navigation size={16} color="#0284c7" />
                                <span>Open Hospital on Google Maps</span>
                            </button>

                            <button
                                onClick={() => {
                                    setBookingSuccessModal(null);
                                    setActiveTab('passes');
                                }}
                                style={{
                                    background: 'transparent',
                                    color: '#64748b',
                                    border: 'none',
                                    padding: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close & View All Passes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* TAB 3: ASSISTED APPOINTMENT PASSES & SCHEDULE TRACKER */}
            {activeTab === 'passes' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                            Assisted Citizen Appointments ({appointments.length})
                        </h2>
                        <button
                            onClick={loadAppointments}
                            style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={13} className={loadingAppointments ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {loadingAppointments ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                            <p style={{ margin: 0, fontSize: '13px' }}>Loading appointment visit passes...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '36px 20px',
                            textAlign: 'center'
                        }}>
                            <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                            <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#334155' }}>No Assisted Appointments Booked Yet</h3>
                            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b' }}>
                                Locate nearby hospitals on the radar and book on behalf of any citizen.
                            </p>
                            <button
                                onClick={() => setActiveTab('locator')}
                                style={{
                                    background: '#0d9488',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 18px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Open Hospital Locator
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {appointments.map((apt, idx) => (
                                <div
                                    key={apt.id || idx}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        padding: '16px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <span style={{
                                                    background: apt.is_offline_pending ? '#fef3c7' : '#dcfce7',
                                                    color: apt.is_offline_pending ? '#92400e' : '#166534',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    {apt.is_offline_pending ? '⚡ Pending Cloud Sync' : '✓ Confirmed on Supabase'}
                                                </span>

                                                <span style={{
                                                    background: '#ede9fe',
                                                    color: '#6d28d9',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    {apt.department || 'General OPD'}
                                                </span>
                                            </div>

                                            <h3 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                                                {apt.patient_name || 'Patient on Record'}
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                                Phone: <strong>{apt.patient_phone || '+91 9800000000'}</strong> • ABHA: <strong style={{ fontFamily: 'monospace' }}>{apt.patient_abha || '91-4829-1092'}</strong>
                                            </p>
                                        </div>

                                        {/* Token */}
                                        <div style={{
                                            background: '#f0fdfa',
                                            border: '1px solid #99f6e4',
                                            borderRadius: '10px',
                                            padding: '6px 10px',
                                            textAlign: 'right'
                                        }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e', fontFamily: 'monospace' }}>
                                                {apt.token || `APT-${idx + 100}`}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Token Pass</div>
                                        </div>
                                    </div>

                                    {/* Hospital & Schedule Highlight Box */}
                                    <div style={{
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        marginBottom: '12px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <Calendar size={15} color="#0f766e" />
                                            <span style={{ fontSize: '13px', color: '#1e293b' }}>
                                                <strong>Scheduled Visit Date:</strong> {apt.appointment_date}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <Clock size={15} color="#0f766e" />
                                            <span style={{ fontSize: '13px', color: '#1e293b' }}>
                                                <strong>Time Window:</strong> {apt.time_slot}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            <Building2 size={15} color="#0f766e" style={{ marginTop: '2px' }} />
                                            <span style={{ fontSize: '13px', color: '#1e293b' }}>
                                                <strong>Facility:</strong> {apt.facility_name || 'Designated Health Center'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {apt.facility_phone ? (
                                            <button
                                                onClick={() => handleCallHospital(apt.facility_phone, apt.facility_name)}
                                                style={{
                                                    flex: 1,
                                                    background: '#0d9488',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <PhoneCall size={14} />
                                                <span>Call Hospital</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSearchHospitalOnGoogle({ name: apt.facility_name, address: apt.facility_address })}
                                                style={{
                                                    flex: 1,
                                                    background: '#f8fafc',
                                                    color: '#2563eb',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Search size={13} color="#2563eb" />
                                                <span>Search on Google</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleOpenMapDirections({
                                                lat: apt.facility_lat || userGps.lat,
                                                lon: apt.facility_lon || userGps.lon,
                                                name: apt.facility_name
                                            })}
                                            style={{
                                                flex: 1,
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Navigation size={14} color="#0284c7" />
                                            <span>Hospital Map</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default AshaDashboard;
