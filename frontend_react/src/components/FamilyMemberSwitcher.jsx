import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, User, Check, Plus, ChevronDown, 
    X, Shield, HeartPulse, Stethoscope, ArrowRight, UserCheck
} from 'lucide-react';

const FamilyMemberSwitcher = ({ compact = false, showBanner = true }) => {
    const { user, activeMember, switchActiveMember, familyMembers, fetchFamilyMembers } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchFamilyMembers();
    }, []);

    if (!user) return null;

    const selfName = user.name || user.full_name || (user.email ? user.email.split('@')[0] : 'Self');
    const isProxyActive = !!activeMember;
    const currentDisplayName = isProxyActive ? activeMember.name : selfName;
    const currentRelation = isProxyActive ? (activeMember.relation || 'Family Member') : 'Primary Account';

    return (
        <div style={{ position: 'relative', zIndex: 50 }}>
            {/* 1. Global Proxy Alert Banner (shown across the page when viewing a family member) */}
            {showBanner && isProxyActive && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                        color: 'white',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
                        fontSize: '12px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            flexShrink: 0
                        }}>
                            {activeMember.name?.charAt(0)?.toUpperCase() || 'F'}
                        </div>
                        <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            Managing Care for: <strong>{activeMember.name}</strong> ({currentRelation})
                        </div>
                    </div>

                    <button
                        onClick={() => switchActiveMember(null)}
                        style={{
                            background: 'rgba(255,255,255,0.95)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            flexShrink: 0,
                            marginLeft: '8px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                    >
                        Switch to Self
                    </button>
                </motion.div>
            )}

            {/* 2. Sleek Active Member Selector Pill Button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: compact ? '6px 10px' : '8px 14px',
                    borderRadius: '20px',
                    border: isProxyActive ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                    background: isProxyActive 
                        ? 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(2,132,199,0.08) 100%)' 
                        : '#ffffff',
                    boxShadow: isProxyActive ? '0 2px 10px rgba(13,148,136,0.15)' : '0 2px 6px rgba(15,23,42,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    maxWidth: '100%'
                }}
            >
                <div style={{
                    width: compact ? '22px' : '26px',
                    height: compact ? '22px' : '26px',
                    borderRadius: '50%',
                    background: isProxyActive ? '#0d9488' : '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: compact ? '10px' : '11px',
                    fontWeight: 800,
                    flexShrink: 0
                }}>
                    {isProxyActive ? activeMember.name?.charAt(0)?.toUpperCase() : <User size={14} />}
                </div>

                <div style={{ textAlign: 'left', lineHeight: 1.2, overflow: 'hidden' }}>
                    <div style={{ 
                        fontSize: compact ? '11.5px' : '12.5px', 
                        fontWeight: 800, 
                        color: isProxyActive ? '#0d9488' : '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '140px'
                    }}>
                        {currentDisplayName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                        {isProxyActive ? `${currentRelation} • Active` : 'Self'}
                    </div>
                </div>

                <ChevronDown size={14} color="#94a3b8" style={{ marginLeft: '2px', flexShrink: 0 }} />
            </button>

            {/* 3. Modal Dialog to Select / Switch Family Member */}
            <AnimatePresence>
                {isOpen && (
                    <div
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.65)',
                            backdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                            zIndex: 99999
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 12 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#ffffff',
                                borderRadius: '24px',
                                padding: '22px 20px',
                                width: '100%',
                                maxWidth: '400px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                maxHeight: '85vh',
                                overflowY: 'auto'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, rgba(13,148,136,0.12) 0%, rgba(2,132,199,0.12) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#0d9488'
                                    }}>
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                            Switch Family Profile
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                                            Manage records, book OPD & monitor vitals
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Profiles List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                                {/* Profile Card 1: Primary Account Holder (Self) */}
                                <div
                                    onClick={() => {
                                        switchActiveMember(null);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '16px',
                                        border: !isProxyActive ? '2px solid #0d9488' : '1px solid #e2e8f0',
                                        background: !isProxyActive ? '#f0fdfa' : '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '50%',
                                            background: '#0284c7',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800
                                        }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                                {selfName}
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                                Primary Account (Self)
                                            </div>
                                        </div>
                                    </div>
                                    {!isProxyActive && (
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: '#0d9488',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                {/* Connected Family Members */}
                                {familyMembers.map((member) => {
                                    const memId = member.caregiver_id || member.patient?.id || member.id;
                                    const memName = member.member_name || member.patient?.full_name || member.name || 'Family Member';
                                    const memRelation = member.relation || member.relationship_type || 'Family Member';
                                    const isSelected = isProxyActive && activeMember?.id === memId;

                                    return (
                                        <div
                                            key={memId}
                                            onClick={() => {
                                                switchActiveMember(member);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '16px',
                                                border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                                                background: isSelected ? '#f0fdfa' : '#f8fafc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '14px'
                                                }}>
                                                    {memName.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                                        {memName}
                                                    </div>
                                                    <div style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600 }}>
                                                        {memRelation} • Full Access
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: '#0d9488',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Family Member CTA */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/family');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '14px',
                                    border: '1.5px dashed #0d9488',
                                    background: '#f0fdfa',
                                    color: '#0d9488',
                                    fontSize: '13.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Plus size={16} />
                                <span>Connect New Family Member by Email</span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FamilyMemberSwitcher;
