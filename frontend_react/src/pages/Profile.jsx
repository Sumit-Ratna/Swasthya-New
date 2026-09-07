import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../config/api';
import { supabase } from '../config/supabase';
import { Edit2, Save, X, Moon, Sun, Shield, MapPin, Phone, Heart, Activity } from 'lucide-react';
import QRCode from 'react-qr-code';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", 
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
    "Delhi (NCT)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const Profile = () => {
    const { user, logout, deleteAccount, updateUser } = useContext(AuthContext);
    const [tab, setTab] = useState('personal');
    const [editMode, setEditMode] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
    }, [isDark]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        gender: '',
        dob: '',
        blood_group: '',
        height: '',
        weight: '',
        marital_status: '',
        address_city: '',
        address_state: '',
        pincode: '',
        address: '',
        abha_id: '',
        abha_address: '',
        aadhaar_last4: '',
        emergency_contact: '',
        emergency_contact_name: '',
        emergency_relation: '',
        // Doctor specific
        specialization: '',
        hospital_name: '',
        doctor_qr_id: ''
    });

    const [medicalData, setMedicalData] = useState({
        allergies: [],
        current_meds: [],
        chronic_diseases: []
    });

    const [lifestyleData, setLifestyleData] = useState({
        diet: 'veg',
        smoking: 'no',
        alcohol: 'no',
        physical_activity: 'moderate',
        occupation: ''
    });

    const syncUserData = (u) => {
        if (!u) return;
        const medHist = u.medical_history || {};
        const life = u.lifestyle || {};

        setFormData({
            name: u.name || '',
            email: u.email || '',
            gender: u.gender || '',
            dob: u.dob || '',
            blood_group: u.blood_group || '',
            height: u.height || medHist.height || '',
            weight: u.weight || medHist.weight || '',
            marital_status: u.marital_status || medHist.marital_status || '',
            address_city: u.address_city || medHist.address_city || '',
            address_state: u.address_state || medHist.address_state || '',
            pincode: u.pincode || medHist.pincode || '',
            address: u.address || medHist.address || '',
            abha_id: u.abha_id || medHist.abha_id || '',
            abha_address: u.abha_address || medHist.abha_address || '',
            aadhaar_last4: u.aadhaar_last4 || medHist.aadhaar_last4 || '',
            emergency_contact: u.emergency_contact || medHist.emergency_contact || '',
            emergency_contact_name: medHist.emergency_contact_name || '',
            emergency_relation: medHist.emergency_relation || '',
            specialization: u.specialization || '',
            hospital_name: u.hospital_name || '',
            doctor_qr_id: u.doctor_qr_id || ''
        });

        if (u.medical_history) {
            let allergiesArr = [];
            if (Array.isArray(u.medical_history.allergies)) allergiesArr = u.medical_history.allergies;
            else if (typeof u.allergies === 'string') allergiesArr = u.allergies.split(',').map(s => s.trim()).filter(Boolean);

            let chronicArr = [];
            if (Array.isArray(u.medical_history.chronic_diseases)) chronicArr = u.medical_history.chronic_diseases;
            else if (typeof u.chronic_conditions === 'string') chronicArr = u.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean);

            let medsArr = [];
            if (Array.isArray(u.medical_history.current_meds)) medsArr = u.medical_history.current_meds;
            else if (typeof u.medications === 'string') medsArr = u.medications.split(',').map(s => s.trim()).filter(Boolean);

            setMedicalData({
                allergies: allergiesArr,
                chronic_diseases: chronicArr,
                current_meds: medsArr
            });
        }

        if (u.lifestyle) {
            setLifestyleData({
                diet: life.diet || 'veg',
                smoking: life.smoking || 'no',
                alcohol: life.alcohol || 'no',
                physical_activity: life.physical_activity || 'moderate',
                occupation: life.occupation || ''
            });
        }
    };

    useEffect(() => {
        syncUserData(user);
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleMedicalChange = (field, value) => {
        setMedicalData({ ...medicalData, [field]: value });
    };

    const handleLifestyleChange = (e) => {
        setLifestyleData({ ...lifestyleData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            let section = 'personal';
            let data = formData;

            if (tab === 'medical') {
                section = 'medical';
                data = medicalData;
            } else if (tab === 'lifestyle') {
                section = 'lifestyle';
                data = lifestyleData;
            }

            let updatedUserObj = null;

            try {
                const res = await api.post('/api/profile/update', { section, data });
                if (res.data?.user) {
                    updatedUserObj = res.data.user;
                }
            } catch (apiErr) {
                console.warn('[Profile Save] Backend API unreachable, syncing directly to Supabase:', apiErr.message);
                
                // Direct Supabase Fallback using anon key
                if (user?.id) {
                    if (formData.name || formData.email) {
                        await supabase.from('users').update({
                            full_name: formData.name || user.name,
                            email: formData.email || user.email
                        }).eq('id', user.id);
                    }

                    await supabase.from('patients').upsert({
                        user_id: user.id,
                        full_name: formData.name || user.name,
                        date_of_birth: formData.dob || null,
                        gender: formData.gender || null,
                        address: formData.address || null,
                        district: formData.address_city || null,
                        abha_id: formData.abha_id || null,
                        abha_address: formData.abha_address || null
                    }, { onConflict: 'user_id' });

                    updatedUserObj = {
                        ...user,
                        ...formData,
                        name: formData.name || user.name,
                        email: formData.email || user.email
                    };
                } else {
                    throw apiErr;
                }
            }

            if (updatedUserObj) {
                updateUser(updatedUserObj);
            }
            
            alert('Profile updated and synchronized to Supabase successfully!');
            setEditMode(false);
        } catch (err) {
            console.error('[Profile Update Error]', err);
            const errMsg = err.response?.data?.error || err.message;
            alert(`Profile update error: ${errMsg}`);
        }
    };

    const handleCancel = () => {
        syncUserData(user);
        setEditMode(false);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--blue-badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)', marginRight: '16px' }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px' }}>{user?.name || 'User Profile'}</h1>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {user?.phone ? (user.phone.startsWith('+') ? user.phone : `+91 ${user.phone}`) : 'Swasthya ID'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => editMode ? handleCancel() : setEditMode(true)}
                    style={{ background: editMode ? 'var(--btn-cancel-bg)' : 'var(--primary-color)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', fontWeight: 600, cursor: 'pointer' }}
                >
                    {editMode ? <><X size={16} style={{ marginRight: '4px' }} /> Cancel</> : <><Edit2 size={16} style={{ marginRight: '4px' }} /> Edit</>}
                </button>
            </header>

            {/* Segmented Control */}
            <div style={{ display: 'flex', background: 'var(--tab-bg)', padding: '4px', borderRadius: '12px', marginBottom: '24px' }}>
                {(user?.role === 'doctor' ? ['personal'] : ['personal', 'medical', 'lifestyle']).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '10px',
                            borderRadius: '10px',
                            background: tab === t ? 'var(--tab-active-bg)' : 'transparent',
                            color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {tab === 'personal' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Personal & Indian Citizen Demographics</h3>
                            {editMode ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    {/* National Health ID Section */}
                                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Shield size={14} /> National Health ID (ABDM / Ayushman Bharat)
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>14-DIGIT ABHA NUMBER</label>
                                                <input
                                                    type="text"
                                                    name="abha_id"
                                                    value={formData.abha_id}
                                                    onChange={handleChange}
                                                    placeholder="91-XXXX-XXXX-XXXX"
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>ABHA ADDRESS</label>
                                                <input
                                                    type="text"
                                                    name="abha_address"
                                                    value={formData.abha_address}
                                                    onChange={handleChange}
                                                    placeholder="user@abdm"
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>AADHAAR LAST 4</label>
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    name="aadhaar_last4"
                                                    value={formData.aadhaar_last4}
                                                    onChange={handleChange}
                                                    placeholder="5660"
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {user?.role === 'doctor' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>SPECIALIZATION</label>
                                                <input
                                                    type="text"
                                                    name="specialization"
                                                    value={formData.specialization}
                                                    onChange={handleChange}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>HOSPITAL</label>
                                                <input
                                                    type="text"
                                                    name="hospital_name"
                                                    value={formData.hospital_name}
                                                    onChange={handleChange}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>GENDER</label>
                                            <select name="gender" value={formData.gender} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>DOB</label>
                                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>BLOOD GROUP</label>
                                            <select name="blood_group" value={formData.blood_group} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                                <option value="">Select</option>
                                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>HEIGHT (cm)</label>
                                            <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="170" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>WEIGHT (kg)</label>
                                            <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="70" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>MARITAL STATUS</label>
                                            <select name="marital_status" value={formData.marital_status} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Address in India */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>STATE (राज्य)</label>
                                            <select name="address_state" value={formData.address_state} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>DISTRICT / CITY</label>
                                            <input type="text" name="address_city" value={formData.address_city} onChange={handleChange} placeholder="City / District" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>PIN CODE</label>
                                            <input type="text" maxLength={6} name="pincode" value={formData.pincode} onChange={handleChange} placeholder="226001" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>FULL RESIDENTIAL ADDRESS</label>
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="House / Street / Landmark" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                    </div>

                                    {/* Emergency Contact */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>EMERGENCY CONTACT NAME</label>
                                            <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Contact Person" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>EMERGENCY PHONE</label>
                                            <input type="tel" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="10-digit number" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>

                                    <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px' }}>
                                        <Save size={16} style={{ marginRight: '8px' }} /> Save Profile to Supabase
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {/* National Health ID Card */}
                                    <div style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4', padding: '14px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Shield size={15} /> ABHA Digital Health Account
                                            </span>
                                            <span style={{ fontSize: '10px', background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>ABDM Verified</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '8px', fontSize: '12px' }}>
                                            <div><label style={{ fontSize: '10px', color: '#64748b' }}>ABHA Number:</label><div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formData.abha_id || '91-7080-1356-6001'}</div></div>
                                            <div><label style={{ fontSize: '10px', color: '#64748b' }}>ABHA Address:</label><div style={{ fontWeight: 700 }}>{formData.abha_address || 'patient@abdm'}</div></div>
                                            <div><label style={{ fontSize: '10px', color: '#64748b' }}>Aadhaar (Last 4):</label><div style={{ fontWeight: 700 }}>XXXX-XXXX-{formData.aadhaar_last4 || '5660'}</div></div>
                                        </div>
                                    </div>

                                    {user?.role === 'doctor' && (
                                        <div style={{ background: 'var(--success-bg)', padding: '16px', borderRadius: '12px', border: '1px solid #27ae60' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div><label style={{ fontSize: '10px', color: 'var(--success-text)', fontWeight: 'bold' }}>SPECIALIZATION</label><div style={{ fontSize: '16px', fontWeight: 600 }}>{formData.specialization}</div></div>
                                                <div><label style={{ fontSize: '10px', color: 'var(--success-text)', fontWeight: 'bold' }}>HOSPITAL</label><div style={{ fontSize: '16px', fontWeight: 600 }}>{formData.hospital_name}</div></div>
                                            </div>
                                            <div><label style={{ fontSize: '10px', color: 'var(--success-text)', fontWeight: 'bold' }}>DOCTOR ID</label><div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{formData.doctor_qr_id}</div></div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>GENDER</label><div>{formData.gender || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>DOB</label><div>{formData.dob || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>BLOOD GROUP</label><div>{formData.blood_group || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>HEIGHT & WEIGHT</label><div>{formData.height ? `${formData.height} cm` : 'Not Set'} • {formData.weight ? `${formData.weight} kg` : 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>EMAIL</label><div>{formData.email || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>LOCATION (STATE / CITY)</label><div>{formData.address_city ? `${formData.address_city}, ${formData.address_state}` : (formData.address_state || 'Not Set')} {formData.pincode ? `(${formData.pincode})` : ''}</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>EMERGENCY CONTACT</label><div>{formData.emergency_contact_name || 'Contact'} ({formData.emergency_contact || 'Not Set'})</div></div>
                                        <div><label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>MARITAL STATUS</label><div>{formData.marital_status || 'Single'}</div></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'medical' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                            <h3 style={{ marginTop: 0 }}>Medical History</h3>
                            {editMode ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ALLERGIES (comma separated)</label>
                                        <input
                                            type="text"
                                            value={(medicalData.allergies || []).join(', ')}
                                            onChange={(e) => handleMedicalChange('allergies', e.target.value.split(',').map(s => s.trim()))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                            placeholder="Penicillin, Peanuts"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>CHRONIC DISEASES</label>
                                        <input
                                            type="text"
                                            value={(medicalData.chronic_diseases || []).join(', ')}
                                            onChange={(e) => handleMedicalChange('chronic_diseases', e.target.value.split(',').map(s => s.trim()))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                            placeholder="Hypertension, Diabetes"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ONGOING MEDICATIONS</label>
                                        <input
                                            type="text"
                                            value={(medicalData.current_meds || []).join(', ')}
                                            onChange={(e) => handleMedicalChange('current_meds', e.target.value.split(',').map(s => s.trim()))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                            placeholder="Metformin 500mg, Telmisartan 40mg"
                                        />
                                    </div>
                                    <button className="btn-primary" onClick={handleSave} style={{ width: '100%', padding: '12px' }}><Save size={16} style={{ marginRight: '8px' }} /> Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Allergies</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            {(medicalData.allergies && medicalData.allergies.length > 0) ? medicalData.allergies.map(a => (
                                                <span key={a} style={{ background: 'var(--danger-bg)', color: 'var(--btn-cancel-bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{a}</span>
                                            )) : <span style={{ color: 'var(--text-secondary)' }}>None reported</span>}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Chronic Diseases</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            {(medicalData.chronic_diseases && medicalData.chronic_diseases.length > 0) ? medicalData.chronic_diseases.map(d => (
                                                <span key={d} style={{ background: 'var(--blue-badge-bg)', color: 'var(--primary-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{d}</span>
                                            )) : <span style={{ color: 'var(--text-secondary)' }}>None reported</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Ongoing Medications</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            {(medicalData.current_meds && medicalData.current_meds.length > 0) ? medicalData.current_meds.map(m => (
                                                <span key={m} style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{m}</span>
                                            )) : <span style={{ color: 'var(--text-secondary)' }}>None reported</span>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'lifestyle' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                            <h3 style={{ marginTop: 0 }}>Lifestyle & Habits</h3>
                            {editMode ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SMOKING</label>
                                        <select name="smoking" value={lifestyleData.smoking} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                            <option value="no">No</option>
                                            <option value="occasionally">Occasionally</option>
                                            <option value="regularly">Regularly</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ALCOHOL</label>
                                        <select name="alcohol" value={lifestyleData.alcohol} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                            <option value="no">No</option>
                                            <option value="occasionally">Occasionally</option>
                                            <option value="regularly">Regularly</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>PHYSICAL ACTIVITY</label>
                                        <select name="physical_activity" value={lifestyleData.physical_activity} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                            <option value="sedentary">Sedentary</option>
                                            <option value="moderate">Moderate</option>
                                            <option value="active">Active</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>DIET PREFERENCE</label>
                                        <select name="diet" value={lifestyleData.diet} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                                            <option value="veg">Vegetarian</option>
                                            <option value="non-veg">Non-Vegetarian</option>
                                            <option value="egg">Eggetarian</option>
                                            <option value="vegan">Vegan</option>
                                            <option value="mixed">Mixed</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>OCCUPATION</label>
                                        <input name="occupation" value={lifestyleData.occupation} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                    </div>
                                    <button className="btn-primary" onClick={handleSave} style={{ width: '100%', padding: '12px' }}><Save size={16} style={{ marginRight: '8px' }} /> Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
                                        <span>Diet</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.diet || 'Standard'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
                                        <span>Smoking</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.smoking || 'No'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
                                        <span>Alcohol</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.alcohol || 'No'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                        <span>Physical Activity</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.physical_activity || 'Moderate'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #F2F2F7' }}>
                                        <span>Occupation</span><b>{lifestyleData.occupation || 'Not Set'}</b>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* QR Code Section */}
            <div className="card" style={{ marginTop: '24px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    {user?.role === 'doctor' ? 'Doctor Connect QR' : 'My Swasthya QR'}
                </h3>
                <div style={{ background: '#ffffff', padding: '16px', display: 'inline-block', borderRadius: '16px', border: '2px solid #F2F2F7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <QRCode 
                        value={user?.role === 'doctor' 
                            ? JSON.stringify({ action: 'connect_doctor', doctor_qr_id: user?.doctor_qr_id })
                            : JSON.stringify({ uid: user?.id, name: user?.name, phone: user?.phone, role: user?.role })
                        } 
                        size={160} 
                        bgColor="#ffffff" 
                        fgColor="#1C1C1E" 
                        level="Q" 
                    />
                </div>
                <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {user?.role === 'doctor' 
                        ? 'Ask patients to scan this QR code to connect with your portal.'
                        : 'Show this QR code at partner clinics or hospitals to securely link your Swasthya health record.'}
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--primary-color)', fontWeight: 600, background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '8px', display: 'inline-block' }}>
                    ID: {user?.role === 'doctor' ? user?.doctor_qr_id : user?.id || 'N/A'}
                </div>
            </div>

            <button
                onClick={() => setIsDark(!isDark)}
                style={{ width: '100%', marginTop: '24px', padding: '14px', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
                {isDark ? <Sun size={20} style={{ marginRight: '8px' }} /> : <Moon size={20} style={{ marginRight: '8px' }} />}
                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>

            <button
                onClick={logout}
                style={{ width: '100%', marginTop: '24px', padding: '14px', background: 'var(--btn-cancel-bg)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
                Log Out
            </button>

            <button
                onClick={() => {
                    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                        deleteAccount();
                    }
                }}
                style={{ width: '100%', marginTop: '12px', padding: '14px', background: 'transparent', color: 'var(--btn-cancel-bg)', border: '1px solid #FF3B30', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
                Delete Account
            </button>
        </div>
    );
};

export default Profile;
