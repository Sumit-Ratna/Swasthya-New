import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
    Phone, Mail, Lock, Fingerprint, HeartPulse, Stethoscope, Users, 
    Building2, ShieldAlert, Sparkles, CheckCircle2, ArrowRight, 
    RefreshCw, KeyRound, AlertCircle, ChevronRight, UserCheck,
    User, Calendar, MapPin, Heart, Shield, ShieldCheck, Activity, FileText,
    UserPlus, LogIn, HelpCircle
} from 'lucide-react';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", 
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
    "Delhi (NCT)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const Login = () => {
    const { 
        sendOtp, 
        verifyOtp, 
        loginWithEmail, 
        registerWithEmail,
        resetPassword, 
        verifyAndResetPassword,
        register, 
        guestLogin, 
        updateUser, 
        user 
    } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Mode: 'login' or 'register'
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
    // Login Method: 'email' (primary) or 'phone' (optional)
    const [loginMethod, setLoginMethod] = useState('email'); 

    // Default role from location state or 'patient'
    const [selectedRole, setSelectedRole] = useState(location.state?.role || 'patient');
    const [step, setStep] = useState(1); // 1: Input, 2: OTP, 3: Profile Registration (Patient)

    // Auth Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [sentOtpCode, setSentOtpCode] = useState('');
    const [loginError, setLoginError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);

    // Password Reset Modal States
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStep, setForgotStep] = useState(1); // 1: Enter email, 2: Enter OTP & New Password
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Patient Indian Citizen Profile Form Data
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        gender: 'Male',
        dob: '2000-01-01',
        blood_group: 'O+',
        height: '170',
        weight: '68',
        marital_status: 'Single',
        abha_id: '',
        abha_address: '',
        aadhaar_last4: '',
        address_state: 'Uttar Pradesh',
        address_city: 'Lucknow',
        pincode: '226001',
        address: '',
        emergency_contact_name: '',
        emergency_contact: '',
        emergency_relation: 'Parent / Family',
        allergies: '',
        chronic_conditions: '',
        medications: '',
        diet: 'Vegetarian',
        smoking: 'No',
        alcohol: 'No'
    });

    const rolesConfig = [
        {
            id: 'health_worker',
            label: 'ASHA / ANM / Caregiver',
            title: 'ASHA / ANM & Caregiver Proxy',
            icon: <HeartPulse size={20} color="#0d9488" />,
            badgeBg: '#ccfbf1',
            badgeColor: '#0f766e',
            targetRoute: '/asha',
            demoPhone: '+919876543210'
        },
        {
            id: 'patient',
            label: 'Patient',
            title: 'Patient Self-Service',
            icon: <Fingerprint size={20} color="#2563eb" />,
            badgeBg: '#dbeafe',
            badgeColor: '#1d4ed8',
            targetRoute: '/home',
            demoPhone: '+917080135660'
        },
        {
            id: 'doctor',
            label: 'Doctor',
            title: 'Doctor & Medical Officer',
            icon: <Stethoscope size={20} color="#0284c7" />,
            badgeBg: '#e0f2fe',
            badgeColor: '#0369a1',
            targetRoute: '/doctor/dashboard',
            demoPhone: '+919123456780'
        },
        {
            id: 'facility_coordinator',
            label: 'Facility',
            title: 'Facility Staff & Coordinator',
            icon: <Building2 size={20} color="#d97706" />,
            badgeBg: '#fef3c7',
            badgeColor: '#b45309',
            targetRoute: '/facility-dashboard',
            demoPhone: '+919800000001'
        },
        {
            id: 'admin',
            label: 'Admin',
            title: 'State Health Authority & Admin',
            icon: <Lock size={20} color="#475569" />,
            badgeBg: '#f1f5f9',
            badgeColor: '#334155',
            targetRoute: '/admin',
            demoPhone: '+919999999999'
        }
    ];

    const currentRole = rolesConfig.find(r => r.id === selectedRole) || rolesConfig[1];

    useEffect(() => {
        let interval;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
            setLoginError("Please enter a valid 10-digit mobile number");
            return;
        }

        setLoading(true);
        setLoginError('');
        setSuccessMessage('');

        try {
            await sendOtp(cleanPhone);
            setOtp(''); 
            setStep(2);
            setTimer(60);
        } catch (err) {
            console.error("Login OTP error:", err);
            setOtp('');
            setStep(2);
            setTimer(60);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        const codeToVerify = otp.trim();
        if (!codeToVerify || codeToVerify.length < 6) {
            setLoginError("Please enter the 6-digit verification code sent to your mobile number");
            return;
        }

        setLoading(true);
        setLoginError('');
        setSuccessMessage('');

        try {
            const loggedIn = await verifyOtp(codeToVerify, phoneNumber, selectedRole);

            if (selectedRole === 'patient' || authMode === 'register') {
                const cleanLast4 = phoneNumber.slice(-4) || '5660';
                setProfileData(prev => ({
                    ...prev,
                    name: loggedIn?.name && loggedIn.name !== 'New User' && loggedIn.name !== 'Guest Patient' ? loggedIn.name : (prev.name || 'Aditya Singh'),
                    email: loggedIn?.email || email || prev.email || 'aditya.singh@example.com',
                    gender: loggedIn?.gender || prev.gender,
                    dob: loggedIn?.dob || prev.dob || '2005-07-02',
                    blood_group: loggedIn?.blood_group || prev.blood_group || 'B+',
                    height: loggedIn?.height || prev.height || '175',
                    weight: loggedIn?.weight || prev.weight || '70',
                    marital_status: loggedIn?.marital_status || prev.marital_status || 'Single',
                    address_city: loggedIn?.address_city || prev.address_city || 'Lucknow',
                    address_state: loggedIn?.address_state || prev.address_state || 'Uttar Pradesh',
                    pincode: loggedIn?.pincode || loggedIn?.medical_history?.pincode || '226001',
                    address: loggedIn?.address || loggedIn?.medical_history?.address || '123 Swasthya Marg, Gomti Nagar',
                    abha_id: loggedIn?.abha_id || loggedIn?.medical_history?.abha_id || `91-${cleanLast4}-4589-7080`,
                    abha_address: loggedIn?.abha_address || loggedIn?.medical_history?.abha_address || `aditya${cleanLast4}@abdm`,
                    aadhaar_last4: loggedIn?.aadhaar_last4 || loggedIn?.medical_history?.aadhaar_last4 || cleanLast4,
                    emergency_contact: loggedIn?.emergency_contact || prev.emergency_contact || '9876543210',
                    emergency_contact_name: loggedIn?.medical_history?.emergency_contact_name || prev.emergency_contact_name || 'Ramesh Singh',
                    allergies: loggedIn?.allergies || (Array.isArray(loggedIn?.medical_history?.allergies) ? loggedIn.medical_history.allergies.join(', ') : 'None'),
                    chronic_conditions: loggedIn?.chronic_conditions || (Array.isArray(loggedIn?.medical_history?.chronic_diseases) ? loggedIn.medical_history.chronic_diseases.join(', ') : 'None'),
                    medications: loggedIn?.medications || (Array.isArray(loggedIn?.medical_history?.current_meds) ? loggedIn.medical_history.current_meds.join(', ') : 'None')
                }));
                setStep(3);
            } else {
                navigate(currentRole.targetRoute);
            }
        } catch (err) {
            console.error("Verification error:", err);
            setLoginError(err.response?.data?.error || err.message || "Invalid verification code. Please check your SMS.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        if (e) e.preventDefault();
        if (!email || !email.includes('@')) {
            setLoginError("Please enter a valid Gmail / Email address");
            return;
        }
        if (!password) {
            setLoginError("Please enter your password");
            return;
        }

        setLoading(true);
        setLoginError('');
        setSuccessMessage('');

        try {
            const loggedIn = await loginWithEmail(email, password, selectedRole);
            if (selectedRole === 'patient') {
                navigate('/home');
            } else {
                navigate(currentRole.targetRoute);
            }
        } catch (err) {
            console.error("Email login error:", err);
            setLoginError(err.response?.data?.error || err.message || "Invalid Gmail ID or password. Please try again or reset your password.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterStep1 = async (e) => {
        if (e) e.preventDefault();
        if (!email || !email.includes('@')) {
            setLoginError("Please enter a valid Gmail / Email address");
            return;
        }
        if (!password || password.length < 6) {
            setLoginError("Password must be at least 6 characters long");
            return;
        }

        const rawPhone = phoneNumber ? phoneNumber.trim() : (profileData.phone || '');
        const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : null;
        const resolvedName = profileData.name || email.split('@')[0].replace(/[\._\-]/g, ' ');

        // If non-patient role (e.g. ASHA, Doctor, Caregiver, Facility, Admin), register and immediately navigate to their portal!
        if (selectedRole !== 'patient') {
            setLoading(true);
            setLoginError('');
            try {
                await registerWithEmail({
                    email: email,
                    password: password,
                    name: resolvedName,
                    phone: cleanPhone,
                    role: selectedRole || 'health_worker',
                    assigned_subcentre: 'Shirwal Sub-Centre',
                    assigned_phc: 'Shirwal PHC'
                });
                navigate(currentRole.targetRoute);
                return;
            } catch (err) {
                console.error("Non-patient register error:", err);
                setLoginError(err.response?.data?.error || err.message || "Registration failed in Supabase");
                setLoading(false);
                return;
            }
        }

        setProfileData(prev => ({
            ...prev,
            email: email,
            phone: rawPhone,
            name: resolvedName
        }));

        setLoginError('');
        setStep(3); // Proceed to Indian Citizen Demographics
    };

    const handleSendResetCode = async (e) => {
        if (e) e.preventDefault();
        if (!forgotEmail || !forgotEmail.includes('@')) {
            alert("Please enter your registered Gmail / Email address");
            return;
        }

        setLoading(true);
        try {
            const res = await resetPassword(forgotEmail);
            alert(res.message || `Password reset code sent to ${forgotEmail}`);
            setForgotStep(2);
        } catch (err) {
            alert(err.response?.data?.error || err.message || "Could not send reset code. Please check your Gmail address.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmResetPassword = async (e) => {
        if (e) e.preventDefault();
        if (!resetOtp || resetOtp.length < 6) {
            alert("Please enter the 6-digit verification code sent to your Gmail");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            alert("New password must be at least 6 characters long");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match. Please re-enter.");
            return;
        }

        setLoading(true);
        try {
            const res = await verifyAndResetPassword(forgotEmail, resetOtp, newPassword);
            alert(res.message || "Password updated successfully in Supabase! You can now log in with your new password.");
            setEmail(forgotEmail);
            setPassword(newPassword);
            setShowForgotModal(false);
            setForgotStep(1);
            setResetOtp('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            alert(err.response?.data?.error || err.message || "Failed to reset password. Please check your reset code.");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setLoginError('');

        try {
            const rawPhone = profileData.phone || phoneNumber || profileData.emergency_contact || '';
            const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : null;

            if (authMode === 'register') {
                // Register new account with Gmail and Password stored in Supabase
                await registerWithEmail({
                    ...profileData,
                    email: email,
                    password: password,
                    name: profileData.name || email.split('@')[0],
                    phone: cleanPhone,
                    role: selectedRole || 'patient'
                });
            } else {
                // Update profile in Supabase
                const payload = {
                    ...profileData,
                    email: email,
                    phone: cleanPhone,
                    role: selectedRole || 'patient'
                };

                const res = await axios.post('/api/profile/update', {
                    section: 'personal',
                    data: payload
                });

                if (res.data?.user) {
                    updateUser(res.data.user);
                } else {
                    updateUser(payload);
                }
            }

            if (selectedRole === 'patient') {
                navigate('/home');
            } else {
                navigate(currentRole.targetRoute);
            }
        } catch (err) {
            console.error("Profile / Register save error:", err);
            setLoginError(err.response?.data?.error || err.message || "Failed to complete registration in Supabase.");
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
            padding: '24px 16px 40px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            {/* Header Title */}
            <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '20px', maxWidth: '440px' }}
            >
                <div style={{
                    width: '74px',
                    height: '74px',
                    background: 'white',
                    borderRadius: '20px',
                    margin: '0 auto 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 22px -4px rgba(13, 148, 136, 0.18)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    padding: '4px'
                }}>
                    <img 
                        src="/logo.png" 
                        alt="Swasthya Logo" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                </div>
            </motion.div>

            {/* Main Interactive Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: step === 3 ? '580px' : '440px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
                    border: '1px solid #f1f5f9',
                    boxSizing: 'border-box'
                }}
            >
                {step !== 3 && (
                    <>
                        {/* 1. Login / New User Registration Segmented Switcher */}
                        <div style={{
                            display: 'flex',
                            background: '#f1f5f9',
                            padding: '4px',
                            borderRadius: '14px',
                            marginBottom: '18px'
                        }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthMode('login');
                                    setStep(1);
                                    setLoginError('');
                                    const cur = rolesConfig.find(r => r.id === selectedRole);
                                    if (cur) setPhoneNumber(cur.demoPhone.replace('+91', ''));
                                }}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: authMode === 'login' ? 'white' : 'transparent',
                                    color: authMode === 'login' ? '#0f172a' : '#64748b',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    boxShadow: authMode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <LogIn size={15} color={authMode === 'login' ? '#0d9488' : '#64748b'} />
                                <span>Sign In</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthMode('register');
                                    setStep(1);
                                    setLoginError('');
                                    setPhoneNumber('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: authMode === 'register' ? 'white' : 'transparent',
                                    color: authMode === 'register' ? '#0f172a' : '#64748b',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    boxShadow: authMode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <UserPlus size={15} color={authMode === 'register' ? '#0284c7' : '#64748b'} />
                                <span>New User Register</span>
                            </button>
                        </div>

                        {/* 2. Persona Selector Grid */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                Choose Persona Role:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {rolesConfig.map((r) => {
                                    const isSelected = selectedRole === r.id;
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedRole(r.id);
                                                if (authMode === 'login') {
                                                    setPhoneNumber(r.demoPhone.replace('+91', ''));
                                                }
                                            }}
                                            style={{
                                                padding: '10px 4px',
                                                borderRadius: '12px',
                                                border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                                                background: isSelected ? '#f0fdfa' : 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {r.icon}
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: isSelected ? 700 : 500,
                                                color: isSelected ? '#0f766e' : '#64748b',
                                                textAlign: 'center'
                                            }}>
                                                {r.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Auth Method Toggle (Gmail ID Primary vs Mobile Phone Optional) */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('email'); setLoginError(''); }}
                                style={{
                                    flex: 1.2,
                                    padding: '9px',
                                    borderRadius: '10px',
                                    border: loginMethod === 'email' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                                    background: loginMethod === 'email' ? '#f0f9ff' : 'white',
                                    color: loginMethod === 'email' ? '#0369a1' : '#64748b',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Mail size={14} />
                                <span>Gmail / Email (Primary)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('phone'); setLoginError(''); }}
                                style={{
                                    flex: 0.8,
                                    padding: '9px',
                                    borderRadius: '10px',
                                    border: loginMethod === 'phone' ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                                    background: loginMethod === 'phone' ? '#f0fdfa' : 'white',
                                    color: loginMethod === 'phone' ? '#0f766e' : '#64748b',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Phone size={14} />
                                <span>Mobile OTP (Optional)</span>
                            </button>
                        </div>
                    </>
                )}

                {/* Error Banner */}
                {loginError && (
                    <div style={{
                        padding: '12px 14px',
                        background: '#fee2e2',
                        borderRadius: '12px',
                        border: '1px solid #fca5a5',
                        color: '#991b1b',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ fontWeight: 600 }}>{loginError}</span>
                        </div>
                        {authMode === 'login' && loginError.toLowerCase().includes('no account') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthMode('register');
                                    setStep(1);
                                    setLoginError('');
                                }}
                                style={{
                                    alignSelf: 'flex-start',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginTop: '2px'
                                }}
                            >
                                <UserPlus size={13} />
                                <span>Register as {currentRole.label} with this Gmail now →</span>
                            </button>
                        )}
                    </div>
                )}

                {/* STEP 1: Input Form */}
                {step === 1 && (
                    <>
                        {authMode === 'register' ? (
                            /* Registration Step 1: Name, Gmail, Password, Optional Mobile */
                            <form onSubmit={handleRegisterStep1} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Full Name (पूरा नाम) *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            required
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            placeholder="e.g. Aditya Singh"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                            autoFocus
                                        />
                                        <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Gmail / Email Address (Primary Identity) *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your.email@gmail.com"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                        />
                                        <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                        Used for multi-device access & instant password resets
                                    </span>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Create Password (पासवर्ड बनाएं) *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimum 6 characters"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                        />
                                        <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Mobile Number (Optional / वैकल्पिक)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="10-digit number (Optional)"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                        />
                                        <Phone size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                                        You can also link ABHA / ABDM phone number later
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '12px 18px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '14px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                                        marginTop: '4px'
                                    }}
                                >
                                    <span>Continue to Profile Setup (2/2)</span>
                                    <ArrowRight size={16} />
                                </button>
                            </form>
                        ) : loginMethod === 'email' ? (
                            /* Primary Gmail Login Form */
                            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Gmail / Email Address *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your.email@gmail.com"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                            autoFocus
                                        />
                                        <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                            Password *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => { 
                                                setForgotEmail(email); 
                                                setForgotStep(1); 
                                                setShowForgotModal(true); 
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                        />
                                        <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '12px 18px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '14px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                                        marginTop: '4px'
                                    }}
                                >
                                    {loading ? <span>Signing In...</span> : <><span>Sign In with Gmail</span> <ArrowRight size={16} /></>}
                                </button>
                            </form>
                        ) : (
                            /* Secondary / Optional Mobile OTP Login */
                            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Mobile Number (Optional Mobile Login)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="Enter 10-digit mobile number"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px 12px 42px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}
                                            autoFocus
                                        />
                                        <Phone size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                                        Instant OTP verification via Swasthya Security Gateway
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
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
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? <span>Sending Code...</span> : <><span>Send Mobile OTP</span> <ArrowRight size={16} /></>}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* STEP 2: OTP Verification for Mobile */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: '#e0f2fe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                flexShrink: 0
                            }}>
                                <Phone size={18} color="#0284c7" />
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    Verification Code Sent
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    SMS verification code sent to <strong style={{ color: '#0f172a' }}>+91 {phoneNumber}</strong>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Enter 6-Digit OTP Code (SMS कोड दर्ज करें) *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter 6-digit OTP"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 42px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #cbd5e1',
                                        fontSize: '18px',
                                        letterSpacing: '4px',
                                        fontWeight: 700,
                                        boxSizing: 'border-box',
                                        color: '#0f172a'
                                    }}
                                    autoFocus
                                />
                                <KeyRound size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                                Enter the verification code received on your mobile SMS
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            style={{
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
                                cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                                opacity: (loading || otp.length < 6) ? 0.6 : 1
                            }}
                        >
                            {loading ? (
                                <span>Verifying OTP...</span>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} />
                                    <span>{authMode === 'register' ? 'Verify & Complete Profile' : `Verify & Enter ${currentRole.label} Portal`}</span>
                                </>
                            )}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtp(''); setLoginError(''); }}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                            >
                                ← Change Number
                            </button>
                            {timer > 0 ? (
                                <span>Resend in {timer}s</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* STEP 3: Complete Indian Citizen Health Profile */}
                {step === 3 && (
                    <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '12px', borderRadius: '12px', fontSize: '12px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={18} color="#0d9488" />
                            <span><strong>Indian Citizen Healthcare Profile:</strong> Automatically synced to your Supabase digital health locker & ABDM record.</span>
                        </div>

                        {/* 1. Basic Demographics */}
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={15} color="#0284c7" /> 1. Personal Demographics
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Full Name (पूरा नाम) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={profileData.name}
                                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                        placeholder="e.g. Aditya Singh"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Gmail / Email ID *</label>
                                    <input
                                        type="email"
                                        required
                                        value={email || profileData.email}
                                        onChange={(e) => { setEmail(e.target.value); setProfileData({ ...profileData, email: e.target.value }); }}
                                        placeholder="your.email@gmail.com"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Mobile Number (मोबाइल नंबर) *</label>
                                    <input
                                        type="tel"
                                        value={profileData.phone || phoneNumber}
                                        onChange={(e) => { 
                                            const val = e.target.value;
                                            setPhoneNumber(val); 
                                            setProfileData({ ...profileData, phone: val }); 
                                        }}
                                        placeholder="10-digit mobile"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Gender *</label>
                                    <select
                                        value={profileData.gender}
                                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Date of Birth *</label>
                                    <input
                                        type="date"
                                        required
                                        value={profileData.dob}
                                        onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Blood Group *</label>
                                    <select
                                        value={profileData.blood_group}
                                        onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })}
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    >
                                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. National Health ID & ABHA */}
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Shield size={15} color="#0d9488" /> 2. National Health ID (ABDM / ABHA)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>14-Digit ABHA Number</label>
                                    <input
                                        type="text"
                                        value={profileData.abha_id}
                                        onChange={(e) => setProfileData({ ...profileData, abha_id: e.target.value })}
                                        placeholder="91-XXXX-XXXX-XXXX"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>ABHA Address</label>
                                    <input
                                        type="text"
                                        value={profileData.abha_address}
                                        onChange={(e) => setProfileData({ ...profileData, abha_address: e.target.value })}
                                        placeholder="user@abdm"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Aadhaar Last 4</label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={profileData.aadhaar_last4}
                                        onChange={(e) => setProfileData({ ...profileData, aadhaar_last4: e.target.value })}
                                        placeholder="5660"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Address in India */}
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={15} color="#ea580c" /> 3. Residential Address (India)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>State (राज्य) *</label>
                                    <select
                                        value={profileData.address_state}
                                        onChange={(e) => setProfileData({ ...profileData, address_state: e.target.value })}
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    >
                                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>District / City *</label>
                                    <input
                                        type="text"
                                        required
                                        value={profileData.address_city}
                                        onChange={(e) => setProfileData({ ...profileData, address_city: e.target.value })}
                                        placeholder="e.g. Lucknow / Mumbai"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>PIN Code *</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={profileData.pincode}
                                        onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value })}
                                        placeholder="226001"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Full Street / Village Address</label>
                                <input
                                    type="text"
                                    value={profileData.address}
                                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                    placeholder="House/Plot No., Street, Landmark"
                                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* 4. Emergency Contact & Clinical Baseline */}
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={15} color="#db2777" /> 4. Emergency Contact & Health Baseline
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Emergency Contact Name</label>
                                    <input
                                        type="text"
                                        value={profileData.emergency_contact_name}
                                        onChange={(e) => setProfileData({ ...profileData, emergency_contact_name: e.target.value })}
                                        placeholder="Contact Person Name"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Emergency Phone</label>
                                    <input
                                        type="tel"
                                        value={profileData.emergency_contact}
                                        onChange={(e) => setProfileData({ ...profileData, emergency_contact: e.target.value })}
                                        placeholder="10-digit phone number"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Known Allergies</label>
                                    <input
                                        type="text"
                                        value={profileData.allergies}
                                        onChange={(e) => setProfileData({ ...profileData, allergies: e.target.value })}
                                        placeholder="e.g. Penicillin, Peanuts, None"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>Chronic Conditions</label>
                                    <input
                                        type="text"
                                        value={profileData.chronic_conditions}
                                        onChange={(e) => setProfileData({ ...profileData, chronic_conditions: e.target.value })}
                                        placeholder="e.g. Diabetes, Hypertension, None"
                                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    flex: 1,
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
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                                }}
                            >
                                {loading ? <span>Saving Profile to Supabase...</span> : <><span>Save Profile & Enter Swasthya</span> <ArrowRight size={16} /></>}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/home')}
                                style={{
                                    padding: '12px 16px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Skip for Now
                            </button>
                        </div>
                    </form>
                )}

                {/* Bottom Persona Switcher Link */}
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px'
                }}>
                    <button
                        type="button"
                        onClick={() => navigate('/roles')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#0f766e',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>Explore All 6 Personas Grid</span>
                        <ChevronRight size={14} />
                    </button>
                </div>

                {/* Footer Security Badge */}
                <div style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '10px',
                    color: '#94a3b8'
                }}>
                    <span>Secured by Supabase PostgreSQL • ABDM FHIR Standards • Multi-Device Sync</span>
                </div>
            </motion.div>

            {/* Forgot Password / Gmail Reset Modal */}
            <AnimatePresence>
                {showForgotModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 1000
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '24px',
                                width: '100%',
                                maxWidth: '420px',
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                            }}
                        >
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                {forgotStep === 1 ? 'Reset Password via Gmail' : 'Enter Verification Code & New Password'}
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
                                {forgotStep === 1 
                                    ? 'Enter your registered Gmail address. We will send a secure 6-digit verification code to reset your password in Supabase.'
                                    : `We sent a 6-digit verification code to ${forgotEmail}. Please enter the code and your new password.`}
                            </p>

                            {forgotStep === 1 ? (
                                <form onSubmit={handleSendResetCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Gmail / Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="your.email@gmail.com"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: '#0284c7',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                cursor: loading ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {loading ? 'Sending Code...' : 'Send Verification Code'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotModal(false)}
                                            style={{
                                                padding: '10px 16px',
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            6-Digit Verification Code (Gmail OTP) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={resetOtp}
                                            onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="123456"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '16px', fontWeight: 700, letterSpacing: '4px', boxSizing: 'border-box' }}
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            New Password *
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password (min 6 chars)"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Confirm New Password *
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: '#0d9488',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                cursor: loading ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {loading ? 'Updating Password...' : 'Reset & Update Password'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForgotStep(1)}
                                            style={{
                                                padding: '10px 16px',
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Back
                                        </button>
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

export default Login;

