import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle, 
    X, ChevronDown, ChevronUp, Eye, HeartPulse, Sparkles, UserCheck 
} from 'lucide-react';

export const CONSENT_VERSION = "medical-history-v1";
export const CONSENT_PURPOSE = "MEDICAL_HISTORY_AND_PRESCRIPTION_STORAGE";

const PatientConsentModal = ({ 
    isOpen, 
    onClose, 
    onConsentConfirmed, 
    recordSummary = null,
    isProcessing = false 
}) => {
    // Checkbox MUST start unchecked
    const [isConsentChecked, setIsConsentChecked] = useState(false);
    const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!isConsentChecked || isProcessing) return;
        
        const consentData = {
            consent_version: CONSENT_VERSION,
            consent_purpose: CONSENT_PURPOSE,
            consent_given: true,
            consented_at: new Date().toISOString()
        };
        
        onConsentConfirmed(consentData);
    };

    const handleCancel = () => {
        setIsConsentChecked(false);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-6 max-h-[90vh] flex flex-col"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="consent-title"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/80">
                        <div className="flex items-center space-x-2 text-emerald-700">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                                Patient Health Data Consent &bull; {CONSENT_VERSION}
                            </span>
                        </div>
                        <button 
                            type="button"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                            aria-label="Close dialog"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-5 text-gray-700 text-sm">
                        
                        {/* MANDATORY PROMINENT FIRST LINE */}
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                            <h2 
                                id="consent-title"
                                className="text-lg md:text-xl font-bold text-gray-950 leading-snug tracking-tight"
                            >
                                We will store your medical prescription and health record securely.
                            </h2>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                Please review this notice to understand how your medical information is stored, accessed, and managed before proceeding.
                            </p>
                        </div>

                        {/* Optional Record Preview Box */}
                        {recordSummary && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs space-y-1">
                                <span className="font-semibold text-gray-900 block">Record to be persisted:</span>
                                <div className="text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                                    {recordSummary.title && <span><strong>Title:</strong> {recordSummary.title}</span>}
                                    {recordSummary.category && <span><strong>Category:</strong> {recordSummary.category}</span>}
                                    {recordSummary.doctor_name && <span><strong>Doctor:</strong> {recordSummary.doctor_name}</span>}
                                    {recordSummary.facility_name && <span><strong>Facility:</strong> {recordSummary.facility_name}</span>}
                                </div>
                            </div>
                        )}

                        {/* Plain Language Explanations */}
                        <div className="space-y-4 text-xs md:text-sm">
                            
                            {/* 1. What is stored */}
                            <div className="space-y-1.5">
                                <h3 className="font-semibold text-gray-900 flex items-center space-x-1.5">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    <span>1. What information will be stored</span>
                                </h3>
                                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                                    <li>Prescription details, medications, dosages, and prescribing clinician information.</li>
                                    <li>Medical diagnoses, consultation notes, treatment plans, and visit summaries.</li>
                                    <li>Confirmed hospital appointment history and referral records.</li>
                                    <li>Uploaded prescription files, lab report documents, or medical images.</li>
                                    <li>Relevant recorded vital signs (e.g., Blood Pressure, Blood Sugar, Weight).</li>
                                </ul>
                            </div>

                            {/* 2. Why it is stored */}
                            <div className="space-y-1.5">
                                <h3 className="font-semibold text-gray-900 flex items-center space-x-1.5">
                                    <HeartPulse className="w-4 h-4 text-emerald-600" />
                                    <span>2. Why it is being stored</span>
                                </h3>
                                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                                    <li>To maintain your personal, longitudinal digital medical history in one place.</li>
                                    <li>To allow you to retrieve and reference past medical records whenever needed.</li>
                                    <li>To support continuity of care across medical visits and hospital consultations.</li>
                                    <li>To associate prescriptions and confirmed visits with your authenticated account.</li>
                                </ul>
                            </div>

                            {/* 3. How it will be used */}
                            <div className="space-y-1.5">
                                <h3 className="font-semibold text-gray-900 flex items-center space-x-1.5">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    <span>3. How it will be used</span>
                                </h3>
                                <p className="text-gray-600 pl-5">
                                    Your information is used solely for the healthcare, medical tracking, and continuity-of-care purposes explicitly described in this notice. It is not repurposed for unconsented external processing.
                                </p>
                            </div>

                            {/* 4. Who can access it */}
                            <div className="space-y-1.5">
                                <h3 className="font-semibold text-gray-900 flex items-center space-x-1.5">
                                    <UserCheck className="w-4 h-4 text-emerald-600" />
                                    <span>4. Who can access it</span>
                                </h3>
                                <p className="text-gray-600 pl-5 leading-relaxed">
                                    Your records are accessible to <strong>you (the patient)</strong>, and to <strong>healthcare providers or doctors</strong> whom you explicitly consult, connect with, or share records with. Access is enforced through authenticated credentials and database security policies.
                                </p>
                            </div>

                            {/* 5. Patient control */}
                            <div className="space-y-1.5">
                                <h3 className="font-semibold text-gray-900 flex items-center space-x-1.5">
                                    <Lock className="w-4 h-4 text-emerald-600" />
                                    <span>5. Patient control &amp; management</span>
                                </h3>
                                <p className="text-gray-600 pl-5 leading-relaxed">
                                    You can view, manage, or remove your past medical history entries directly from this Medical History screen at any time. You may also delete your profile from your account settings.
                                </p>
                            </div>

                        </div>

                        {/* Privacy & Data Protection Accordion */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <span className="flex items-center space-x-2">
                                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Privacy &amp; Data Protection Notice</span>
                                </span>
                                {showPrivacyDetails ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                            </button>
                            {showPrivacyDetails && (
                                <div className="p-4 bg-white text-xs text-gray-600 space-y-2 border-t border-gray-100">
                                    <p>
                                        <strong>Data Minimization:</strong> Only data necessary for maintaining your health record and prescription tracking is collected and stored.
                                    </p>
                                    <p>
                                        <strong>Secure Transmission:</strong> All data transmissions between your browser and the database are encrypted using industry-standard TLS.
                                    </p>
                                    <p>
                                        <strong>Audit Logging:</strong> When you provide consent, the system cryptographically logs the consent timestamp, version ({CONSENT_VERSION}), and purpose in an immutable security audit ledger.
                                    </p>
                                    <p>
                                        <strong>Applicable Standards:</strong> Designed in alignment with digital health principles for patient transparency, purpose specification, and explicit consent.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* MANDATORY CONSENT CHECKBOX (Starts Unchecked) */}
                        <div className="pt-2">
                            <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:bg-slate-100/70 transition-colors cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    id="patient-consent-checkbox"
                                    checked={isConsentChecked}
                                    onChange={(e) => setIsConsentChecked(e.target.checked)}
                                    disabled={isProcessing}
                                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-colors"
                                />
                                <span className="text-xs sm:text-sm font-medium text-gray-900 leading-snug">
                                    I have read and understood the above information and voluntarily consent to the storage and processing of my medical information for the purposes described above.
                                </span>
                            </label>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100 bg-slate-50/80">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!isConsentChecked || isProcessing}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                isConsentChecked && !isProcessing
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Persisting Consent &amp; Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>I Agree &amp; Continue</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PatientConsentModal;
