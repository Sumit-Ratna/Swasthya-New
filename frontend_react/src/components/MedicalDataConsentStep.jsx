import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle, 
    Share2, Stethoscope, Pill, ChevronRight, X, ExternalLink,
    Building2, Users, ArrowRight, ArrowLeft, HeartPulse, Check
} from 'lucide-react';
import { TERMS_VERSION, TERMS_LAST_UPDATED, TERMS_SECTIONS } from '../data/termsContent';

const MedicalDataConsentStep = ({ 
    patientName = '', 
    onConsentAccepted, 
    onBack, 
    isSubmitting = false 
}) => {
    // 3 Independent Consents State
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [healthConsent, setHealthConsent] = useState(false);
    const [prescriptionConsent, setPrescriptionConsent] = useState(false);

    // Modal view for Full Terms & Conditions
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState(null);

    const allConsentsGranted = termsAccepted && healthConsent && prescriptionConsent;

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!allConsentsGranted || isSubmitting) return;

        const consentPayload = {
            consent_version: TERMS_VERSION,
            terms_accepted: true,
            health_data_consent: true,
            prescription_sharing_consent: true,
            consent_status: 'GRANTED',
            consented_at: new Date().toISOString()
        };

        if (onConsentAccepted) {
            onConsentAccepted(consentPayload);
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '580px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Header / Identity Banner */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 20px rgba(13, 148, 136, 0.25)'
                }}>
                    <ShieldCheck size={28} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                    Your Health Data, Your Consent
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {patientName ? `Namaste ${patientName}, ` : ''}Swasthya protects your medical privacy while seamlessly coordinating your healthcare journey.
                </p>
            </div>

            {/* Purpose & Care Coordination Explainer Cards */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px',
                marginBottom: '16px'
            }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                    How Swasthya Uses Your Health Information:
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '9px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <Share2 size={16} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <strong style={{ fontSize: '12px', color: '#1e293b', display: 'block' }}>Closed-Loop Referrals</strong>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Coordinate PHC, CHC & Civil Hospital admissions</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '9px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <Stethoscope size={16} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <strong style={{ fontSize: '12px', color: '#1e293b', display: 'block' }}>Doctor Consultations</strong>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Provide symptom & vitals context to doctors</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '9px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <Pill size={16} color="#e11d48" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <strong style={{ fontSize: '12px', color: '#1e293b', display: 'block' }}>Prescriptions & Meds</strong>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Securely store & share digital prescriptions</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '9px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <HeartPulse size={16} color="#7c3aed" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <strong style={{ fontSize: '12px', color: '#1e293b', display: 'block' }}>Follow-ups & Vitals</strong>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Reminders and longitudinal recovery tracking</span>
                        </div>
                    </div>
                </div>

                {/* Authorized Access Scope Note */}
                <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    background: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#0f766e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Lock size={13} style={{ flexShrink: 0 }} />
                    <span>Access is strictly authorized for health workers, assigned doctors, and receiving facilities. Your medical records are never made public.</span>
                </div>
            </div>

            {/* Read Full Terms & Conditions Link Button */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#0284c7" />
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Swasthya Legal Terms & Privacy Policy</div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Version {TERMS_VERSION} • Full 16-Section Legal Charter</div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    style={{
                        background: '#f0f9ff',
                        color: '#0284c7',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <span>Read Full Terms</span>
                    <ExternalLink size={12} />
                </button>
            </div>

            {/* 3 SEPARATELY IDENTIFIABLE & INDEPENDENT CONSENT ITEMS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                
                {/* CONSENT 1: Terms & Conditions */}
                <label 
                    onClick={() => setTermsAccepted(v => !v)}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: termsAccepted ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                        background: termsAccepted ? '#f0fdfa' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: termsAccepted ? '0 2px 8px rgba(13, 148, 136, 0.08)' : 'none'
                    }}
                >
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: termsAccepted ? '2px solid #0d9488' : '2px solid #cbd5e1',
                        background: termsAccepted ? '#0d9488' : '#ffffff',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'all 0.15s ease'
                    }}>
                        {termsAccepted && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.45 }}>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px', fontWeight: 800 }}>
                            1. Swasthya Terms & Conditions
                        </strong>
                        I have read, understood, and agree to the <strong>Swasthya Terms & Conditions</strong>, platform operation rules, and AI decision-support limitations.
                    </div>
                </label>

                {/* CONSENT 2: General Health Information Processing */}
                <label 
                    onClick={() => setHealthConsent(v => !v)}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: healthConsent ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                        background: healthConsent ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: healthConsent ? '0 2px 8px rgba(2, 132, 199, 0.08)' : 'none'
                    }}
                >
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: healthConsent ? '2px solid #0284c7' : '2px solid #cbd5e1',
                        background: healthConsent ? '#0284c7' : '#ffffff',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'all 0.15s ease'
                    }}>
                        {healthConsent && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.45 }}>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px', fontWeight: 800 }}>
                            2. Healthcare Data Processing & Referral Consent
                        </strong>
                        I consent to the collection, secure storage, clinical processing, and authorized sharing of my health information with authorized health workers, doctors, and healthcare facilities for healthcare purposes.
                    </div>
                </label>

                {/* CONSENT 3: Explicit Prescription & Medical Document Sharing Consent */}
                <label 
                    onClick={() => setPrescriptionConsent(v => !v)}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: prescriptionConsent ? '1.5px solid #e11d48' : '1px solid #fecaca',
                        background: prescriptionConsent ? '#fff1f2' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: prescriptionConsent ? '0 2px 8px rgba(225, 29, 72, 0.08)' : 'none'
                    }}
                >
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: prescriptionConsent ? '2px solid #e11d48' : '2px solid #cbd5e1',
                        background: prescriptionConsent ? '#e11d48' : '#ffffff',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'all 0.15s ease'
                    }}>
                        {prescriptionConsent && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.45 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                            <strong style={{ color: '#9f1239', fontWeight: 800 }}>
                                3. Prescription & Medical Document Sharing Consent
                            </strong>
                            <span style={{ fontSize: '10px', background: '#ffe4e6', color: '#e11d48', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                Explicit
                            </span>
                        </div>
                        <span style={{ display: 'block', marginBottom: '4px' }}>
                            I expressly consent to uploading, storing, processing, and sharing my prescriptions and relevant medical documents with authorized healthcare professionals and healthcare facilities involved in my care, referral, consultation, diagnosis, treatment, and follow-up.
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', display: 'block' }}>
                            *I acknowledge that authorized sharing for my care journey constitutes an authorized medical use and not an unauthorized disclosure of private information.
                        </span>
                    </div>
                </label>
            </div>

            {/* Action Buttons: AGREE & CONTINUE */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isSubmitting}
                        style={{
                            padding: '12px 16px',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <ArrowLeft size={16} />
                        <span>Edit Info</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allConsentsGranted || isSubmitting}
                    style={{
                        flex: 1,
                        padding: '13px 18px',
                        background: allConsentsGranted 
                            ? 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)' 
                            : '#e2e8f0',
                        color: allConsentsGranted ? '#ffffff' : '#94a3b8',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: allConsentsGranted && !isSubmitting ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: allConsentsGranted ? '0 4px 16px rgba(13, 148, 136, 0.35)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isSubmitting ? (
                        <span>Recording Versioned Consent...</span>
                    ) : (
                        <>
                            <span>{allConsentsGranted ? 'AGREE & CONTINUE TO SWASTHYA' : 'Accept All 3 Consents to Continue'}</span>
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </div>

            {/* FULL TERMS & CONDITIONS SCROLLABLE MODAL */}
            <AnimatePresence>
                {showTermsModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 12000
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                background: '#ffffff',
                                borderRadius: '24px',
                                width: '100%',
                                maxWidth: '640px',
                                maxHeight: '88vh',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FileText size={20} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                                            Swasthya Terms & Conditions
                                        </h3>
                                        <span style={{ fontSize: '11px', opacity: 0.9 }}>
                                            Version {TERMS_VERSION} • Effective {TERMS_EFFECTIVE_DATE}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTermsModal(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
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
                            </div>

                            {/* Modal Scrollable Content */}
                            <div style={{
                                padding: '20px',
                                overflowY: 'auto',
                                flex: 1,
                                fontSize: '12.5px',
                                color: '#334155',
                                lineHeight: 1.6
                            }}>
                                <div style={{
                                    background: '#f0fdfa',
                                    border: '1px solid #ccfbf1',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    fontSize: '12px',
                                    color: '#0f766e'
                                }}>
                                    <strong>Welcome to Swasthya</strong>, an AI-assisted healthcare coordination and closed-loop referral platform designed to connect patients, health workers, doctors, and healthcare facilities for referrals, consultations, diagnostics, treatment, and follow-up.
                                </div>

                                {TERMS_SECTIONS.map((section) => (
                                    <div 
                                        key={section.id} 
                                        id={`section-${section.id}`}
                                        style={{ 
                                            marginBottom: '20px', 
                                            paddingBottom: '16px', 
                                            borderBottom: '1px solid #f1f5f9' 
                                        }}
                                    >
                                        <h4 style={{ 
                                            fontSize: '13.5px', 
                                            fontWeight: 800, 
                                            color: '#0f172a', 
                                            margin: '0 0 8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{ 
                                                background: '#0d9488', 
                                                color: 'white', 
                                                width: '22px', 
                                                height: '22px', 
                                                borderRadius: '6px', 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                fontSize: '11px' 
                                            }}>
                                                {section.number}
                                            </span>
                                            <span>{section.title}</span>
                                        </h4>
                                        <div style={{ whiteSpace: 'pre-line', paddingLeft: '28px' }}>
                                            {section.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '12px 20px',
                                background: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    Swasthya Healthcare Charter • v{TERMS_VERSION}
                                </span>
                                <button
                                    onClick={() => {
                                        setTermsAccepted(true);
                                        setShowTermsModal(false);
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Check size={14} />
                                    <span>Accept Terms & Return</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MedicalDataConsentStep;
