import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Lock, Stethoscope } from 'lucide-react';

const DoctorLogin = () => {
    const { sendOtp, verifyOtp, guestLogin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [sentOtpCode, setSentOtpCode] = useState('');
    const [loginError, setLoginError] = useState('');

    const handleSend = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setLoginError("Please enter a valid phone number (at least 10 digits)");
            return;
        }
        try {
            setLoginError('');
            const result = await sendOtp(phoneNumber);
            const receivedOtp = result?.otp || '123456';
            setSentOtpCode(receivedOtp);
            setOtp(receivedOtp);
            setIsNewUser(result?.isNew || false);
            setStep(2);
        } catch (err) {
            console.error("Doctor Login Error:", err);
            const fallbackCode = '123456';
            setSentOtpCode(fallbackCode);
            setOtp(fallbackCode);
            setStep(2);
        }
    };

    const handleVerify = async () => {
        try {
            setLoginError('');
            const codeToVerify = otp || sentOtpCode || '123456';
            await verifyOtp(codeToVerify, phoneNumber, 'doctor');
            navigate('/doctor/dashboard');
        } catch (err) {
            console.error("Verify Error:", err);
            setLoginError(err.response?.data?.error || err.message || "Invalid OTP code. Try 123456");
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'var(--bg-color)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
            >
                <div style={{
                    width: '64px', height: '64px',
                    background: 'var(--primary-color)',
                    borderRadius: '16px',
                    margin: '0 auto 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.4)'
                }}>
                    <Stethoscope color="white" size={32} />
                </div>

                <h1 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Doctor Portal</h1>
                <p style={{ marginBottom: '32px' }}>Secure access for medical professionals</p>

                <div className="card" style={{ padding: '40px 32px', textAlign: 'left', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
                    {loginError && (
                        <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '20px', background: '#fee2e2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            {loginError}
                        </div>
                    )}

                    {step === 1 ? (
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                <label>Registered Phone Number</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        style={{ paddingLeft: '44px' }}
                                    />
                                    <Phone size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>

                            <button className="btn-primary" onClick={handleSend}>
                                Send Verification Code
                            </button>

                            <button className="btn-primary" onClick={() => { guestLogin('doctor'); navigate('/doctor/dashboard'); }} style={{ marginTop: '12px', backgroundColor: 'var(--text-secondary)' }}>
                                Enter Without Authentication
                            </button>

                            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
                                <span
                                    onClick={() => navigate('/login')}
                                    style={{ color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                >
                                    Login as Patient <span style={{ marginLeft: '4px' }}>→</span>
                                </span>
                            </div>

                            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                New Doctor?{' '}
                                <span
                                    onClick={() => navigate('/signup', { state: { role: 'doctor' } })}
                                    style={{ color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Register Here
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{
                                padding: '12px 14px',
                                background: '#f0fdf4',
                                border: '1px solid #86efac',
                                borderRadius: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                                        📱 Doctor OTP Code
                                    </div>
                                    <div style={{ fontSize: '16px', color: '#15803d', fontWeight: 800, letterSpacing: '2px', marginTop: '2px' }}>
                                        {sentOtpCode || '123456'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOtp(sentOtpCode || '123456')}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        background: '#22c55e',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Auto-Fill
                                </button>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label>Enter OTP</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="1 2 3 4 5 6"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        style={{ paddingLeft: '44px', letterSpacing: '4px', fontWeight: '600' }}
                                    />
                                    <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                                    Code sent to {phoneNumber}. <span onClick={() => setStep(1)} style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}>Change</span>
                                </p>
                            </div>

                            <button className="btn-primary" onClick={handleVerify}>
                                Verify & Access Dashboard
                            </button>
                        </>
                    )}
                </div>

                {
                    isNewUser && step === 2 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'var(--danger-bg)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: 'var(--danger-text)',
                                border: '1px solid var(--danger-text)'
                            }}
                        >
                            ⚠️ New doctor registration requires admin approval
                        </motion.div>
                    )
                }
            </motion.div >
        </div >
    );
};

export default DoctorLogin;
