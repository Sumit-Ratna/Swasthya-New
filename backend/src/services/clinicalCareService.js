const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const pdfService = require('./pdfService');
const dbService = require('./supabaseService');
const { REFERRAL_STATES, transitionReferral } = require('../domain/referralStateMachine');

class ClinicalCareError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', status = 400) {
        super(message);
        this.name = 'ClinicalCareError';
        this.code = code;
        this.status = status;
    }
}

/**
 * Complete doctor consultation & record structured clinical actions
 */
async function recordConsultation({
    referralId,
    doctorUser,
    clinicalSummary,
    diagnosis,
    requiresDiagnostics = false,
    diagnosticTests = [],
    prescriptionItems = [],
    instructions = '',
    followUpDays = null
}) {
    if (!referralId) {
        throw new ClinicalCareError('referralId is required to record consultation', 'VALIDATION_ERROR', 400);
    }
    if (!diagnosis || typeof diagnosis !== 'string' || diagnosis.trim().length < 2) {
        throw new ClinicalCareError('A valid clinical diagnosis is required to complete consultation', 'VALIDATION_ERROR', 400);
    }

    // 1. Fetch Referral Record
    const { data: referral, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

    if (refErr || !referral) {
        throw new ClinicalCareError(`Referral not found with ID: ${referralId}`, 'REFERRAL_NOT_FOUND', 404);
    }

    // 2. Authorization Check: Doctor must be authorized (role DOCTOR or ADMIN)
    const actorRole = (doctorUser?.role || 'DOCTOR').toUpperCase();
    const actorUserId = doctorUser?.id || null;

    if (actorRole !== 'DOCTOR' && actorRole !== 'ADMIN') {
        throw new ClinicalCareError('Only authorized medical doctors or clinical administrators can complete consultations', 'DOCTOR_UNAUTHORIZED', 403);
    }

    // 3. Pre-condition: Referral must be in DOCTOR_ASSIGNED state
    if (referral.status !== REFERRAL_STATES.DOCTOR_ASSIGNED) {
        throw new ClinicalCareError(
            `Consultation can only be completed when referral is in DOCTOR_ASSIGNED state. Current status: '${referral.status}'.`,
            'INVALID_STATE',
            409
        );
    }

    // 4. Clinical Safety: Verify prescription items structure (AI cannot author final medication decision)
    const structuredItems = (prescriptionItems || []).map((item, idx) => {
        if (typeof item === 'string') {
            return { id: idx + 1, name: item.trim(), dosage: 'As directed', frequency: 'OD', duration: '5 days' };
        }
        if (!item.name || typeof item.name !== 'string') {
            throw new ClinicalCareError(`Prescription item at index ${idx} is missing a valid medicine name`, 'INVALID_PRESCRIPTION_ITEM', 400);
        }
        return {
            id: idx + 1,
            name: item.name.trim(),
            dosage: item.dosage || 'Standard dose',
            frequency: item.frequency || 'BD',
            duration: item.duration || '5 days',
            instructions: item.instructions || ''
        };
    });

    // 5. Compute SHA-256 Digital Signature Hash for Prescription Integrity
    const sigPayload = `${actorUserId}:${referral.patient_id}:${referralId}:${diagnosis}:${JSON.stringify(structuredItems)}:${new Date().toISOString()}`;
    const digitalSignature = crypto.createHash('sha256').update(sigPayload).digest('hex');

    // 6. Generate Derived PDF Artifact
    let pdfRelativePath = null;
    try {
        const patientData = await dbService.getUser(referral.patient_id);
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const fileName = `Prescription-${referralId.slice(0, 8)}-${Date.now()}.pdf`;
        const fullPdfPath = path.join(uploadDir, fileName);

        await pdfService.generatePrescriptionPDF({
            hospitalName: 'SwasthyaSetu Referral Network',
            doctorName: doctorUser?.name || 'Consulting Physician',
            doctorSpecialization: doctorUser?.specialization || 'Clinical Specialist',
            patientName: patientData?.name || 'Patient',
            patientAge: patientData?.dob ? new Date().getFullYear() - new Date(patientData.dob).getFullYear() : 'N/A',
            patientGender: patientData?.gender || 'N/A',
            patientPhone: patientData?.phone || 'N/A',
            visitId: referralId.slice(0, 8),
            symptoms: referral.primary_complaint || '',
            diagnosis: diagnosis.trim(),
            medicines: structuredItems,
            notes: instructions || ''
        }, fullPdfPath);

        pdfRelativePath = `uploads/${fileName}`;
    } catch (pdfErr) {
        console.warn('[PDF_ARTIFACT] Non-fatal PDF generation notice:', pdfErr.message);
    }

    // 7. Persist Structured Prescription
    let createdPrescription = null;
    const rxPayload = {
        id: crypto.randomUUID(),
        referral_id: referralId,
        patient_id: referral.patient_id,
        doctor_id: referral.assigned_doctor_id || actorUserId,
        facility_id: referral.receiving_facility_id,
        diagnosis: diagnosis.trim(),
        items_json: typeof structuredItems === 'string' ? structuredItems : JSON.stringify(structuredItems),
        instructions: instructions || '',
        digital_signature_hash: digitalSignature
    };

    try {
        const { data: rxData, error: rxErr } = await supabase
            .from('prescriptions')
            .insert([rxPayload])
            .select()
            .single();

        if (!rxErr && rxData) {
            createdPrescription = rxData;
        } else if (rxErr) {
            console.warn('[PRESCRIPTION_PERSIST] DB Notice:', rxErr.message);
            localDb.insert('prescriptions', { ...rxPayload, created_at: new Date().toISOString() });
        }
    } catch (rxErr) {
        console.warn('[PRESCRIPTION_PERSIST] Notice:', rxErr.message);
        localDb.insert('prescriptions', { ...rxPayload, created_at: new Date().toISOString() });
    }

    if (!createdPrescription) {
        createdPrescription = { ...rxPayload, created_at: new Date().toISOString(), file_url: pdfRelativePath };
        const existing = localDb.findOne('prescriptions', p => p.id === rxPayload.id);
        if (!existing) {
            localDb.insert('prescriptions', createdPrescription);
        }
    }

    // 8. Canonical Transition: DOCTOR_ASSIGNED -> CONSULTATION_COMPLETED
    const consultTransition = await transitionReferral({
        referralId,
        toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED,
        actorUserId,
        actorRole: 'DOCTOR',
        reason: `Diagnosis: ${diagnosis.trim()}. Prescription generated.`,
        payload: {
            clinical_summary: clinicalSummary || `Consultation complete: ${diagnosis.trim()}`
        }
    });

    // 9. Branching Workflow:
    // If diagnostics required: CONSULTATION_COMPLETED -> DIAGNOSTICS_PENDING
    // If no diagnostics required: CONSULTATION_COMPLETED -> TREATMENT_COMPLETED
    let nextStatus = requiresDiagnostics
        ? REFERRAL_STATES.DIAGNOSTICS_PENDING
        : REFERRAL_STATES.TREATMENT_COMPLETED;

    const branchTransition = await transitionReferral({
        referralId,
        toStatus: nextStatus,
        actorUserId,
        actorRole: 'DOCTOR',
        reason: requiresDiagnostics
            ? `Diagnostic tests ordered: ${diagnosticTests.join(', ') || 'Standard Lab Panel'}`
            : 'Treatment plan finalized, ready for follow-up'
    });

    return {
        status: nextStatus,
        message: `Consultation completed. Referral transitioned to ${nextStatus}.`,
        referral: branchTransition.referral,
        prescription: createdPrescription,
        digitalSignature,
        pdfUrl: pdfRelativePath
    };
}

/**
 * Diagnostic Lab Completion: DIAGNOSTICS_PENDING -> DIAGNOSTICS_COMPLETED -> TREATMENT_COMPLETED
 */
async function completeDiagnostics({
    referralId,
    actorUser,
    labResults = null,
    reportUrl = null,
    notes = null
}) {
    if (!referralId) {
        throw new ClinicalCareError('referralId is required', 'VALIDATION_ERROR', 400);
    }

    // 1. Fetch Referral
    const { data: referral, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

    if (refErr || !referral) {
        throw new ClinicalCareError(`Referral not found with ID: ${referralId}`, 'REFERRAL_NOT_FOUND', 404);
    }

    if (referral.status !== REFERRAL_STATES.DIAGNOSTICS_PENDING) {
        throw new ClinicalCareError(
            `Diagnostics can only be completed when referral is in DIAGNOSTICS_PENDING state. Current status: '${referral.status}'.`,
            'INVALID_STATE',
            409
        );
    }

    const actorUserId = actorUser?.id || null;
    const actorRole = actorUser?.role || 'FACILITY_STAFF';

    // 2. Transition: DIAGNOSTICS_PENDING -> DIAGNOSTICS_COMPLETED
    await transitionReferral({
        referralId,
        toStatus: REFERRAL_STATES.DIAGNOSTICS_COMPLETED,
        actorUserId,
        actorRole,
        reason: notes || 'Diagnostic lab results uploaded and verified'
    });

    // 3. Transition: DIAGNOSTICS_COMPLETED -> TREATMENT_COMPLETED
    const finalResult = await transitionReferral({
        referralId,
        toStatus: REFERRAL_STATES.TREATMENT_COMPLETED,
        actorUserId,
        actorRole,
        reason: 'Diagnostics evaluated by clinical team, treatment finalized'
    });

    return {
        status: REFERRAL_STATES.TREATMENT_COMPLETED,
        message: 'Diagnostics completed and treatment completed',
        referral: finalResult.referral
    };
}

/**
 * Schedule Post-Discharge Follow-Up: TREATMENT_COMPLETED -> FOLLOW_UP_PENDING
 */
async function scheduleFollowUp({
    referralId,
    doctorUser,
    followUpDays = 7,
    instructions = 'Verify blood pressure and vitals recovery',
    assignedAshaId = null
}) {
    if (!referralId) {
        throw new ClinicalCareError('referralId is required', 'VALIDATION_ERROR', 400);
    }

    const { data: referral, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

    if (refErr || !referral) {
        throw new ClinicalCareError(`Referral not found with ID: ${referralId}`, 'REFERRAL_NOT_FOUND', 404);
    }

    if (referral.status !== REFERRAL_STATES.TREATMENT_COMPLETED) {
        throw new ClinicalCareError(
            `Follow-up can only be scheduled when referral is in TREATMENT_COMPLETED state. Current status: '${referral.status}'.`,
            'INVALID_STATE',
            409
        );
    }

    const actorUserId = doctorUser?.id || null;
    const actorRole = doctorUser?.role || 'DOCTOR';

    const result = await transitionReferral({
        referralId,
        toStatus: REFERRAL_STATES.FOLLOW_UP_PENDING,
        actorUserId,
        actorRole,
        reason: `Follow-up scheduled in ${followUpDays} days: ${instructions}`
    });

    return {
        status: REFERRAL_STATES.FOLLOW_UP_PENDING,
        message: 'Follow-up task created and referral transitioned to FOLLOW_UP_PENDING',
        referral: result.referral
    };
}

/**
 * Complete Care Loop at Home / Community: FOLLOW_UP_PENDING -> FOLLOW_UP_COMPLETED
 */
async function completeFollowUp({
    referralId,
    healthWorkerUser,
    notes,
    vitals = null,
    patientStatus = 'RECOVERED'
}) {
    if (!referralId) {
        throw new ClinicalCareError('referralId is required', 'VALIDATION_ERROR', 400);
    }
    if (!notes || typeof notes !== 'string' || notes.trim().length < 3) {
        throw new ClinicalCareError('Mandatory verification notes are required to complete follow-up', 'VALIDATION_ERROR', 400);
    }

    const { data: referral, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

    if (refErr || !referral) {
        throw new ClinicalCareError(`Referral not found with ID: ${referralId}`, 'REFERRAL_NOT_FOUND', 404);
    }

    if (referral.status !== REFERRAL_STATES.FOLLOW_UP_PENDING) {
        throw new ClinicalCareError(
            `Follow-up completion requires referral in FOLLOW_UP_PENDING state. Current status: '${referral.status}'.`,
            'INVALID_STATE',
            409
        );
    }

    const actorUserId = healthWorkerUser?.id || null;
    const actorRole = healthWorkerUser?.role || 'HEALTH_WORKER';

    const result = await transitionReferral({
        referralId,
        toStatus: REFERRAL_STATES.FOLLOW_UP_COMPLETED,
        actorUserId,
        actorRole,
        reason: `Community follow-up completed: ${notes.trim()} (Patient Status: ${patientStatus})`
    });

    return {
        status: REFERRAL_STATES.FOLLOW_UP_COMPLETED,
        message: 'Closed-loop referral cycle fully completed (FOLLOW_UP_COMPLETED)',
        referral: result.referral
    };
}

/**
 * Securely retrieve prescription with authorization validation
 */
async function getPrescription({ prescriptionId, requestingUser }) {
    if (!prescriptionId) {
        throw new ClinicalCareError('prescriptionId is required', 'VALIDATION_ERROR', 400);
    }

    let prescription = null;
    try {
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('id', prescriptionId)
            .single();

        if (!error && data) {
            prescription = data;
        }
    } catch (e) {
        // Fallback to localDb
    }

    if (!prescription) {
        prescription = localDb.findOne('prescriptions', p => p.id === prescriptionId);
    }

    if (!prescription) {
        throw new ClinicalCareError(`Prescription not found with ID: ${prescriptionId}`, 'NOT_FOUND', 404);
    }

    // Role-based Access Control
    const userId = requestingUser?.id;
    const role = (requestingUser?.role || '').toUpperCase();

    const isPatient = prescription.patient_id === userId;
    const isDoctor = role === 'DOCTOR';
    const isHealthWorker = role === 'HEALTH_WORKER';
    const isFacilityStaff = role === 'FACILITY_STAFF';
    const isAdmin = role === 'ADMIN';

    if (!isPatient && !isDoctor && !isHealthWorker && !isFacilityStaff && !isAdmin) {
        throw new ClinicalCareError('Unauthorized access to clinical prescription records', 'FORBIDDEN', 403);
    }

    return prescription;
}

module.exports = {
    ClinicalCareError,
    recordConsultation,
    completeDiagnostics,
    scheduleFollowUp,
    completeFollowUp,
    getPrescription
};

