import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Plus, X, ChevronRight, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../config/supabase';

const FamilyHealth = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [relation, setRelation] = useState('Family');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);

    useEffect(() => {
        if (user) fetchFamilyMembers();
    }, [user]);

    const fetchFamilyMembers = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/family/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data);
        } catch (err) {
            console.error("Fetch members error:", err);
        }
    };

    const handleInitiate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post('/api/family/add', {
                phone: newMemberPhone,
                relation: relation
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let formattedPhone = newMemberPhone;
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+91' + formattedPhone;
            }

            try {
                await supabase.auth.signInWithOtp({ phone: formattedPhone });
            } catch (supaErr) {
                console.warn("Supabase OTP send notice:", supaErr.message);
            }

            setStep('otp');
        } catch (err) {
            console.error("Family Add Error:", err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to send OTP';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let formattedPhone = newMemberPhone;
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+91' + formattedPhone;
            }

            try {
                await supabase.auth.verifyOtp({
                    phone: formattedPhone,
                    token: otp,
                    type: 'sms'
                });
            } catch (supaVerifyErr) {
                console.warn("Supabase verify notice:", supaVerifyErr.message);
            }

            const token = localStorage.getItem('accessToken');
            await axios.post('/api/family/verify', {
                phone: newMemberPhone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchFamilyMembers();
            closeModal();
            alert('Family member connected successfully!');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setStep('phone');
        setNewMemberPhone('');
        setOtp('');
        setRelation('Family');
        setError('');
        setConfirmationResult(null);
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch (e) { }
            window.recaptchaVerifier = null;
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this family member?")) return;
        try {
            const token = localStorage.getItem('accessToken');
            await axios.delete(`/api/family/${memberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFamilyMembers();
        } catch (err) {
            alert("Failed to remove member");
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="animate-enter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={28} color="#007AFF" />
                        Family Health
                    </h1>
                    <p className="animate-enter" style={{ animationDelay: '0.1s', color: '#8E8E93', margin: '4px 0 0' }}>
                        Manage health records for your family members
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/scan')}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px' }}
                    >
                        Scan QR
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', width: 'auto' }}
                    >
                        <Plus size={18} /> Add Member
                    </button>
                </div>
            </header>

            {/* Members List */}
            <div style={{ display: 'grid', gap: '16px' }}>
                {members.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                        <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No family members connected yet.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{ marginTop: '16px', color: '#007AFF', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                            + Connect family member via Phone
                        </button>
                        <div style={{ marginTop: '8px', color: '#8E8E93', fontSize: '12px' }}>or Scan their Swasthya QR code</div>
                    </div>
                ) : (
                    members.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="card"
                            style={{
                                display: 'flex', alignItems: 'center', padding: '16px',
                                cursor: 'pointer', transition: 'transform 0.2s', position: 'relative'
                            }}
                            onClick={() => navigate(`/family/${member.id}`)}
                            whileHover={{ scale: 1.01 }}
                        >
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: `linear-gradient(135deg, ${['#FF9500', '#FF2D55', '#5856D6', '#007AFF'][index % 4]} 0%, #FFF 100%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginRight: '16px', color: 'white', fontWeight: 'bold', fontSize: '20px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}>
                                {member.name?.[0]?.toUpperCase() || 'U'}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{member.name}</h3>
                                    <span style={{
                                        fontSize: '11px', background: '#E5E5EA', color: '#636366',
                                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600, textTransform: 'uppercase'
                                    }}>
                                        {member.relation}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: '#8E8E93', fontSize: '13px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Phone size={12} /> {member.phone}
                                    </span>
                                    {member.dob && <span>Age: {new Date().getFullYear() - new Date(member.dob).getFullYear()}</span>}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(member.id);
                                }}
                                style={{
                                    padding: '8px', background: 'transparent',
                                    color: '#C7C7CC', border: 'none', cursor: 'pointer',
                                    borderRadius: '50%',
                                }}
                                title="Remove member"
                            >
                                <X size={20} />
                            </button>

                            <ChevronRight size={20} color="#C7C7CC" style={{ marginLeft: '8px' }} />
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>Add Family Member</h3>
                                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="#8E8E93" />
                                </button>
                            </div>

                            <form onSubmit={step === 'phone' ? handleInitiate : handleVerify}>
                                {step === 'phone' ? (
                                    <>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                                PHONE NUMBER
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="Enter their registered phone"
                                                value={newMemberPhone}
                                                onChange={(e) => setNewMemberPhone(e.target.value)}
                                                required
                                                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA' }}
                                            />
                                            <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px' }}>
                                                Note: The family member must already have an account on Swasthya.
                                            </p>
                                        </div>
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                                RELATIONSHIP
                                            </label>
                                            <select
                                                value={relation}
                                                onChange={(e) => setRelation(e.target.value)}
                                                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA' }}
                                            >
                                                <option value="Family">Family</option>
                                                <option value="Mother">Mother</option>
                                                <option value="Father">Father</option>
                                                <option value="Spouse">Spouse</option>
                                                <option value="Son">Son</option>
                                                <option value="Daughter">Daughter</option>
                                                <option value="Sibling">Sibling</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                            ENTER OTP
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter 6-digit code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px', fontSize: '18px', textAlign: 'center', letterSpacing: '2px', borderRadius: '8px', border: '1px solid #E5E5EA' }}
                                        />
                                        <p style={{ fontSize: '13px', color: '#34C759', marginTop: '8px', textAlign: 'center' }}>
                                            We sent a verification code to {newMemberPhone}
                                        </p>
                                    </div>
                                )}

                                {/* Keep Recaptcha Container Always Rendered */}
                                <div id="recaptcha-family-add"></div>

                                {error && (
                                    <div style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '16px', background: '#FFF0F0', padding: '10px', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                    style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                >
                                    {loading ? 'Processing...' : (step === 'phone' ? 'Send OTP' : 'Verify & Connect')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <div id="recaptcha-container"></div>
        </div>
    );
};

export default FamilyHealth;
