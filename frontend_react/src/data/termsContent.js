/**
 * Swasthya Terms & Conditions and Medical Data Consent Document
 * Version: 1.0.0
 * Source: Swasthya_Terms_and_Conditions.md
 */

export const TERMS_VERSION = 'v1.0.0';
export const TERMS_LAST_UPDATED = 'September 2026';
export const TERMS_EFFECTIVE_DATE = 'September 2026';

export const TERMS_SECTIONS = [
    {
        id: 'acceptance',
        number: '1',
        title: 'Acceptance of Terms',
        content: `By using Swasthya, you agree to:
• Provide information that is accurate and complete to the best of your knowledge.
• Use Swasthya only for legitimate healthcare and healthcare-coordination purposes.
• Provide truthful information regarding your symptoms, medical history, medications, and other health information when requested.
• Understand the limitations of AI-assisted recommendations and facility information.
• Follow appropriate instructions provided by qualified healthcare professionals.
• Protect your account credentials and the device through which you access Swasthya.

If you do not agree with these Terms and Conditions, you should not use Swasthya or its healthcare services.`
    },
    {
        id: 'about',
        number: '2',
        title: 'About Swasthya',
        content: `Swasthya is intended to support the closed-loop healthcare journey:
Assess → Refer → Reach → Treat → Follow-up → Close

The platform assists with patient registration, health-worker assessments, risk stratification, facility recommendation, referral creation and tracking, facility availability information, appointment coordination, doctor assignment, diagnostic reports, prescription management, follow-up reminders, and longitudinal healthcare records.

Swasthya is a healthcare coordination and clinical decision-support platform and is NOT intended to replace qualified medical professionals.`
    },
    {
        id: 'info-collected',
        number: '3',
        title: 'Medical Information We May Collect',
        content: `Depending on the features you use, Swasthya may collect and process:
• Name and basic demographic information (Age, DOB, Gender, Blood Group, Address).
• Contact and emergency contact information.
• Symptoms, health complaints, and vital signs.
• Relevant medical history, existing conditions, or clinical risk factors.
• Referral, consultation, and appointment details.
• Diagnostic reports and lab results.
• Prescriptions and prescription-related medical documents.
• Treatment notes, follow-up milestones, and caregiver authorization records.

Swasthya collects information that is strictly relevant and necessary for providing requested healthcare coordination services.`
    },
    {
        id: 'consent-processing',
        number: '4',
        title: 'Consent to Collection and Processing of Health Information',
        content: `By accepting these Terms, you consent to Swasthya collecting, storing, processing, and using relevant health information for legitimate healthcare-related purposes, including:
• Understanding information provided during registration or assessment.
• Supporting healthcare risk stratification and triage.
• Supporting healthcare professionals in coordinating care across primary, secondary, and tertiary centers.
• Identifying and recommending potentially suitable healthcare facilities.
• Creating, managing, and tracking closed-loop referrals.
• Managing diagnostic reports, prescriptions, and follow-up care reminders.
• Improving referral coordination and operational accountability.

Your information is only accessed by authorized users within the scope necessary for the relevant healthcare or operational purpose.`
    },
    {
        id: 'prescription-consent',
        number: '5',
        title: 'Consent to Share Prescriptions and Medical Documents (CRITICAL)',
        content: `Prescriptions, diagnostic reports, medical records, and other healthcare documents contain sensitive personal and medical health information.

By accepting this consent, you expressly authorize Swasthya to allow you to upload, store, process, and share your prescriptions and relevant medical documents when required for your healthcare journey with authorized:
• Health workers (ASHA/ANM) involved in your care
• Qualified doctors and medical officers
• Receiving healthcare facilities (PHC, CHC, District/Civil Hospitals, Medical Colleges)
• Diagnostic or treatment personnel involved in your care journey

Explicit Consent Statement:
"I understand that my prescription and relevant medical documents contain personal health information. I expressly consent to sharing these documents through Swasthya with authorized healthcare professionals and healthcare facilities involved in my care, referral, consultation, treatment, diagnosis, or follow-up. I understand that when such information is shared with my consent and accessed by authorized persons for the stated healthcare purpose, such sharing is an authorized use of my medical information and is not an unauthorized disclosure of my private information."`
    },
    {
        id: 'access-control',
        number: '6',
        title: 'Who May Access Your Information?',
        content: `Access to healthcare information is strictly role-based and authorization-scoped:
• Patients: Access their own complete healthcare information, referrals, prescriptions, appointments, and records.
• Health Workers (ASHA/ANM): Access information required to register patients, conduct assessments, support referrals, and track follow-ups.
• Doctors: Access relevant clinical information necessary for consultation, diagnosis, prescription, and treatment.
• Healthcare Facilities: Access relevant information necessary to triage and process incoming referrals and coordinate admissions.
• Caregivers: Access information only when explicitly authorized by the patient. Caregiver access is scoped and revocable at any time.
• Administrators: Access operational monitoring metrics with clinical data de-identified unless authorized.`
    },
    {
        id: 'prescription-privacy',
        number: '7',
        title: 'Prescription Privacy & Security Controls',
        content: `Swasthya applies stringent safeguards to prescriptions and medical documents:
• Role-based access control (RBAC) and authorization checks.
• End-to-end encrypted transmission (TLS 1.3).
• Secure cloud/local storage with ABDM FHIR compliance.
• Immutable audit logging of all document views, uploads, and sharing events.`
    },
    {
        id: 'ai-disclaimer',
        number: '8',
        title: 'AI-Assisted Healthcare Decision Support',
        content: `Swasthya uses artificial intelligence for risk stratification, triage assistance, facility recommendation, and medical explainer support.

AI is NOT a doctor. AI-generated suggestions are decision-support tools and do NOT constitute a definitive medical diagnosis, prescription, or substitute for professional medical consultation. Final clinical decisions remain the responsibility of qualified healthcare practitioners.`
    },
    {
        id: 'emergency-disclaimer',
        number: '9',
        title: 'Emergency and Urgent Healthcare',
        content: `Swasthya does NOT guarantee emergency response, ambulance dispatch, immediate hospital admission, or doctor availability. If you are experiencing a life-threatening medical emergency, immediately dial 108 / 112 or proceed to the nearest emergency room.`
    },
    {
        id: 'facility-info',
        number: '10',
        title: 'Healthcare Facility Information',
        content: `Facility availability, operational loads, and doctor schedules are synchronized periodically and may vary in real time. Facility availability indicators are not an absolute guarantee of immediate service upon arrival.`
    },
    {
        id: 'referral-journey',
        number: '11',
        title: 'Closed-Loop Referral Coordination',
        content: `Swasthya tracks the complete referral journey:
Triaged → Facility Recommended → Facility Selected → Confirmation → Accepted → Patient in Transit → Patient Reached → Doctor Assigned → Consultation → Treatment → Follow-up → Closed.`
    },
    {
        id: 'offline-mode',
        number: '12',
        title: 'Offline Functionality & Data Sync',
        content: `When operating in offline / airplane mode, data is securely stored locally on your device. Pending referrals and notes are automatically synchronized with the central server once network connectivity is restored.`
    },
    {
        id: 'caregiver-auth',
        number: '13',
        title: 'Caregiver Authorization & Revocation',
        content: `Patients may designate trusted family members or caregivers to access specific medical updates. Caregiver permissions can be modified or permanently revoked at any time from your Profile settings.`
    },
    {
        id: 'data-security',
        number: '14',
        title: 'Data Security & Protection',
        content: `Swasthya implements industry-standard safeguards:
• Secure JWT session authentication
• PostgreSQL row-level security (RLS)
• SHA-256 password hashing
• Audit ledgers tracking data access`
    },
    {
        id: 'consent-withdrawal',
        number: '15',
        title: 'Consent Withdrawal Rights',
        content: `You may request withdrawal of consent for future data processing at any time. Withdrawal does not invalidate data processed during an ongoing acute clinical episode or statutory healthcare record-keeping requirements.`
    },
    {
        id: 'user-responsibilities',
        number: '16',
        title: 'User Responsibilities & Prohibitions',
        content: `Users agree not to provide deliberately fraudulent health data, access unauthorized accounts, attempt security bypasses, or misuse medical referral channels.`
    }
];
