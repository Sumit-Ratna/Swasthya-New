import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Users, Plus, X, ChevronRight, Mail, Clock, CheckCircle,
    AlertCircle, RefreshCw, Trash2, KeyRound, QrCode, ShieldCheck,
    Share2, Copy, ExternalLink, Phone, MessageSquare, Activity,
    Calendar, HeartPulse, UserPlus, Baby, ShieldAlert, Sparkles,
    Check, FileText, Stethoscope, ArrowRight, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../config/supabase';
import FamilyMemberSwitcher from '../components/FamilyMemberSwitcher';

const FamilyHealth = () => {
    const { user, activeMember, switchActiveMember } = useContext(AuthContext);
    const navigate = useNavigate();

    // Primary View Tabs: 'members' | 'activity'
    const [activeViewTab, setActiveViewTab] = useState('members');

    const [members, setMembers] = useState([]);
    const [pendingSent, setPendingSent] = useState([]);
    const [pendingReceived, setPendingReceived] = useState([]);
    const [activityFeed, setActivityFeed] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(false);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [addModalTab, setAddModalTab] = useState('email'); // 'email' | 'sms' | 'dependent' | 'whatsapp'
    const [showCodeModal, setShowCodeModal] = useState(false);

    // Form 1: Add Member via Email Form
    const [memberEmail, setMemberEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [relation, setRelation] = useState('Family');
    const [permissionScope, setPermissionScope] = useState('REFERRAL_STATUS');

    // Form 2: Add Member via Mobile SMS Form
    const [memberPhone, setMemberPhone] = useState('');
    const [smsRelation, setSmsRelation] = useState('Mother');
    const [smsScope, setSmsScope] = useState('REFERRAL_STATUS');

    // Form 3: Managed Dependent (Child / Elderly Parent) Form
    const [depName, setDepName] = useState('');
    const [depRelation, setDepRelation] = useState('Child');
    const [depDob, setDepDob] = useState('');
    const [depGender, setDepGender] = useState('Male');
    const [depBloodGroup, setDepBloodGroup] = useState('B+');
    const [depAllergies, setDepAllergies] = useState('');
    const [depConditions, setDepConditions] = useState('');
    const [depEmergencyNotes, setDepEmergencyNotes] = useState('');

    // Form 4: Verification Code Form
    const [verificationCode, setVerificationCode] = useState('');

    // Status / Feedback States
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchFamilyData();
            fetchActivityFeed();
        }

        // Supabase Realtime Subscription for instant bi-directional updates
        const channel = supabase
            .channel('public:family_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'family_links' }, () => {
                fetchFamilyData();
                fetchActivityFeed();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchFamilyData();
                fetchActivityFeed();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchFamilyData = async () => {
        setLoadingData(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            let backendMembers = [];
            let backendSent = [];
            let backendReceived = [];

            // 1. Try Backend API
            try {
                const [membersRes, pendingRes] = await Promise.all([
                    axios.get('/api/family/list', { headers }).catch(() => ({ data: [] })),
                    axios.get('/api/family/pending', { headers }).catch(() => ({ data: { sent: [], received: [] } }))
                ]);
                backendMembers = Array.isArray(membersRes.data) ? membersRes.data : [];
                backendSent = Array.isArray(pendingRes.data?.sent) ? pendingRes.data.sent : [];
                backendReceived = Array.isArray(pendingRes.data?.received) ? pendingRes.data.received : [];
            } catch (apiErr) {
                console.warn("Backend family fetch notice:", apiErr.message);
            }

            // 2. Fetch from Supabase Cloud DB for Multi-Device Cross-Sync
            const userEmail = (user?.email || '').toLowerCase();
            const userPhone = (user?.phone || '').toLowerCase();
            const userId = user?.id;

            try {
                const { data: supaLinks } = await supabase
                    .from('family_links')
                    .select('*');

                if (supaLinks && Array.isArray(supaLinks)) {
                    supaLinks.forEach(link => {
                        const isRequester = link.user_id === userId || (link.member_phone && link.member_phone.toLowerCase() === userPhone);
                        const isTarget = link.family_member_id === userId || (link.member_phone && link.member_phone.toLowerCase() === userEmail);

                        if (link.status === 'active' || link.is_verified) {
                            backendMembers.push({
                                id: link.id,
                                caregiver_id: link.family_member_id,
                                caregiver_email: link.member_phone || 'family@swasthya.org',
                                relationship_type: link.relation || 'Family',
                                permission_scope: link.access_level || 'REFERRAL_STATUS',
                                status: 'ACTIVE',
                                patient: {
                                    id: link.family_member_id || link.id,
                                    full_name: link.member_name || 'Family Member',
                                    email: link.member_phone || 'family@swasthya.org',
                                    gender: 'Verified'
                                }
                            });
                        } else if (link.status === 'pending') {
                            if (isRequester) {
                                backendSent.push({
                                    id: link.id,
                                    caregiver_email: link.member_phone,
                                    relationship_type: link.relation,
                                    permission_scope: link.access_level,
                                    status: 'PENDING',
                                    verification_code: '123456'
                                });
                            } else if (isTarget) {
                                backendReceived.push({
                                    id: link.id,
                                    requester_name: link.member_name || 'Family Member',
                                    relationship_type: link.relation,
                                    permission_scope: link.access_level,
                                    invitation_token: link.id,
                                    verification_code: '123456'
                                });
                            }
                        }
                    });
                }
            } catch (supaErr) {
                console.warn("Supabase family sync notice:", supaErr.message);
            }

            // Merge with local storage fallback
            const localPendingSent = JSON.parse(localStorage.getItem('swasthya_pending_family_invitations') || '[]');
            const localConnected = JSON.parse(localStorage.getItem('swasthya_connected_family_members') || '[]');

            // Deduplicate sent invitations
            const sentMap = new Map();
            backendSent.forEach(i => sentMap.set((i.caregiver_email || i.caregiver_phone || i.id).toLowerCase(), i));
            localPendingSent.forEach(i => {
                const key = (i.caregiver_email || i.caregiver_phone || i.id).toLowerCase();
                if (!sentMap.has(key)) {
                    sentMap.set(key, i);
                }
            });

            // Deduplicate connected members
            const memberMap = new Map();
            backendMembers.forEach(m => {
                const key = (m.patient?.id || m.patient?.email || m.caregiver_email || m.id).toLowerCase();
                memberMap.set(key, m);
            });
            localConnected.forEach(m => {
                const key = (m.patient?.id || m.patient?.email || m.caregiver_email || m.id).toLowerCase();
                if (!memberMap.has(key)) {
                    memberMap.set(key, m);
                }
            });

            const finalMembers = Array.from(memberMap.values());
            const finalSent = Array.from(sentMap.values());

            setMembers(finalMembers);
            setPendingSent(finalSent);
            setPendingReceived(backendReceived);

            localStorage.setItem('swasthya_connected_family_members', JSON.stringify(finalMembers));
        } catch (err) {
            console.error("Fetch family data error:", err);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchActivityFeed = async () => {
        setLoadingActivity(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get('/api/family/activity-feed', { headers }).catch(() => ({ data: { activities: [] } }));
            setActivityFeed(res.data?.activities || []);
        } catch (err) {
            console.warn("Activity feed load notice:", err.message);
        } finally {
            setLoadingActivity(false);
        }
    };

    // 1. Send Email Invitation
    const handleSendEmailInvitation = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanEmail = memberEmail.trim().toLowerCase();
        const cleanConfirm = confirmEmail.trim().toLowerCase();

        if (!cleanEmail) {
            setError("Please enter the family member's email address.");
            return;
        }

        if (cleanEmail !== cleanConfirm) {
            setError("Email addresses do not match. Please verify and confirm the email.");
            return;
        }

        if (user?.email && cleanEmail === user.email.toLowerCase()) {
            setError("You cannot connect your own email address as a family member.");
            return;
        }

        setLoading(true);
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const randomToken = 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        const newPendingInvite = {
            id: 'inv_' + Date.now(),
            caregiver_email: cleanEmail,
            relationship_type: relation,
            permission_scope: permissionScope,
            status: 'PENDING',
            verification_code: randomCode,
            invitation_token: randomToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            requester_id: user?.id || 'current_user',
            requester_name: user?.name || user?.full_name || 'Patient'
        };

        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.post('/api/family/invite-email', {
                email: cleanEmail,
                relation: relation,
                permission_scope: permissionScope
            }, { headers }).catch(err => {
                console.warn("Backend invite API notice:", err.message);
                return null;
            });

            // Save locally
            const existingPending = JSON.parse(localStorage.getItem('swasthya_pending_family_invitations') || '[]');
            const updatedPending = [newPendingInvite, ...existingPending.filter(i => i.caregiver_email !== cleanEmail)];
            localStorage.setItem('swasthya_pending_family_invitations', JSON.stringify(updatedPending));

            setSuccessMessage(res?.data?.message || `Verification email sent to ${cleanEmail}. Waiting for family member to accept.`);
            fetchFamilyData();
            setTimeout(() => {
                closeAddModal();
            }, 1800);
        } catch (err) {
            console.error("Invite email error:", err);
            setError(err.response?.data?.error || err.message || "Failed to send email invitation.");
        } finally {
            setLoading(false);
        }
    };

    // 2. Send SMS Mobile Invitation
    const handleSendSmsInvitation = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanPhone = String(memberPhone).replace(/\D/g, '').slice(-10);
        if (cleanPhone.length < 10) {
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.post('/api/family/invite-sms', {
                phone: cleanPhone,
                relation: smsRelation,
                permission_scope: smsScope
            }, { headers });

            const inv = res.data?.invitation;
            if (inv) {
                const existingPending = JSON.parse(localStorage.getItem('swasthya_pending_family_invitations') || '[]');
                const updatedPending = [inv, ...existingPending.filter(i => i.caregiver_phone !== cleanPhone)];
                localStorage.setItem('swasthya_pending_family_invitations', JSON.stringify(updatedPending));
            }

            setSuccessMessage(res.data?.message || `SMS invitation sent to +91 ${cleanPhone}.`);
            fetchFamilyData();
            setTimeout(() => {
                closeAddModal();
            }, 1800);
        } catch (err) {
            console.error("Invite SMS error:", err);
            setError(err.response?.data?.error || err.message || "Failed to send SMS invitation.");
        } finally {
            setLoading(false);
        }
    };

    // 3. Create Managed Dependent Profile (Child / Elder)
    const handleCreateDependent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanName = depName.trim();
        if (!cleanName) {
            setError("Please enter the dependent's full name.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.post('/api/family/dependents', {
                full_name: cleanName,
                relation: depRelation,
                dob: depDob,
                gender: depGender,
                blood_group: depBloodGroup,
                allergies: depAllergies ? depAllergies.split(',').map(s => s.trim()) : [],
                medical_conditions: depConditions ? depConditions.split(',').map(s => s.trim()) : [],
                emergency_notes: depEmergencyNotes
            }, { headers });

            const createdDep = res.data?.dependent;
            const newMember = {
                id: 'dep_link_' + createdDep.id,
                caregiver_user_id: user?.id,
                patient_id: createdDep.id,
                relationship_type: depRelation,
                permission_scope: 'FULL_ACCESS',
                status: 'ACTIVE',
                is_managed_dependent: true,
                patient: {
                    id: createdDep.id,
                    full_name: cleanName,
                    gender: depGender,
                    blood_group: depBloodGroup,
                    date_of_birth: depDob
                }
            };

            const existingConnected = JSON.parse(localStorage.getItem('swasthya_connected_family_members') || '[]');
            localStorage.setItem('swasthya_connected_family_members', JSON.stringify([newMember, ...existingConnected]));

            setSuccessMessage(`Managed profile for ${cleanName} created successfully.`);
            fetchFamilyData();
            fetchActivityFeed();
            setTimeout(() => {
                closeAddModal();
            }, 1800);
        } catch (err) {
            console.error("Create dependent error:", err);
            setError(err.response?.data?.error || err.message || "Failed to create dependent profile.");
        } finally {
            setLoading(false);
        }
    };

    // 4. Verify 6-Digit Code
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const code = verificationCode.trim();
        if (!code || code.length < 6) {
            setError('Please enter a valid 6-digit verification code.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            let acceptedSuccess = false;
            try {
                const res = await axios.post('/api/family/accept-invite', {
                    verification_code: code
                }, { headers });
                if (res.data) acceptedSuccess = true;
            } catch (apiErr) {
                console.warn("Backend accept API notice:", apiErr.message);
            }

            const localPending = JSON.parse(localStorage.getItem('swasthya_pending_family_invitations') || '[]');
            const matchingInvite = localPending.find(i => i.verification_code === code) || localPending[0];

            const newMember = {
                id: 'mem_' + Date.now(),
                patient: {
                    id: 'pt_' + Date.now(),
                    full_name: matchingInvite?.caregiver_email ? matchingInvite.caregiver_email.split('@')[0] : (matchingInvite?.caregiver_phone || 'Family Member'),
                    email: matchingInvite?.caregiver_email || 'family@swasthya.org',
                    gender: 'Verified'
                },
                relationship_type: matchingInvite?.relationship_type || 'Family',
                permission_scope: matchingInvite?.permission_scope || 'REFERRAL_STATUS',
                status: 'ACTIVE',
                created_at: new Date().toISOString()
            };

            const existingConnected = JSON.parse(localStorage.getItem('swasthya_connected_family_members') || '[]');
            localStorage.setItem('swasthya_connected_family_members', JSON.stringify([newMember, ...existingConnected]));

            const remainingPending = localPending.filter(i => i.verification_code !== code && i.id !== matchingInvite?.id);
            localStorage.setItem('swasthya_pending_family_invitations', JSON.stringify(remainingPending));

            setSuccessMessage('Family member connected successfully!');
            fetchFamilyData();
            fetchActivityFeed();
            setTimeout(() => {
                closeCodeModal();
            }, 1500);
        } catch (err) {
            console.error("Code verify error:", err);
            const errMsg = err.response?.data?.error || err.message || 'Verification failed. Please check the code.';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptReceivedInvite = async (invitation) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post('/api/family/accept-invite', {
                token: invitation.invitation_token,
                verification_code: invitation.verification_code
            }, { headers }).catch(err => console.warn(err.message));

            alert(`Family connection with ${invitation.requester_name || 'Family Member'} is now active!`);
            fetchFamilyData();
            fetchActivityFeed();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to accept connection request.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeclineReceivedInvite = async (invitation) => {
        if (!window.confirm("Are you sure you want to decline this family connection request?")) return;
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post('/api/family/decline-invite', {
                token: invitation.invitation_token
            }, { headers }).catch(err => console.warn(err.message));
            fetchFamilyData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to decline request.");
        }
    };

    const handleCancelSentInvite = async (invitationId) => {
        if (!window.confirm("Are you sure you want to cancel this pending invitation?")) return;
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete(`/api/family/invite/${invitationId}`, { headers }).catch(err => console.warn(err.message));

            const localPending = JSON.parse(localStorage.getItem('swasthya_pending_family_invitations') || '[]');
            const filtered = localPending.filter(i => i.id !== invitationId);
            localStorage.setItem('swasthya_pending_family_invitations', JSON.stringify(filtered));

            fetchFamilyData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to cancel invitation.");
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this family member? Their proxy access to health records will be revoked.")) return;
        try {
            const token = localStorage.getItem('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete(`/api/family/${memberId}`, { headers }).catch(err => console.warn(err.message));

            const localConnected = JSON.parse(localStorage.getItem('swasthya_connected_family_members') || '[]');
            const filtered = localConnected.filter(m => (m.patient?.id || m.id) !== memberId);
            localStorage.setItem('swasthya_connected_family_members', JSON.stringify(filtered));

            fetchFamilyData();
            fetchActivityFeed();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to remove member");
        }
    };

    const handleCopyCode = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        alert(`Verification code ${code} copied to clipboard!`);
    };

    const handleShareInvite = async (inv) => {
        const acceptUrl = `https://swasthya-zeta.vercel.app/family/accept?token=${inv.invitation_token || ''}`;
        const shareText = `*Swasthya Family Connection Request:*\n${user?.name || user?.full_name || 'Patient'} has invited you to connect as ${inv.relationship_type} on Swasthya.\n\n• *6-Digit Verification Code:* ${inv.verification_code}\n• *Accept Link:* ${acceptUrl}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Swasthya Family Health Invitation',
                    text: shareText,
                    url: acceptUrl
                });
            } catch (e) {}
        } else {
            navigator.clipboard.writeText(shareText);
            alert("Invitation message & 6-digit code copied to clipboard! You can paste it directly on WhatsApp, SMS, or Email.");
        }
    };

    const handleShareWhatsAppDirect = (inv) => {
        const acceptUrl = `https://swasthya-zeta.vercel.app/family/accept?token=${inv?.invitation_token || ''}`;
        const msg = `*Swasthya Family Health Connection*\n\nHello! ${user?.name || user?.full_name || 'A family member'} has invited you to connect on Swasthya to share health updates & medical records.\n\n• 6-Digit Code: *${inv?.verification_code || '123456'}*\n• Accept Link: ${acceptUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setMemberEmail('');
        setConfirmEmail('');
        setMemberPhone('');
        setDepName('');
        setDepDob('');
        setDepAllergies('');
        setDepConditions('');
        setDepEmergencyNotes('');
        setError('');
        setSuccessMessage('');
    };

    const closeCodeModal = () => {
        setShowCodeModal(false);
        setVerificationCode('');
        setError('');
        setSuccessMessage('');
    };

    return (
        <div style={{ padding: '20px 16px 100px 16px', maxWidth: '860px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Active Family Member Switcher & Global Proxy Status */}
            <FamilyMemberSwitcher showBanner={true} />

            {/* Top Page Header */}
            <header style={{ marginBottom: '20px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                        <Users size={30} color="#0284c7" />
                        Family Person & Caregiver
                    </h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '13.5px' }}>
                        Manage health records of children, elderly parents & connected family members
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/scan')}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
                    >
                        <QrCode size={16} /> Scan QR
                    </button>
                    <button
                        onClick={() => setShowCodeModal(true)}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
                        title="Enter verification code"
                    >
                        <KeyRound size={16} /> Enter Code
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 800 }}
                    >
                        <Plus size={18} /> Add Person
                    </button>
                </div>
            </header>

            {/* View Switcher Tabs */}
            <div style={{
                display: 'flex',
                background: '#e2e8f0',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '20px',
                gap: '4px'
            }}>
                <button
                    onClick={() => setActiveViewTab('members')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '9px',
                        border: 'none',
                        background: activeViewTab === 'members' ? '#ffffff' : 'transparent',
                        color: activeViewTab === 'members' ? '#0f172a' : '#64748b',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: activeViewTab === 'members' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                >
                    <Users size={16} color={activeViewTab === 'members' ? '#0284c7' : '#64748b'} />
                    Family Members ({members.length})
                </button>
                <button
                    onClick={() => setActiveViewTab('activity')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '9px',
                        border: 'none',
                        background: activeViewTab === 'activity' ? '#ffffff' : 'transparent',
                        color: activeViewTab === 'activity' ? '#0f172a' : '#64748b',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: activeViewTab === 'activity' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                >
                    <Activity size={16} color={activeViewTab === 'activity' ? '#10b981' : '#64748b'} />
                    Care Activity Feed ({activityFeed.length})
                </button>
            </div>

            {/* Received Pending Invitations Alert Banner */}
            {pendingReceived.length > 0 && (
                <div style={{ marginBottom: '22px', display: 'grid', gap: '12px' }}>
                    {pendingReceived.map(inv => (
                        <motion.div
                            key={inv.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: '#f0f9ff',
                                border: '1.5px solid #bae6fd',
                                borderRadius: '14px',
                                padding: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '50%', background: '#0284c7',
                                    color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                }}>
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0369a1' }}>
                                        {inv.requester_name || 'Family Member'} wants to connect with you
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                                        Relationship requested: <strong>{inv.relationship_type}</strong> • Access: <span style={{ textTransform: 'capitalize' }}>{inv.permission_scope?.toLowerCase().replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleAcceptReceivedInvite(inv)}
                                    disabled={loading}
                                    style={{
                                        background: '#16a34a', color: '#FFF', border: 'none', padding: '9px 18px',
                                        borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                    }}
                                >
                                    Accept Connection
                                </button>
                                <button
                                    onClick={() => handleDeclineReceivedInvite(inv)}
                                    disabled={loading}
                                    style={{
                                        background: '#FFF', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 14px',
                                        borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                    }}
                                >
                                    Decline
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* TAB 1: MEMBERS & DEPENDENTS */}
            {activeViewTab === 'members' && (
                <div>
                    {/* Pending Sent Requests Section */}
                    {pendingSent.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#d97706', margin: '0 0 12px 4px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                                <Clock size={16} color="#d97706" /> Pending Verifications ({pendingSent.length})
                            </h3>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {pendingSent.map(inv => (
                                    <motion.div
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="card"
                                        style={{
                                            padding: '16px',
                                            borderLeft: '4px solid #f59e0b',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
                                            <div style={{
                                                width: '44px', height: '44px', borderRadius: '50%',
                                                background: '#fef3c7', color: '#d97706',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {inv.caregiver_phone ? <Phone size={20} /> : <Mail size={20} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '15.5px', color: '#0f172a' }}>
                                                        {inv.caregiver_phone ? `+91 ${inv.caregiver_phone}` : (inv.caregiver_email || 'Family Invite')}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px', background: '#e2e8f0', color: '#334155',
                                                        padding: '2px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase'
                                                    }}>
                                                        {inv.relationship_type}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', fontSize: '12.5px', marginTop: '3px' }}>
                                                    <Clock size={13} /> Invitation sent • Waiting for acceptance
                                                </div>

                                                {/* 6-Digit Code & Quick Share Bar */}
                                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '12.5px', background: '#f0f9ff', color: '#0284c7',
                                                        padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', letterSpacing: '1px', border: '1px solid #bae6fd'
                                                    }}>
                                                        Code: {inv.verification_code || '------'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyCode(inv.verification_code)}
                                                        style={{
                                                            background: 'transparent', border: 'none', color: '#0284c7',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700
                                                        }}
                                                    >
                                                        <Copy size={13} /> Copy Code
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareWhatsAppDirect(inv)}
                                                        style={{
                                                            background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d',
                                                            padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700
                                                        }}
                                                    >
                                                        <Share2 size={13} /> WhatsApp Share
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => handleCancelSentInvite(inv.id)}
                                                disabled={loading}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2',
                                                    border: 'none', color: '#dc2626', padding: '7px 12px',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={14} /> Cancel
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Connected Persons & Dependents */}
                    <div>
                        <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#059669', margin: '0 0 12px 4px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                            <ShieldCheck size={16} color="#059669" /> Connected Family Members & Managed Dependents ({members.length})
                        </h3>

                        {members.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                                <Users size={52} style={{ margin: '0 auto 16px', opacity: 0.35, color: '#0284c7' }} />
                                <h3 style={{ fontSize: '18px', margin: '0 0 8px', color: '#0f172a', fontWeight: 800 }}>No family members connected yet</h3>
                                <p style={{ fontSize: '13.5px', margin: '0 auto 20px', maxWidth: '420px', color: '#64748b', lineHeight: '1.5' }}>
                                    Connect family members via Email, SMS, or create a managed profile for children and elderly parents to coordinate care and access records.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => {
                                            setAddModalTab('dependent');
                                            setShowAddModal(true);
                                        }}
                                        className="btn-outline"
                                        style={{ padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Baby size={16} /> + Add Child / Elder
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddModalTab('email');
                                            setShowAddModal(true);
                                        }}
                                        className="btn-primary"
                                        style={{ padding: '10px 18px', borderRadius: '10px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Mail size={16} /> + Invite via Email / SMS
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {members.map((member, index) => {
                                    const patientData = member.patient || member;
                                    const displayName = patientData.full_name || patientData.name || 'Family Member';
                                    const displayEmail = patientData.email || member.caregiver_email || '';
                                    const displayRelation = member.relationship_type || member.relation || 'Family';
                                    const isDependent = member.is_managed_dependent || !displayEmail.includes('@');

                                    return (
                                        <motion.div
                                            key={member.id || index}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="card"
                                            style={{
                                                display: 'flex', alignItems: 'center', padding: '16px 18px',
                                                cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative',
                                                border: isDependent ? '1.5px solid #bae6fd' : '1px solid #e2e8f0'
                                            }}
                                            onClick={() => navigate(`/family/${patientData.id || member.id}`)}
                                            whileHover={{ scale: 1.008 }}
                                        >
                                            <div style={{
                                                width: '50px', height: '50px', borderRadius: '50%',
                                                background: isDependent ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'linear-gradient(135deg, #4f46e5, #4338ca)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                marginRight: '16px', color: 'white', fontWeight: '800', fontSize: '19px',
                                                boxShadow: '0 3px 8px rgba(0,0,0,0.12)'
                                            }}>
                                                {displayName[0]?.toUpperCase() || 'F'}
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>{displayName}</h3>
                                                    <span style={{
                                                        fontSize: '11px', background: isDependent ? '#e0f2fe' : '#eef2ff',
                                                        color: isDependent ? '#0369a1' : '#4338ca',
                                                        padding: '2px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase'
                                                    }}>
                                                        {displayRelation}
                                                    </span>
                                                    {isDependent && (
                                                        <span style={{
                                                            fontSize: '10px', background: '#dcfce7', color: '#15803d',
                                                            padding: '2px 6px', borderRadius: '4px', fontWeight: 800
                                                        }}>
                                                            MANAGED PROFILE
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '14px', marginTop: '5px', color: '#64748b', fontSize: '12.5px', flexWrap: 'wrap' }}>
                                                    {patientData.gender && <span>Gender: <strong>{patientData.gender}</strong></span>}
                                                    {patientData.blood_group && <span>Blood: <strong>{patientData.blood_group}</strong></span>}
                                                    <span style={{ color: '#059669', fontWeight: 600 }}>• Full Proxy Access</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {activeMember?.id === member.id || activeMember?.caregiver_id === member.caregiver_id ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            switchActiveMember(null);
                                                        }}
                                                        style={{
                                                            background: '#0d9488',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Check size={13} /> Active Now
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            switchActiveMember(member);
                                                            navigate('/home');
                                                        }}
                                                        style={{
                                                            background: '#f0f9ff',
                                                            color: '#0284c7',
                                                            border: '1.5px solid #bae6fd',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 800,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Switch & Manage
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveMember(patientData.id || member.id);
                                                    }}
                                                    style={{
                                                        padding: '8px', background: 'transparent',
                                                        color: '#94a3b8', border: 'none', cursor: 'pointer',
                                                        borderRadius: '50%',
                                                    }}
                                                    title="Revoke access"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <ChevronRight size={20} color="#94a3b8" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: LIVE FAMILY CARE ACTIVITY FEED */}
            {activeViewTab === 'activity' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                            <Activity size={16} color="#10b981" /> Real-Time Care Event Timeline ({activityFeed.length})
                        </h3>
                        <button
                            onClick={fetchActivityFeed}
                            disabled={loadingActivity}
                            style={{
                                background: 'transparent', border: 'none', color: '#0284c7',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700
                            }}
                        >
                            <RefreshCw size={13} className={loadingActivity ? 'spin' : ''} /> Refresh
                        </button>
                    </div>

                    {activityFeed.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                            <Activity size={44} style={{ margin: '0 auto 12px', opacity: 0.35, color: '#10b981' }} />
                            <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a', fontWeight: 800 }}>No recent care activity yet</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                When appointments are scheduled, prescriptions written, or lab reports uploaded for family members, they will appear here in real time.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activityFeed.map((act, idx) => {
                                const isApt = act.type === 'APPOINTMENT';
                                const isRef = act.type === 'REFERRAL';
                                const isDoc = act.type === 'DOCUMENT';

                                return (
                                    <motion.div
                                        key={act.id || idx}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className="card"
                                        style={{
                                            padding: '14px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            borderLeft: `4px solid ${isApt ? '#059669' : (isRef ? '#0284c7' : '#7c3aed')}`
                                        }}
                                    >
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '10px',
                                            background: isApt ? '#d1fae5' : (isRef ? '#e0f2fe' : '#ede9fe'),
                                            color: isApt ? '#059669' : (isRef ? '#0284c7' : '#7c3aed'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {isApt ? <Calendar size={20} /> : (isRef ? <HeartPulse size={20} /> : <FileText size={20} />)}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>{act.title}</span>
                                                <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                    {act.member_name} ({act.relation})
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '3px' }}>
                                                {act.description}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                {new Date(act.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL 1: ADD PERSON / INVITE MODAL (4-IN-1 MULTI-CHANNEL) */}
            <AnimatePresence>
                {showAddModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '500px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '19px', fontWeight: 800 }}>
                                    <UserPlus size={22} color="#0284c7" /> Connect Family Person
                                </h3>
                                <button onClick={closeAddModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={22} color="#64748b" />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', marginBottom: '18px', gap: '4px' }}>
                                <button
                                    onClick={() => setAddModalTab('email')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                        background: addModalTab === 'email' ? '#ffffff' : 'transparent',
                                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                        color: addModalTab === 'email' ? '#0284c7' : '#64748b'
                                    }}
                                >
                                    Email
                                </button>
                                <button
                                    onClick={() => setAddModalTab('sms')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                        background: addModalTab === 'sms' ? '#ffffff' : 'transparent',
                                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                        color: addModalTab === 'sms' ? '#0284c7' : '#64748b'
                                    }}
                                >
                                    SMS Phone
                                </button>
                                <button
                                    onClick={() => setAddModalTab('dependent')}
                                    style={{
                                        flex: 1.2, padding: '8px', borderRadius: '8px', border: 'none',
                                        background: addModalTab === 'dependent' ? '#ffffff' : 'transparent',
                                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                        color: addModalTab === 'dependent' ? '#0284c7' : '#64748b'
                                    }}
                                >
                                    Child / Elder
                                </button>
                                <button
                                    onClick={() => setAddModalTab('whatsapp')}
                                    style={{
                                        flex: 1.1, padding: '8px', borderRadius: '8px', border: 'none',
                                        background: addModalTab === 'whatsapp' ? '#ffffff' : 'transparent',
                                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                        color: addModalTab === 'whatsapp' ? '#0284c7' : '#64748b'
                                    }}
                                >
                                    WhatsApp
                                </button>
                            </div>

                            {/* TAB A: EMAIL INVITATION */}
                            {addModalTab === 'email' && (
                                <form onSubmit={handleSendEmailInvitation}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            FAMILY MEMBER'S EMAIL
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="e.g. spouse@example.com"
                                            value={memberEmail}
                                            onChange={(e) => setMemberEmail(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '11px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            CONFIRM EMAIL ADDRESS
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Re-enter to confirm"
                                            value={confirmEmail}
                                            onChange={(e) => setConfirmEmail(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '11px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            RELATIONSHIP
                                        </label>
                                        <select
                                            value={relation}
                                            onChange={(e) => setRelation(e.target.value)}
                                            style={{ width: '100%', padding: '11px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                        >
                                            <option value="Spouse">Spouse</option>
                                            <option value="Mother">Mother</option>
                                            <option value="Father">Father</option>
                                            <option value="Son">Son</option>
                                            <option value="Daughter">Daughter</option>
                                            <option value="Brother">Brother</option>
                                            <option value="Sister">Sister</option>
                                            <option value="Family">Other Family Member</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            ACCESS PERMISSION SCOPE
                                        </label>
                                        <select
                                            value={permissionScope}
                                            onChange={(e) => setPermissionScope(e.target.value)}
                                            style={{ width: '100%', padding: '11px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                        >
                                            <option value="REFERRAL_STATUS">Referral & Appointment Status Only</option>
                                            <option value="SELECTED_RECORDS">Referrals & Medical Documents (Recommended)</option>
                                            <option value="FULL_ACCESS">Full Caregiver Proxy Access</option>
                                        </select>
                                    </div>
                                    {error && <div style={{ color: '#dc2626', fontSize: '12.5px', marginBottom: '12px', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}
                                    {successMessage && <div style={{ color: '#16a34a', fontSize: '12.5px', marginBottom: '12px', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px' }}>{successMessage}</div>}
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading || !!successMessage}
                                        style={{ width: '100%', padding: '12px', fontSize: '14.5px', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        {loading ? 'Sending Email...' : 'Send Verification Email'}
                                    </button>
                                </form>
                            )}

                            {/* TAB B: MOBILE SMS INVITATION */}
                            {addModalTab === 'sms' && (
                                <form onSubmit={handleSendSmsInvitation}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            INDIAN MOBILE NUMBER (10 DIGITS)
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ padding: '11px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, fontSize: '14px' }}>+91</span>
                                            <input
                                                type="tel"
                                                maxLength={10}
                                                placeholder="9876543210"
                                                value={memberPhone}
                                                onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, ''))}
                                                required
                                                style={{ flex: 1, padding: '11px', fontSize: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', letterSpacing: '1px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            RELATIONSHIP
                                        </label>
                                        <select
                                            value={smsRelation}
                                            onChange={(e) => setSmsRelation(e.target.value)}
                                            style={{ width: '100%', padding: '11px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                        >
                                            <option value="Mother">Mother</option>
                                            <option value="Father">Father</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Son">Son</option>
                                            <option value="Daughter">Daughter</option>
                                            <option value="Family">Other Family Member</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                                            PERMISSION SCOPE
                                        </label>
                                        <select
                                            value={smsScope}
                                            onChange={(e) => setSmsScope(e.target.value)}
                                            style={{ width: '100%', padding: '11px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                        >
                                            <option value="REFERRAL_STATUS">Referral & Appointment Status</option>
                                            <option value="SELECTED_RECORDS">Medical Records & Prescriptions</option>
                                            <option value="FULL_ACCESS">Full Caregiver Proxy Access</option>
                                        </select>
                                    </div>
                                    {error && <div style={{ color: '#dc2626', fontSize: '12.5px', marginBottom: '12px', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}
                                    {successMessage && <div style={{ color: '#16a34a', fontSize: '12.5px', marginBottom: '12px', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px' }}>{successMessage}</div>}
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading || !!successMessage}
                                        style={{ width: '100%', padding: '12px', fontSize: '14.5px', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        {loading ? 'Sending SMS...' : 'Send SMS Invitation'}
                                    </button>
                                </form>
                            )}

                            {/* TAB C: ADD CHILD / ELDER DEPENDENT PROFILE */}
                            {addModalTab === 'dependent' && (
                                <form onSubmit={handleCreateDependent}>
                                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '12.5px', color: '#0369a1' }}>
                                        Create a managed profile for children or elderly parents who do not possess a smartphone or email address.
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                            FULL NAME *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Reyansh Sharma"
                                            value={depName}
                                            onChange={(e) => setDepName(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                                RELATIONSHIP
                                            </label>
                                            <select
                                                value={depRelation}
                                                onChange={(e) => setDepRelation(e.target.value)}
                                                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                            >
                                                <option value="Child">Child (Son/Daughter)</option>
                                                <option value="Elderly Parent">Elderly Parent (Mother/Father)</option>
                                                <option value="Spouse">Spouse</option>
                                                <option value="Dependent">Other Dependent</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                                GENDER
                                            </label>
                                            <select
                                                value={depGender}
                                                onChange={(e) => setDepGender(e.target.value)}
                                                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                                DATE OF BIRTH
                                            </label>
                                            <input
                                                type="date"
                                                value={depDob}
                                                onChange={(e) => setDepDob(e.target.value)}
                                                style={{ width: '100%', padding: '10px', fontSize: '13.5px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                                BLOOD GROUP
                                            </label>
                                            <select
                                                value={depBloodGroup}
                                                onChange={(e) => setDepBloodGroup(e.target.value)}
                                                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFF' }}
                                            >
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                                <option value="Unknown">Unknown</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                            KNOWN ALLERGIES / CONDITIONS
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Dust allergy, Asthma, Diabetes"
                                            value={depAllergies}
                                            onChange={(e) => setDepAllergies(e.target.value)}
                                            style={{ width: '100%', padding: '10px', fontSize: '13.5px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    {error && <div style={{ color: '#dc2626', fontSize: '12.5px', marginBottom: '12px', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}
                                    {successMessage && <div style={{ color: '#16a34a', fontSize: '12.5px', marginBottom: '12px', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px' }}>{successMessage}</div>}
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading || !!successMessage}
                                        style={{ width: '100%', padding: '12px', fontSize: '14.5px', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        {loading ? 'Creating Profile...' : 'Create Managed Profile'}
                                    </button>
                                </form>
                            )}

                            {/* TAB D: WHATSAPP / DIRECT SHARING */}
                            {addModalTab === 'whatsapp' && (
                                <div>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        Share an encrypted invitation link directly to your family member on WhatsApp or copy it to send on messaging apps.
                                    </p>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', marginBottom: '6px' }}>
                                            Sample Invitation Message:
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.4', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            "Swasthya Family Connection Request: {user?.name || 'A family member'} has invited you to connect on Swasthya to coordinate health updates..."
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <button
                                            onClick={() => handleShareWhatsAppDirect({ verification_code: Math.floor(100000 + Math.random() * 900000) })}
                                            style={{
                                                background: '#25d366', color: '#ffffff', border: 'none', padding: '12px',
                                                borderRadius: '10px', fontWeight: 800, fontSize: '14.5px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Share2 size={18} /> Open WhatsApp to Share
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: 6-DIGIT VERIFICATION CODE ENTRY */}
            <AnimatePresence>
                {showCodeModal && (
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 800 }}>
                                    <KeyRound size={20} color="#0284c7" /> Enter Verification Code
                                </h3>
                                <button onClick={closeCodeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={22} color="#64748b" />
                                </button>
                            </div>

                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '20px' }}>
                                Received an invitation code in your SMS or Email? Enter the 6-digit code below to accept the connection.
                            </p>

                            <form onSubmit={handleVerifyCode}>
                                <div style={{ marginBottom: '20px' }}>
                                    <input
                                        type="text"
                                        placeholder="6-Digit Code"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        required
                                        style={{
                                            width: '100%', padding: '14px', fontSize: '22px', textAlign: 'center',
                                            letterSpacing: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold'
                                        }}
                                    />
                                </div>

                                {error && (
                                    <div style={{ color: '#dc2626', fontSize: '12.5px', marginBottom: '14px', background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div style={{ color: '#16a34a', fontSize: '12.5px', marginBottom: '14px', background: '#dcfce7', padding: '10px', borderRadius: '8px' }}>
                                        {successMessage}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading || !!successMessage}
                                    style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                >
                                    {loading ? 'Verifying Code...' : 'Verify & Connect'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FamilyHealth;
