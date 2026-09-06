import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, ShieldCheck, MapPin, Clock, AlertTriangle, 
    CheckCircle2, ArrowRight, UserCheck, Stethoscope, FileText, 
    Calendar, RefreshCw, AlertCircle
} from 'lucide-react';
import axios from 'axios';

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
    const { user } = useContext(AuthContext);
    const [referrals, setReferrals] = useState([]);
    const [selectedReferral, setSelectedReferral] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReferrals();
    }, [user]);

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const patientId = user?.id || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
            const res = await axios.get(`/api/referrals/patient/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReferrals(res.data || []);
            if (res.data && res.data.length > 0) {
                loadReferralDetails(res.data[0].id);
            }
        } catch (err) {
            console.error("Fetch referrals failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadReferralDetails = async (id) => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`/api/referrals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedReferral(res.data.referral);
            setTimeline(res.data.timeline || []);
        } catch (err) {
            console.error("Load referral details error:", err);
        }
    };

    const handleUpdateStatus = async (toStatus, reason) => {
        if (!selectedReferral) return;
        try {
            const token = localStorage.getItem('accessToken');
            await axios.patch(`/api/referrals/${selectedReferral.id}/status`, {
                to_status: toStatus,
                reason: reason || 'Manual progress update'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await loadReferralDetails(selectedReferral.id);
            fetchReferrals();
        } catch (err) {
            console.error("Update status error:", err);
            alert("Status update error: " + (err.response?.data?.error || err.message));
        }
    };

    const getStepIndex = (status) => {
        const idx = STATUS_STEPS.findIndex(s => s.key === status);
        return idx !== -1 ? idx : 2;
    };

    return (
        <div style={{ padding: '24px 16px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity color="var(--primary-color)" size={28} />
                        Closed-Loop Referral Tracking
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        End-to-end accountability from triage to verified follow-up completion
                    </p>
                </div>
                <button className="btn-outline" onClick={fetchReferrals} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                    Loading active referral cases...
                </div>
            ) : referrals.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--border-color)' }}>
                    <AlertCircle size={40} color="var(--primary-color)" style={{ margin: '0 auto 12px' }} />
                    <h3>No Active Referrals Found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                        You do not have any open referral cases. When an assessment recommends a higher-tier facility, it will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    {/* Left: Referrals List */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Active Referrals ({referrals.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {referrals.map(ref => (
                                <div 
                                    key={ref.id}
                                    onClick={() => loadReferralDetails(ref.id)}
                                    className="card"
                                    style={{
                                        cursor: 'pointer',
                                        padding: '16px',
                                        border: selectedReferral?.id === ref.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        backgroundColor: selectedReferral?.id === ref.id ? 'rgba(13, 148, 136, 0.05)' : 'var(--card-bg)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: ref.urgency === 'EMERGENCY' ? '#FEE2E2' : '#E0F2FE',
                                                color: ref.urgency === 'EMERGENCY' ? '#DC2626' : '#0284C7'
                                            }}>
                                                {ref.urgency}
                                            </span>
                                            <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: '8px' }}>
                                                {ref.specialty_required || 'General Consultation'}
                                            </h4>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                Facility: {ref.facilities?.name || 'Selected Facility'}
                                            </p>
                                        </div>
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: ref.status === 'COMPLETED' ? '#16A34A' : '#D97706',
                                            backgroundColor: ref.status === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7',
                                            padding: '4px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            {ref.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        <span>Token: <strong>{ref.slot_token || 'N/A'}</strong></span>
                                        <span>{new Date(ref.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Selected Referral Detail & 13-State Machine Progress */}
                    {selectedReferral && (
                        <div className="card" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Referral ID: {selectedReferral.id.substring(0, 8)}...</span>
                                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{selectedReferral.primary_complaint || selectedReferral.specialty_required}</h2>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assigned Token</span>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-color)' }}>{selectedReferral.slot_token || 'Token #14'}</div>
                                </div>
                            </div>

                            {/* Destination Facility & Assigned Doctor */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} /> Receiving Facility
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '4px' }}>
                                        {selectedReferral.facilities?.name || 'District Hospital'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {selectedReferral.facilities?.tier?.replace(/_/g, ' ') || 'Specialist Care'}
                                    </div>
                                </div>

                                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Stethoscope size={14} /> Assigned Doctor
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '4px' }}>
                                        {selectedReferral.doctors?.name || 'Assigned on Arrival'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {selectedReferral.doctors?.specialty_name || 'Specialist'}
                                    </div>
                                </div>
                            </div>

                            {/* State Machine Progress Bar */}
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Referral Lifecycle State</h4>
                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                                    {STATUS_STEPS.map((step, idx) => {
                                        const currentIdx = getStepIndex(selectedReferral.status);
                                        const isCompleted = idx <= currentIdx;
                                        return (
                                            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '48px' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: isCompleted ? 'var(--primary-color)' : 'var(--border-color)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    marginBottom: '6px'
                                                }}>
                                                    {isCompleted ? '✓' : idx + 1}
                                                </div>
                                                <span style={{ fontSize: '10px', color: isCompleted ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isCompleted ? '600' : '400' }}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quick Action Transitions for Health Worker / Doctor / Patient */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                                <span style={{ width: '100%', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Advance State (Role Actions):</span>
                                <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handleUpdateStatus('PATIENT_IN_TRANSIT', 'Patient is traveling to facility')}>
                                    Mark In-Transit 🚗
                                </button>
                                <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handleUpdateStatus('PATIENT_REACHED', 'Patient arrived at front desk')}>
                                    Confirm Arrival 🏥
                                </button>
                                <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handleUpdateStatus('TREATMENT_COMPLETED', 'Doctor consultation and treatment finished')}>
                                    Treatment Done 💊
                                </button>
                                <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handleUpdateStatus('COMPLETED', 'Follow-up verified and closed')}>
                                    Close Loop ✅
                                </button>
                            </div>

                            {/* Timeline of Events */}
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Event Audit History</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {timeline.length === 0 ? (
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No audit events recorded yet.</p>
                                ) : (
                                    timeline.map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', gap: '10px', fontSize: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginTop: '4px' }}></div>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: '600' }}>{ev.to_status.replace(/_/g, ' ')}</span>
                                                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({ev.actor_role})</span>
                                                <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0' }}>{ev.reason || 'Status updated'}</p>
                                            </div>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReferralTracker;
