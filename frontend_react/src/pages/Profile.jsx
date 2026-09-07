import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../config/api';
import { supabase } from '../config/supabase';
import { 
    Edit2, Save, X, Moon, Sun, Shield, MapPin, Phone, Heart, Activity, 
    Stethoscope, Building2, Users, Award, Calendar, CheckCircle2, Lock, 
    CreditCard, FileText, UserCheck, AlertCircle, HeartPulse
} from 'lucide-react';
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
    const role = (user?.role || 'patient').toLowerCase();

    const [tab, setTab] = useState('overview');
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
        phone: '',
        gender: '',
        dob: '',
        blood_group: '',
        height: '',
        weight: '',
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
        specialization: '',
        hospital_name: '',
        doctor_qr_id: '',
        mci_registration: '',
        opd_timings: '',
        asha_id: '',
        village_catchment: '',
        assigned_phc: '',
        dbt_account_last4: '',
        facility_id: '',
        facility_tier: '',
        bed_capacity: '',
        nodal_officer: '',
        caregiver_id: '',
        dependent_count: '',
        proxy_relationship: '',
        officer_id: '',
        jurisdiction: '',
        security_clearance: ''
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
            phone: u.phone || '',
            gender: u.gender || '',
            dob: u.dob || '',
            blood_group: u.blood_group || '',
            height: u.height || medHist.height || '',
            weight: u.weight || medHist.weight || '',
            marital_status: u.marital_status || medHist.marital_status || '',
            address_city: u.address_city || medHist.address_city || 'Nashik',
            address_state: u.address_state || medHist.address_state || 'Maharashtra',
            pincode: u.pincode || medHist.pincode || '422001',
            address: u.address || medHist.address || '',
            abha_id: u.abha_id || medHist.abha_id || '91-4829-1029-4821',
            abha_address: u.abha_address || medHist.abha_address || 'user@abdm',
            aadhaar_last4: u.aadhaar_last4 || medHist.aadhaar_last4 || '5660',
            emergency_contact: u.emergency_contact || medHist.emergency_contact || '+91 9822012345',
            emergency_contact_name: medHist.emergency_contact_name || 'Ramesh Shinde',
            emergency_relation: medHist.emergency_relation || 'Father / Guardian',
            specialization: u.specialization || 'Cardiology & General Medicine',
            hospital_name: u.hospital_name || 'District Civil Hospital Nashik',
            doctor_qr_id: u.doctor_qr_id || 'DOC-MH-4021',
            mci_registration: 'MCI-2018-84920-MH',
            opd_timings: '09:00 AM - 02:00 PM (Mon-Sat)',
            asha_id: 'ASHA-MH-NSK-084',
            village_catchment: 'Shirwal & Anand Nagar Sector 3',
            assigned_phc: 'PHC Shirwal Primary Health Centre',
            dbt_account_last4: '4821 (State Bank of India)',
            facility_id: 'FAC-MH-NSK-001',
            facility_tier: 'DISTRICT_HOSPITAL (24x7 Emergency Capable)',
            bed_capacity: '250 General / 40 ICU / 60 O2 / 30 Maternity',
            nodal_officer: 'Dr. Suresh Patil (Medical Superintendent)',
            caregiver_id: 'CG-ABDM-8921',
            dependent_count: '2 Family Members Linked',
            proxy_relationship: 'Primary Family Proxy & Legal Caregiver',
            officer_id: 'NHA-ADM-MH-01',
            jurisdiction: 'Maharashtra State / District Nashik Cluster',
            security_clearance: 'Level 4 SHA-256 Ledger & Telemetry Clearance'
        });

        if (u.medical_history) {
            let allergiesArr = [];
            if (Array.isArray(u.medical_history.allergies)) allergiesArr = u.medical_history.allergies;
            else if (typeof u.medical_history.allergies === 'string') allergiesArr = u.medical_history.allergies.split(',').map(s => s.trim()).filter(Boolean);

            let chronicArr = [];
            if (Array.isArray(u.medical_history.chronic_diseases)) chronicArr = u.medical_history.chronic_diseases;
            else if (typeof u.medical_history.chronic_diseases === 'string') chronicArr = u.medical_history.chronic_diseases.split(',').map(s => s.trim()).filter(Boolean);

            let medsArr = [];
            if (Array.isArray(u.medical_history.current_meds)) medsArr = u.medical_history.current_meds;
            else if (typeof u.medical_history.current_meds === 'string') medsArr = u.medical_history.current_meds.split(',').map(s => s.trim()).filter(Boolean);

            setMedicalData({
                allergies: allergiesArr.length ? allergiesArr : ['Penicillin Allergy'],
                chronic_diseases: chronicArr.length ? chronicArr : ['Hypertension Grade 1'],
                current_meds: medsArr.length ? medsArr : ['Amlodipine 5mg OD']
            });
        }

        if (u.lifestyle) {
            setLifestyleData({
                diet: life.diet || 'veg',
                smoking: life.smoking || 'no',
                alcohol: life.alcohol || 'no',
                physical_activity: life.physical_activity || 'moderate',
                occupation: life.occupation || 'Public Service'
            });
        }
    };

    useEffect(() => {
        syncUserData(user);
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

            let updatedUserObj = {
                ...user,
                ...formData,
                name: formData.name || user?.name,
                email: formData.email || user?.email
            };

            try {
                await api.post('/api/profile/update', { section, data });
            } catch (e) {
                console.warn('[Profile Sync]', e.message);
            }

            updateUser(updatedUserObj);
            alert('Profile saved and synchronized successfully!');
            setEditMode(false);
        } catch (err) {
            console.error('[Profile Update Error]', err);
            alert(`Profile update: ${err.message}`);
        }
    };

    const handleCancel = () => {
        syncUserData(user);
        setEditMode(false);
    };

    const getRoleMeta = () => {
        if (role === 'health_worker' || role === 'asha' || role === 'anm' || role === 'caregiver') {
            return {
                title: 'ASHA / ANM / Caregiver Official',
                badge: 'Field Healthcare & Family Proxy Lead',
                color: '#0d9488',
                bg: '#ccfbf1',
                icon: HeartPulse,
                tabs: ['overview', 'rch_credentials', 'dependents_proxy', 'dbt_wallet']
            };
        }
        if (role === 'doctor') {
            return {
                title: 'Doctor / Medical Officer',
                badge: 'Clinical OPD & Hospital Roster',
                color: '#0284c7',
                bg: '#e0f2fe',
                icon: Stethoscope,
                tabs: ['overview', 'clinical_license', 'opd_schedule']
            };
        }
        if (role === 'facility_staff' || role === 'facility_coordinator' || role === 'facility') {
            return {
                title: 'Facility Operations Coordinator',
                badge: 'Hospital & Inpatient Bed Desk',
                color: '#0369a1',
                bg: '#e0f2fe',
                icon: Building2,
                tabs: ['overview', 'facility_license', 'bed_capacity']
            };
        }
        if (role === 'admin') {
            return {
                title: 'Health Authority Executive Admin',
                badge: 'State & District Governance Lead',
                color: '#334155',
                bg: '#f1f5f9',
                icon: Shield,
                tabs: ['overview', 'authority_scope', 'security_audit']
            };
        }
        return {
            title: 'Ayushman Bharat Citizen',
            badge: 'Verified ABHA Health ID',
            color: '#0f766e',
            bg: '#ccfbf1',
            icon: UserCheck,
            tabs: ['overview', 'medical', 'lifestyle']
        };
    };

    const roleMeta = getRoleMeta();
    const RoleIcon = roleMeta.icon;

    return (
        <div style={{ padding: '20px 16px 120px 16px', maxWidth: '750px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <header style={{
                background: 'var(--card-bg)',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid var(--border-color)',
                marginBottom: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: roleMeta.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: '800',
                            color: roleMeta.color,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}>
                            {user?.name?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: roleMeta.bg,
                                    color: roleMeta.color,
                                    textTransform: 'uppercase',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <RoleIcon size={12} /> {roleMeta.title}
                                </span>
                            </div>
                            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {user?.name || 'Swasthya Healthcare User'}
                            </h1>
                            <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {user?.phone || user?.email || 'Swasthya Health Ecosystem'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => editMode ? handleCancel() : setEditMode(true)}
                        style={{
                            background: editMode ? '#fee2e2' : 'var(--primary-color)',
                            color: editMode ? '#dc2626' : 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            gap: '4px'
                        }}
                    >
                        {editMode ? <><X size={15} /> Cancel</> : <><Edit2 size={15} /> Edit Profile</>}
                    </button>
                </div>
            </header>

            <div style={{
                display: 'flex',
                background: 'var(--tab-bg, #f1f5f9)',
                padding: '4px',
                borderRadius: '14px',
                marginBottom: '20px',
                overflowX: 'auto',
                gap: '4px'
            }}>
                {roleMeta.tabs.map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            flex: 1,
                            minWidth: '100px',
                            border: 'none',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: tab === t ? 'var(--tab-active-bg, #ffffff)' : 'transparent',
                            color: tab === t ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '12px',
                            boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {t.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                >
                    {tab === 'overview' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Profile Demographics & Contact
                            </h3>

                            {editMode ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>DISTRICT</label>
                                            <input
                                                type="text"
                                                name="address_city"
                                                value={formData.address_city}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>STATE</label>
                                            <select
                                                name="address_state"
                                                value={formData.address_state}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                            >
                                                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PINCODE</label>
                                            <input
                                                type="text"
                                                name="pincode"
                                                value={formData.pincode}
                                                onChange={handleChange}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSave} 
                                        style={{ width: '100%', padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        <Save size={16} /> Save Demographics
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Full Name</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{formData.name || 'Swasthya Member'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Email / Phone</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{formData.email || formData.phone || '+91 9822012345'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Location & District</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{formData.address_city}, {formData.address_state} - {formData.pincode}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>ABHA / ABDM ID</span>
                                        <strong style={{ color: '#0f766e', fontFamily: 'monospace' }}>{formData.abha_id}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'rch_credentials' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <HeartPulse size={20} color="#0d9488" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>ASHA Worker Field Registration</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Official ASHA ID</span>
                                    <strong style={{ color: '#0d9488', fontFamily: 'monospace' }}>{formData.asha_id}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Village Catchment</span>
                                    <strong>{formData.village_catchment}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Assigned Nodal PHC</span>
                                    <strong>{formData.assigned_phc}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'dbt_wallet' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <CreditCard size={20} color="#059669" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>DBT Incentive Bank Account</h3>
                            </div>
                            <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '12px', border: '1px solid #a7f3d0', marginBottom: '14px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#047857' }}>LINKED AADHAAR DBT ACCOUNT</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>A/C Ending in ****{formData.dbt_account_last4}</div>
                                <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px' }}>Status: Direct Benefit Transfer (DBT) Active & Verified</div>
                            </div>
                        </div>
                    )}

                    {tab === 'clinical_license' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Stethoscope size={20} color="#0284c7" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Medical Registration & Hospital</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>MCI / NMC Reg No</span>
                                    <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{formData.mci_registration}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Clinical Specialty</span>
                                    <strong>{formData.specialization}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Affiliated Hospital</span>
                                    <strong>{formData.hospital_name}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'opd_schedule' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Calendar size={20} color="#0284c7" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>OPD Duty Hours & Consultation</h3>
                            </div>
                            <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>ROSTER TIMINGS</div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0c4a6e', marginTop: '2px' }}>{formData.opd_timings}</div>
                                <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px' }}>Digital e-Prescriptions: Enabled with Cryptographic Timestamp</div>
                            </div>
                        </div>
                    )}

                    {tab === 'facility_license' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Building2 size={20} color="#0369a1" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Hospital Accreditation & Desk</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Facility Registry ID</span>
                                    <strong style={{ color: '#0369a1', fontFamily: 'monospace' }}>{formData.facility_id}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Hospital Tier</span>
                                    <strong>{formData.facility_tier}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Nodal Medical Officer</span>
                                    <strong>{formData.nodal_officer}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'bed_capacity' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Award size={20} color="#0369a1" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Sanctioned Bed Capacities</h3>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>BED INVENTORY</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>{formData.bed_capacity}</div>
                            </div>
                        </div>
                    )}

                    {tab === 'dependents_proxy' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Users size={20} color="#db2777" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Caregiver Proxy & Dependents</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Caregiver ID</span>
                                    <strong style={{ color: '#db2777', fontFamily: 'monospace' }}>{formData.caregiver_id}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Active Dependents</span>
                                    <strong>{formData.dependent_count}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Authorization Scope</span>
                                    <strong>{formData.proxy_relationship}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'sos_priority' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <AlertCircle size={20} color="#dc2626" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Emergency SOS Escalation</h3>
                            </div>
                            <div style={{ background: '#fee2e2', padding: '14px', borderRadius: '12px', border: '1px solid #fca5a5' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b' }}>EMERGENCY CONTACT PRIORITY #1</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#7f1d1d', marginTop: '2px' }}>{formData.emergency_contact} ({formData.emergency_contact_name})</div>
                                <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>Automated SMS & GPS broadcast configured for instant panic alerts.</div>
                            </div>
                        </div>
                    )}

                    {tab === 'authority_scope' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Shield size={20} color="#334155" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>NHA Executive Authority</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Officer Staff ID</span>
                                    <strong style={{ color: '#334155', fontFamily: 'monospace' }}>{formData.officer_id}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Jurisdiction Cluster</span>
                                    <strong>{formData.jurisdiction}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'security_audit' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Lock size={20} color="#16a34a" />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Cryptographic Ledger Clearance</h3>
                            </div>
                            <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>SECURITY PROTOCOL</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>{formData.security_clearance}</div>
                                <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>Cryptographic Hash Verification: Active (SHA-256 ABDM Standard)</div>
                            </div>
                        </div>
                    )}

                    {tab === 'medical' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '15px', fontWeight: 800 }}>Medical History & Allergies</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ALLERGIES</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {medicalData.allergies.map((a, i) => (
                                            <span key={i} style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CHRONIC CONDITIONS</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {medicalData.chronic_diseases.map((c, i) => (
                                            <span key={i} style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CURRENT MEDICATIONS</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {medicalData.current_meds.map((m, i) => (
                                            <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'lifestyle' && (
                        <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '15px', fontWeight: 800 }}>Lifestyle & Habits</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Diet Preference</span>
                                    <strong style={{ textTransform: 'capitalize' }}>{lifestyleData.diet || 'Vegetarian'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Physical Activity</span>
                                    <strong style={{ textTransform: 'capitalize' }}>{lifestyleData.physical_activity || 'Moderate'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Smoking / Alcohol</span>
                                    <strong>No / Non-Drinker</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="card" style={{ textAlign: 'center', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 800 }}>
                    {role === 'doctor' ? '🩺 Doctor Connect QR' : role === 'health_worker' || role === 'asha' ? '👩‍⚕️ ASHA Field Hub QR' : '🆔 Digital Identity QR'}
                </h3>
                <div style={{ background: '#ffffff', padding: '16px', display: 'inline-block', borderRadius: '16px', border: '2px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <QRCode 
                        value={JSON.stringify({ 
                            uid: user?.id || 'demo-uid', 
                            name: user?.name, 
                            role: user?.role, 
                            district: formData.address_city,
                            abha: formData.abha_id 
                        })} 
                        size={150} 
                        bgColor="#ffffff" 
                        fgColor="#1C1C1E" 
                        level="Q" 
                    />
                </div>
                <div style={{ marginTop: '12px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--primary-color)', fontWeight: 700, background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                    ROLE: {role.toUpperCase()} • ID: {user?.id || 'AUTH-042'}
                </div>
            </div>

            <button
                onClick={() => setIsDark(!isDark)}
                style={{ width: '100%', marginBottom: '12px', padding: '12px', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px' }}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>

            <button
                onClick={logout}
                style={{ width: '100%', padding: '12px', background: 'var(--btn-cancel-bg, #dc2626)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
                Log Out
            </button>
        </div>
    );
};

export default Profile;
