import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Star, MessageSquareHeart, X, Send, CheckCircle2, 
    Sparkles, HeartHandshake, ShieldCheck, ThumbsUp, AlertCircle, MessageCircle
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const FeedbackModal = ({ isOpen, onClose }) => {
    const { user } = useContext(AuthContext);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [category, setCategory] = useState('General');
    const [role, setRole] = useState(user?.role || 'patient');
    const [name, setName] = useState(user?.name || '');
    const [feedbackText, setFeedbackText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
    const [recentFeedbacks, setRecentFeedbacks] = useState([]);
    const [stats, setStats] = useState(null);

    const categories = [
        'General',
        'Doctor Consultation',
        'App Experience',
        'Referral Speed',
        'AI Lab Explainer',
        'Bug Report'
    ];

    const roles = [
        { id: 'patient', label: 'Patient' },
        { id: 'doctor', label: 'Doctor' },
        { id: 'health_worker', label: 'ASHA / Health Worker' },
        { id: 'caregiver', label: 'Caregiver' },
        { id: 'facility_staff', label: 'Facility Staff' },
        { id: 'admin', label: 'Admin / Health Officer' }
    ];

    useEffect(() => {
        if (user) {
            setRole(user.role || 'patient');
            setName(user.name || '');
        }
    }, [user]);

    useEffect(() => {
        if (isOpen) {
            loadFeedbackHistory();
        }
    }, [isOpen]);

    const loadFeedbackHistory = async () => {
        try {
            const [listRes, statsRes] = await Promise.all([
                axios.get('/api/feedback'),
                axios.get('/api/feedback/stats')
            ]);
            setRecentFeedbacks(Array.isArray(listRes.data) ? listRes.data.slice(0, 5) : []);
            setStats(statsRes.data);
        } catch (e) {
            console.warn('Feedback fetch notice:', e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackText.trim()) {
            setError('Please share your feedback or experience description.');
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const token = localStorage.getItem('accessToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payload = {
                rating,
                category,
                user_role: role,
                user_name: name.trim() || (user?.name || 'Anonymous Contributor'),
                user_phone: user?.phone || null,
                feedback_text: feedbackText.trim()
            };

            const res = await axios.post('/api/feedback', payload, { headers });

            if (res.data.success) {
                setSubmitted(true);
                loadFeedbackHistory();
                setTimeout(() => {
                    // Reset after 3 seconds
                    setSubmitted(false);
                    setFeedbackText('');
                    setRating(5);
                    onClose();
                }, 2200);
            }
        } catch (err) {
            console.error('Submit feedback error:', err);
            setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '520px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0',
                        position: 'relative'
                    }}
                >
                    {/* Header Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f766e 0%, #0284c7 100%)',
                        padding: '24px 24px 20px',
                        color: 'white',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px',
                        position: 'relative'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: 'white',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MessageSquareHeart size={22} color="#fef08a" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
                                    Your Feedback & Suggestions
                                </h2>
                                <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                                    Direct Supabase Synchronized Healthcare Quality Log
                                </p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '14px',
                            background: 'rgba(0, 0, 0, 0.15)',
                            padding: '4px',
                            borderRadius: '12px'
                        }}>
                            <button
                                onClick={() => setActiveTab('submit')}
                                style={{
                                    flex: 1,
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: activeTab === 'submit' ? 'white' : 'transparent',
                                    color: activeTab === 'submit' ? '#0f766e' : 'white',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Give Feedback
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                style={{
                                    flex: 1,
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: activeTab === 'history' ? 'white' : 'transparent',
                                    color: activeTab === 'history' ? '#0f766e' : 'white',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Community Ratings ({stats?.totalFeedbacks || 0})
                            </button>
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div style={{ padding: '24px' }}>
                        {submitted ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{
                                    textAlign: 'center',
                                    padding: '30px 20px',
                                    color: '#0f766e'
                                }}
                            >
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: '#ccfbf1',
                                    margin: '0 auto 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={36} color="#0d9488" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
                                    Feedback Received!
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    Thank you! Your feedback has been securely synced to our Supabase database.
                                </p>
                            </motion.div>
                        ) : activeTab === 'submit' ? (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {error && (
                                    <div style={{
                                        padding: '10px 14px',
                                        background: '#fee2e2',
                                        borderRadius: '10px',
                                        color: '#b91c1c',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Star Rating */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                        How was your experience?
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(star)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    transition: 'transform 0.15s ease'
                                                }}
                                            >
                                                <Star
                                                    size={32}
                                                    fill={(hoverRating || rating) >= star ? '#f59e0b' : 'none'}
                                                    color={(hoverRating || rating) >= star ? '#f59e0b' : '#cbd5e1'}
                                                />
                                            </button>
                                        ))}
                                        <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
                                            {rating === 5 && '🌟 Exceptional'}
                                            {rating === 4 && '👍 Very Good'}
                                            {rating === 3 && '🙂 Satisfactory'}
                                            {rating === 2 && '⚠️ Needs Improvement'}
                                            {rating === 1 && '🚨 Poor'}
                                        </span>
                                    </div>
                                </div>

                                {/* User Role Selector */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Submitting As:
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {roles.map((r) => (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => setRole(r.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '16px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    border: role === r.id ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                                                    background: role === r.id ? '#ccfbf1' : '#f8fafc',
                                                    color: role === r.id ? '#0f766e' : '#64748b',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Selector */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Category:
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {categories.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCategory(c)}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    border: category === c ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                                                    background: category === c ? '#e0f2fe' : 'white',
                                                    color: category === c ? '#0369a1' : '#64748b',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Your Name (Optional/Pre-filled) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Your Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Dr. Anand or Patient Name"
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Feedback Description Textarea */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Your Feedback & Suggestions *
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Please tell us what went well, report any issues, or suggest improvements..."
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            fontFamily: 'inherit',
                                            resize: 'vertical',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        marginTop: '6px',
                                        padding: '12px 18px',
                                        background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '14px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? (
                                        <span>Syncing to Supabase...</span>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span>Submit Feedback</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            /* Community History & Stats Tab */
                            <div>
                                {stats && (
                                    <div style={{
                                        background: '#f8fafc',
                                        padding: '16px',
                                        borderRadius: '16px',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-around',
                                        alignItems: 'center',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f766e' }}>
                                                {stats.averageRating} ★
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Average Rating</div>
                                        </div>
                                        <div style={{ width: '1px', height: '36px', background: '#cbd5e1' }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>
                                                {stats.totalFeedbacks}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Total Feedback</div>
                                        </div>
                                    </div>
                                )}

                                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: '0 0 10px 0' }}>
                                    Recent Community Feedback
                                </h4>

                                {recentFeedbacks.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        No feedbacks recorded yet. Be the first to submit!
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {recentFeedbacks.map((item) => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                        {item.user_name} ({item.user_role})
                                                    </span>
                                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                                        {'★'.repeat(item.rating)}
                                                    </span>
                                                </div>
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: '#e0f2fe',
                                                    color: '#0369a1',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    marginBottom: '4px'
                                                }}>
                                                    {item.category}
                                                </span>
                                                <p style={{ margin: '4px 0 0', color: '#475569', lineHeight: '1.4' }}>
                                                    "{item.feedback_text}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FeedbackModal;
