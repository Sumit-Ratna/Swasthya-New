import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Users, CheckCircle, XCircle, AlertCircle, Clock, ShieldCheck, ArrowRight, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const FamilyAcceptInvite = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [inviteDetails, setInviteDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle', 'accepted', 'declined', 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (token) {
            fetchInviteDetails();
        } else {
            setLoading(false);
            setStatus('error');
            setMessage('No verification token provided. Please check the link from your email.');
        }
    }, [token]);

    const fetchInviteDetails = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/family/invite-details/${token}`);
            setInviteDetails(res.data);
            if (res.data.status === 'ACCEPTED') {
                setStatus('accepted');
                setMessage('This family connection is already active and verified.');
            } else if (res.data.status === 'DECLINED') {
                setStatus('declined');
                setMessage('This invitation was previously declined.');
            } else if (res.data.status === 'EXPIRED') {
                setStatus('error');
                setMessage('This invitation has expired. Please ask the family member to send a new request.');
            }
        } catch (err) {
            console.error("Fetch invite details error:", err);
            setStatus('error');
            setMessage(err.response?.data?.error || 'Invalid or expired invitation token.');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user) {
            // Save token to localStorage so after login we can auto-resume
            localStorage.setItem('pending_invite_token', token);
            navigate('/login');
            return;
        }

        setActionLoading(true);
        try {
            const authToken = localStorage.getItem('accessToken');
            const res = await axios.post('/api/family/accept-invite', {
                token: token
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            setStatus('accepted');
            setMessage(res.data?.message || 'Family connection successfully verified and active!');
        } catch (err) {
            console.error("Accept error:", err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to accept invitation.';
            setStatus('error');
            setMessage(errMsg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!window.confirm("Are you sure you want to decline this family connection request?")) return;

        setActionLoading(true);
        try {
            const authToken = localStorage.getItem('accessToken');
            const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

            await axios.post('/api/family/decline-invite', {
                token: token
            }, { headers });

            setStatus('declined');
            setMessage('You have declined this family connection request.');
        } catch (err) {
            console.error("Decline error:", err);
            setStatus('error');
            setMessage(err.response?.data?.error || 'Failed to decline invitation.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px 20px', maxWidth: '540px', margin: '0 auto', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ width: '100%', padding: '32px', textAlign: 'center' }}
            >
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: status === 'accepted' ? '#EAF9EE' : (status === 'error' || status === 'declined' ? '#FFF0F0' : '#EBF3FF'),
                    color: status === 'accepted' ? '#34C759' : (status === 'error' || status === 'declined' ? '#FF3B30' : '#007AFF'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                }}>
                    {status === 'accepted' ? (
                        <CheckCircle size={32} />
                    ) : (status === 'declined' ? (
                        <XCircle size={32} />
                    ) : (status === 'error' ? (
                        <AlertCircle size={32} />
                    ) : (
                        <Users size={32} />
                    )))}
                </div>

                <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>
                    {status === 'accepted' ? 'Connection Verified' : (status === 'declined' ? 'Request Declined' : 'Family Connection Request')}
                </h2>

                {loading ? (
                    <div style={{ padding: '30px', color: '#8E8E93' }}>
                        Loading invitation details...
                    </div>
                ) : status === 'accepted' ? (
                    <div>
                        <p style={{ color: '#3A3A3C', fontSize: '15px', lineHeight: '1.5', margin: '12px 0 24px' }}>
                            {message || 'Your family connection has been successfully established and verified.'}
                        </p>
                        <button
                            onClick={() => navigate('/family')}
                            className="btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Go to Family Health <ArrowRight size={18} />
                        </button>
                    </div>
                ) : status === 'declined' ? (
                    <div>
                        <p style={{ color: '#636366', fontSize: '15px', margin: '12px 0 24px' }}>
                            {message}
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-outline"
                            style={{ padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Return to Home
                        </button>
                    </div>
                ) : status === 'error' ? (
                    <div>
                        <p style={{ color: '#FF3B30', fontSize: '15px', margin: '12px 0 24px' }}>
                            {message}
                        </p>
                        <button
                            onClick={() => navigate('/family')}
                            className="btn-outline"
                            style={{ padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Return to Family Health
                        </button>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: '#636366', fontSize: '15px', margin: '8px 0 20px', lineHeight: '1.5' }}>
                            <strong>{inviteDetails?.requester_name || 'A patient'}</strong> has invited you to connect as their <strong>{inviteDetails?.relationship_type || 'Family Member'}</strong> on Swasthya.
                        </p>

                        <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '16px', margin: '0 0 24px', textAlign: 'left', border: '1px solid #E5E5EA' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '13px' }}>Requester</span>
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{inviteDetails?.requester_name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '13px' }}>Relationship</span>
                                <span style={{ fontWeight: 600, fontSize: '13px', textTransform: 'capitalize' }}>{inviteDetails?.relationship_type}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#8E8E93', fontSize: '13px' }}>Permission Scope</span>
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{inviteDetails?.permission_scope?.replace('_', ' ')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#8E8E93', fontSize: '13px' }}>Expires</span>
                                <span style={{ color: '#FF9500', fontSize: '13px', fontWeight: 500 }}>
                                    {new Date(inviteDetails?.expires_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {!user && (
                            <div style={{ background: '#FFFBE6', border: '1px solid #FFE58F', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#873800' }}>
                                Note: You need to be logged into your Swasthya account to accept this request.
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            <button
                                onClick={handleAccept}
                                disabled={actionLoading}
                                className="btn-primary"
                                style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            >
                                {actionLoading ? 'Processing...' : (user ? 'Accept Connection Request' : 'Log In to Accept Request')}
                            </button>
                            <button
                                onClick={handleDecline}
                                disabled={actionLoading}
                                style={{
                                    width: '100%', padding: '12px', background: 'transparent', border: '1px solid #D1D1D6',
                                    borderRadius: '8px', color: '#FF3B30', fontWeight: 600, cursor: 'pointer', fontSize: '14px'
                                }}
                            >
                                Decline Request
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default FamilyAcceptInvite;
