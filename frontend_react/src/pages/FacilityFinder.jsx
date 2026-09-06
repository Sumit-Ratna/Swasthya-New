import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, MapPin, Phone, ShieldAlert, CheckCircle2, 
    Stethoscope, Clock, Filter, Search, ArrowRight, AlertCircle, MessageSquareHeart, Bell 
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';

const FacilityFinder = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTier, setSelectedTier] = useState('ALL');
    const [emergencyOnly, setEmergencyOnly] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    // Referral Booking Modal State
    const [bookingFacility, setBookingFacility] = useState(null);
    const [specialty, setSpecialty] = useState('GENERAL_MEDICINE');
    const [complaint, setComplaint] = useState('');
    const [urgency, setUrgency] = useState('ROUTINE');
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        fetchFacilities();
    }, [selectedTier, emergencyOnly]);

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const params = {};
            if (selectedTier !== 'ALL') params.tier = selectedTier;
            if (emergencyOnly) params.emergency_capable = 'true';

            const res = await axios.get('/api/facilities', { params });
            setFacilities(res.data || []);
        } catch (err) {
            console.error("Fetch facilities error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReferral = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            const patientId = user?.id || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

            const res = await axios.post('/api/referrals', {
                patient_id: patientId,
                receiving_facility_id: bookingFacility.id,
                specialty_required: specialty,
                urgency: urgency,
                risk_level: urgency === 'EMERGENCY' ? 'HIGH' : 'MODERATE',
                primary_complaint: complaint || 'General Referral Request',
                reason_for_referral: `Referred to ${bookingFacility.name} for ${specialty}`
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBookingSuccess(true);
            setTimeout(() => {
                setBookingFacility(null);
                setBookingSuccess(false);
                navigate('/referrals');
            }, 1800);
        } catch (err) {
            console.error("Booking referral error:", err);
            alert("Referral error: " + (err.response?.data?.error || err.message));
        }
    };

    const filtered = facilities.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.district.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLoadColor = (load) => {
        if (load < 50) return '#16A34A'; // Green
        if (load < 80) return '#D97706'; // Amber
        return '#DC2626'; // Red
    };

    return (
        <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Building2 color="var(--primary-color)" size={28} />
                        Facility Smart Matching & Directory
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: 0 }}>
                        Multi-tier public health facilities with real-time operational load & emergency capabilities
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        style={{
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            color: '#b45309',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <MessageSquareHeart size={16} />
                        <span>Facility Feedback</span>
                    </button>
                    <div 
                        onClick={() => navigate('/notifications')}
                        style={{ cursor: 'pointer', background: 'white', padding: '6px 8px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}
                    >
                        <Bell size={18} color="var(--text-primary)" />
                    </div>
                </div>
            </div>

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Filter Bar */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                    <input 
                        type="text"
                        placeholder="Search facility name, district, or block..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '38px', width: '100%' }}
                    />
                    <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                <select 
                    value={selectedTier} 
                    onChange={(e) => setSelectedTier(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                >
                    <option value="ALL">All Facility Tiers</option>
                    <option value="PRIMARY_HEALTH_CENTRE">Primary Health Centre (PHC)</option>
                    <option value="COMMUNITY_HEALTH_CENTRE">Community Health Centre (CHC)</option>
                    <option value="DISTRICT_HOSPITAL">District Hospital</option>
                    <option value="TERTIARY_HOSPITAL">Tertiary / Medical College</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox"
                        checked={emergencyOnly}
                        onChange={(e) => setEmergencyOnly(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                    />
                    <span>🚨 Emergency Capable Only</span>
                </label>
            </div>

            {/* Facility Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                    Fetching facilities and real-time load meters...
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <AlertCircle size={40} color="var(--primary-color)" style={{ margin: '0 auto 12px' }} />
                    <h3>No Facilities Found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                        No facilities match your search criteria. Try removing filters.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {filtered.map(facility => (
                        <motion.div 
                            key={facility.id}
                            className="card"
                            whileHover={{ y: -3 }}
                            style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: '700', 
                                        padding: '3px 8px', 
                                        borderRadius: '12px',
                                        backgroundColor: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        {facility.tier?.replace(/_/g, ' ')}
                                    </span>
                                    {facility.emergency_capable && (
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '3px 8px', borderRadius: '12px' }}>
                                            24x7 Emergency
                                        </span>
                                    )}
                                </div>

                                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>{facility.name}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '14px' }}>
                                    <MapPin size={14} /> {facility.address} ({facility.district})
                                </p>

                                {/* Operational Load Meter */}
                                <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                        <span>Current Patient Load</span>
                                        <strong style={{ color: getLoadColor(facility.current_load || 40) }}>{facility.current_load || 42}%</strong>
                                    </div>
                                    <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${facility.current_load || 42}%`, backgroundColor: getLoadColor(facility.current_load || 40), borderRadius: '3px' }}></div>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> Status: <span style={{ color: '#16A34A', fontWeight: '600' }}>{facility.operational_status || 'OPEN'}</span>
                                    </div>
                                </div>

                                {/* Supported Specialties */}
                                {facility.specialties && facility.specialties.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                                        {facility.specialties.slice(0, 3).map((spec, i) => (
                                            <span key={i} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary-color)' }}>
                                                {spec}
                                            </span>
                                        ))}
                                        {facility.specialties.length > 3 && (
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+{facility.specialties.length - 3} more</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                                onClick={() => setBookingFacility(facility)}
                            >
                                Initiate Referral <ArrowRight size={14} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Referral Booking Modal */}
            <AnimatePresence>
                {bookingFacility && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{ maxWidth: '480px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            {bookingSuccess ? (
                                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                    <CheckCircle2 size={50} color="#16A34A" style={{ margin: '0 auto 16px' }} />
                                    <h2>Referral Created!</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        Redirecting to closed-loop tracker...
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateReferral}>
                                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                                        Create Facility Referral
                                    </h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                        Target: <strong>{bookingFacility.name}</strong>
                                    </p>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Required Specialty</label>
                                        <select 
                                            value={specialty} 
                                            onChange={(e) => setSpecialty(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="GENERAL_MEDICINE">General Medicine</option>
                                            <option value="OBSTETRICS">Obstetrics & Gynecology (Maternal)</option>
                                            <option value="PEDIATRICS">Pediatrics (Child Health)</option>
                                            <option value="CARDIOLOGY">Cardiology</option>
                                            <option value="TRAUMA_SURGERY">Trauma & Orthopedic Surgery</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Urgency Level</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => setUrgency('ROUTINE')}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
                                                    border: urgency === 'ROUTINE' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                                    backgroundColor: urgency === 'ROUTINE' ? 'rgba(13, 148, 136, 0.1)' : 'var(--bg-color)',
                                                    color: urgency === 'ROUTINE' ? 'var(--primary-color)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                Routine
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setUrgency('EMERGENCY')}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
                                                    border: urgency === 'EMERGENCY' ? '2px solid #DC2626' : '1px solid var(--border-color)',
                                                    backgroundColor: urgency === 'EMERGENCY' ? '#FEE2E2' : 'var(--bg-color)',
                                                    color: urgency === 'EMERGENCY' ? '#DC2626' : 'var(--text-secondary)'
                                                }}
                                            >
                                                🚨 Emergency
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Primary Symptoms / Clinical Reason</label>
                                        <textarea 
                                            rows={3}
                                            placeholder="e.g., Maternal hypertension at 32 weeks ANC, high pulse..."
                                            value={complaint}
                                            onChange={(e) => setComplaint(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn-outline" onClick={() => setBookingFacility(null)}>Cancel</button>
                                        <button type="submit" className="btn-primary">Confirm & Dispatch</button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacilityFinder;
