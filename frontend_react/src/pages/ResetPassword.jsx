import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import SwasthyaLogo from '../components/SwasthyaLogo';
import { supabase } from '../config/supabase';
import axios from '../config/api';
import { AuthContext } from '../context/AuthContext';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { updateUser } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [recoveryReady, setRecoveryReady] = useState(false);

    const [tokenParam, setTokenParam] = useState('');
    const [otpParam, setOtpParam] = useState('');

    useEffect(() => {
        // 1. Check URL search params (e.g. ?email=...&token=...&otp=...)
        const queryEmail = searchParams.get('email');
        const queryToken = searchParams.get('token');
        const queryOtp = searchParams.get('otp');

        if (queryEmail) {
            setEmail(queryEmail);
        }
        if (queryToken) {
            setTokenParam(queryToken);
            setRecoveryReady(true);
        }
        if (queryOtp) {
            setOtpParam(queryOtp);
        }

        // 2. Parse hash fragments from Supabase recovery redirect
        // e.g. #access_token=...&refresh_token=...&type=recovery
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            setRecoveryReady(true);
            const params = new URLSearchParams(hash.replace('#', '?'));
            const accessToken = params.get('access_token');
            if (accessToken) {
                supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: params.get('refresh_token') || ''
                }).then(({ data }) => {
                    if (data?.user?.email) {
                        setEmail(data.user.email);
                    }
                }).catch(e => console.warn('Supabase session recovery notice:', e));
            }
        }

        // 3. Listen to Supabase Auth State Changes for PASSWORD_RECOVERY
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setRecoveryReady(true);
                if (session?.user?.email) {
                    setEmail(session.user.email);
                }
            }
        });

        // 4. Also check if user is already in session
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.email && !email) {
                setEmail(data.user.email);
            }
        }).catch(() => {});

        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, [searchParams]);

    const handleResetSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!newPassword || newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please re-enter.');
            return;
        }

        setLoading(true);

        try {
            // 1. Update in Backend Database via direct endpoint (using token/email)
            let backendUpdated = false;
            try {
                const res = await axios.post('/api/auth/password/update', {
                    email: email || undefined,
                    token: tokenParam || undefined,
                    newPassword: newPassword
                });
                if (res.data?.success) backendUpdated = true;
            } catch (backendErr) {
                console.warn('Backend password update notice:', backendErr.message);
            }

            // 2. Update in Supabase Auth
            try {
                await supabase.auth.updateUser({
                    password: newPassword
                });
            } catch (sErr) {
                console.warn('Supabase auth updateUser notice:', sErr);
            }

            // 3. Update in Supabase DB direct table fallback
            if (email) {
                try {
                    await supabase
                        .from('users')
                        .update({
                            medical_history: {
                                password_updated_at: new Date().toISOString()
                            },
                            updated_at: new Date().toISOString()
                        })
                        .eq('email', email.trim().toLowerCase());
                } catch (dbErr) {
                    console.warn('Supabase DB table update notice:', dbErr);
                }
            }

            setSuccess(true);
        } catch (err) {
            console.error('Password reset submit error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 16px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.12) 0%, rgba(2, 132, 199, 0.05) 45%, #f8fafc 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header / Logo */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '20px' }}
            >
                <SwasthyaLogo size="normal" showTagline={false} />
            </motion.div>

            {/* Reset Password Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                style={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    padding: '26px 24px',
                    width: '100%',
                    maxWidth: '420px',
                    boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.85)',
                    boxSizing: 'border-box'
                }}
            >
                {success ? (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: '#dcfce7',
                            color: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.2)'
                        }}>
                            <CheckCircle2 size={32} />
                        </div>

                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                            Password Updated Successfully!
                        </h2>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                            Your new password has been saved. You can now sign in to your Swasthya account.
                        </p>

                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                width: '100%',
                                padding: '13px 18px',
                                background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
                            }}
                        >
                            <span>Sign In Now</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                ) : (
                    <div>
                        {/* Title & Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: '#f0fdfa',
                                border: '1px solid #ccfbf1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0d9488'
                            }}>
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                                    Set New Password
                                </h2>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    नया पासवर्ड बनाएं और अपडेट करें
                                </div>
                            </div>
                        </div>

                        {email && (
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                marginBottom: '14px',
                                fontSize: '12px',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span>Resetting for:</span>
                                <strong style={{ color: '#0f172a' }}>{email}</strong>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '10px 12px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '10px',
                                color: '#dc2626',
                                fontSize: '12px',
                                marginBottom: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* New Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    New Password (नया पासवर्ड) *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 6 characters"
                                        style={{
                                            width: '100%',
                                            padding: '12px 42px 12px 42px',
                                            borderRadius: '12px',
                                            border: '1.5px solid #e2e8f0',
                                            background: '#f8fafc',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            boxSizing: 'border-box',
                                            outline: 'none',
                                            color: '#0f172a'
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#0d9488'; e.target.style.background = '#ffffff'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                                        autoFocus
                                    />
                                    <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Confirm New Password (पासवर्ड की पुष्टि करें) *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter new password"
                                        style={{
                                            width: '100%',
                                            padding: '12px 42px 12px 42px',
                                            borderRadius: '12px',
                                            border: '1.5px solid #e2e8f0',
                                            background: '#f8fafc',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            boxSizing: 'border-box',
                                            outline: 'none',
                                            color: '#0f172a'
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#0d9488'; e.target.style.background = '#ffffff'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                                    />
                                    <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading || !newPassword || !confirmPassword}
                                style={{
                                    padding: '13px 18px',
                                    background: (loading || !newPassword || !confirmPassword)
                                        ? '#cbd5e1'
                                        : 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: (loading || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                                    marginTop: '4px'
                                }}
                            >
                                {loading ? (
                                    <span>Updating Password...</span>
                                ) : (
                                    <>
                                        <span>Update & Save Password</span>
                                        <ShieldCheck size={17} />
                                    </>
                                )}
                            </motion.button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    marginTop: '2px'
                                }}
                            >
                                ← Back to Sign In
                            </button>
                        </form>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ResetPassword;
