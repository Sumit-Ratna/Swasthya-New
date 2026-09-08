import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, ShieldCheck, Download, Share2, Lock, ChevronRight } from 'lucide-react';
import { TERMS_VERSION, TERMS_LAST_UPDATED, TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from '../data/termsContent';

const TermsAndConditions = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '24px 16px 80px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Back / Navigation Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                    >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            background: '#f0fdfa',
                            border: '1px solid #ccfbf1',
                            color: '#0f766e',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '20px'
                        }}>
                            Version {TERMS_VERSION}
                        </span>
                    </div>
                </div>

                {/* Main Document Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header Banner */}
                    <div style={{
                        padding: '24px 20px',
                        background: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
                        color: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FileText size={24} />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.3px' }}>
                                    Swasthya — Terms & Conditions
                                </h1>
                                <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                                    Medical Data Consent & Platform Usage Agreement
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px', opacity: 0.85, marginTop: '12px' }}>
                            <span><strong>Last Updated:</strong> {TERMS_LAST_UPDATED}</span>
                            <span>•</span>
                            <span><strong>Effective From:</strong> {TERMS_EFFECTIVE_DATE}</span>
                        </div>
                    </div>

                    {/* Summary Callout Box */}
                    <div style={{ padding: '20px' }}>
                        <div style={{
                            background: '#f0fdfa',
                            border: '1px solid #ccfbf1',
                            borderRadius: '16px',
                            padding: '14px',
                            marginBottom: '24px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <ShieldCheck size={24} color="#0d9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '12.5px', color: '#0f766e', lineHeight: 1.5 }}>
                                <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
                                    Patient Privacy & Consent Guarantee
                                </strong>
                                Welcome to <strong>Swasthya</strong>, an AI-assisted healthcare coordination and closed-loop referral platform designed to connect patients, health workers, doctors, and healthcare facilities. Your health records are protected under role-based authorization and explicit consent controls.
                            </div>
                        </div>

                        {/* All 16 Structured Sections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {TERMS_SECTIONS.map((section) => (
                                <div
                                    key={section.id}
                                    style={{
                                        paddingBottom: '20px',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}
                                >
                                    <h3 style={{
                                        fontSize: '14.5px',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        margin: '0 0 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{
                                            background: '#0d9488',
                                            color: 'white',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: 800
                                        }}>
                                            {section.number}
                                        </span>
                                        <span>{section.title}</span>
                                    </h3>
                                    <div style={{
                                        fontSize: '13px',
                                        color: '#334155',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-line',
                                        paddingLeft: '32px'
                                    }}>
                                        {section.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Acceptance Return Action */}
                        <div style={{
                            marginTop: '24px',
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            textAlign: 'center'
                        }}>
                            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
                                By registering or accessing Swasthya, you confirm adherence to these Terms & Conditions.
                            </p>
                            <button
                                onClick={() => navigate(-1)}
                                style={{
                                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                                }}
                            >
                                Return to Previous Screen
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
