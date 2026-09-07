const assert = require('assert');
const referralController = require('../../src/controllers/referralController');
const clinicalCareService = require('../../src/services/clinicalCareService');
const { REFERRAL_STATES, transitionReferral } = require('../../src/domain/referralStateMachine');
const supabase = require('../../src/config/supabaseClient');
const crypto = require('crypto');

console.log("====================================================");
console.log("RUNNING PHASE 11 - CLINICAL CARE & CLOSURE TESTS");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

async function test(desc, fn) {
    try {
        await fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${desc}`);
        console.error(`    Error: ${err.message}`);
        failed++;
    }
}

function createMockReqRes({ params = {}, query = {}, body = {}, user = null, headers = {} } = {}) {
    const req = {
        params,
        query,
        body,
        user,
        headers: { ...headers },
        id: 'req-test-clinical-care'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runClinicalCareTests() {
    const patientUser = {
        id: '99999999-9999-9999-9999-999999999999',
        role: 'PATIENT',
        phone: '9811122233',
        name: 'Sunita Sharma'
    };

    const unauthorizedPatientUser = {
        id: '55555555-5555-5555-5555-555555555555',
        role: 'PATIENT',
        phone: '9899999999',
        name: 'Stranger Patient'
    };

    const healthWorkerUser = {
        id: '77777777-7777-7777-7777-777777777777',
        role: 'HEALTH_WORKER',
        phone: '9800000001',
        name: 'Sunita Gaikwad'
    };

    const doctorUser = {
        id: '44444444-4444-4444-4444-444444444444',
        role: 'DOCTOR',
        phone: '9800000002',
        name: 'Dr. Anand Deshmukh',
        specialization: 'General Physician'
    };

    const facilityStaffUser = {
        id: '66666666-6666-6666-6666-666666666666',
        role: 'FACILITY_STAFF',
        phone: '9800000003',
        name: 'SDH Staff Operator'
    };

    const facilityId = '22222222-2222-2222-2222-222222222222'; // SDH Bhor

    // 1. Consultation before DOCTOR_ASSIGNED is rejected (409 Conflict)
    let referral1Id = null;
    await test("1. Consultation before doctor assignment (status != DOCTOR_ASSIGNED) is rejected with 409 INVALID_STATE", async () => {
        const { req: cReq, res: cRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                receiving_facility_id: facilityId,
                primary_complaint: 'Severe hypertension in pregnancy',
                urgency: 'HIGH',
                risk_level: 'HIGH'
            },
            user: healthWorkerUser
        });
        await referralController.createReferral(cReq, cRes, (e) => { throw e; });
        referral1Id = cRes.jsonPayload.data.id;

        // Attempt consultation while still in TRIAGED / FACILITY_SELECTED
        const { req: consultReq, res: consultRes } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                diagnosis: 'Pre-eclampsia',
                clinical_summary: 'Severe headache and elevated BP'
            },
            user: doctorUser
        });

        await referralController.completeConsultation(consultReq, consultRes);
        assert.strictEqual(consultRes.statusCode, 409);
        assert.strictEqual(consultRes.jsonPayload.code, 'INVALID_STATE');
    });

    // 2. Non-doctor role completing consultation is rejected (403 DOCTOR_UNAUTHORIZED)
    await test("2. Non-doctor role (e.g. HEALTH_WORKER) attempting consultation is rejected with 403 DOCTOR_UNAUTHORIZED", async () => {
        // Bring referral1 to DOCTOR_ASSIGNED
        await transitionReferral({
            referralId: referral1Id,
            toStatus: REFERRAL_STATES.ACCEPTED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Accepted'
        });
        await transitionReferral({
            referralId: referral1Id,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Booked'
        });
        await transitionReferral({
            referralId: referral1Id,
            toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT,
            actorUserId: healthWorkerUser.id,
            actorRole: 'HEALTH_WORKER',
            reason: 'Transit started'
        });
        await transitionReferral({
            referralId: referral1Id,
            toStatus: REFERRAL_STATES.PATIENT_REACHED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Arrived at facility'
        });
        await transitionReferral({
            referralId: referral1Id,
            toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Assigned to Dr. Anand Deshmukh'
        });

        // Health worker tries to complete consultation
        const { req: hwReq, res: hwRes } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                diagnosis: 'Pre-eclampsia',
                clinical_summary: 'Health worker summary'
            },
            user: healthWorkerUser
        });

        await referralController.completeConsultation(hwReq, hwRes);
        assert.strictEqual(hwRes.statusCode, 403);
        assert.strictEqual(hwRes.jsonPayload.code, 'DOCTOR_UNAUTHORIZED');
    });

    // 3. No-Diagnostics Branch (DOCTOR_ASSIGNED -> CONSULTATION_COMPLETED -> TREATMENT_COMPLETED)
    let savedPrescriptionId = null;
    await test("3. Direct Treatment branch: Doctor consultation with structured prescription advances to TREATMENT_COMPLETED", async () => {
        const { req: docReq, res: docRes } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                diagnosis: 'Gestational Hypertension (Stabilized)',
                clinical_summary: 'Administered Labetalol 100mg orally. BP reduced to 130/85. Fetal heart rate normal.',
                requires_diagnostics: false,
                prescription_items: [
                    { name: 'Labetalol', dosage: '100mg', frequency: 'BD', duration: '7 days', instructions: 'After food' },
                    { name: 'Calcium + Vitamin D3', dosage: '500mg', frequency: 'OD', duration: '30 days' }
                ],
                instructions: 'Rest and follow up with local ASHA within 7 days for BP monitoring'
            },
            user: doctorUser
        });

        await referralController.completeConsultation(docReq, docRes);
        assert.strictEqual(docRes.statusCode, 200);
        assert.strictEqual(docRes.jsonPayload.status, REFERRAL_STATES.TREATMENT_COMPLETED);
        assert(docRes.jsonPayload.prescription);
        assert(docRes.jsonPayload.digital_signature);
        assert(docRes.jsonPayload.pdf_url);
        savedPrescriptionId = docRes.jsonPayload.prescription.id;
    });

    // 4. Diagnostics-Required Branch
    let referral2Id = null;
    await test("4. Diagnostics Branch: CONSULTATION_COMPLETED -> DIAGNOSTICS_PENDING -> DIAGNOSTICS_COMPLETED -> TREATMENT_COMPLETED", async () => {
        // Create second referral and advance to DOCTOR_ASSIGNED
        const { req: cReq, res: cRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                receiving_facility_id: facilityId,
                primary_complaint: 'Suspected acute appendicitis',
                urgency: 'HIGH',
                risk_level: 'HIGH'
            },
            user: healthWorkerUser
        });
        await referralController.createReferral(cReq, cRes, (e) => { throw e; });
        referral2Id = cRes.jsonPayload.data.id;

        await transitionReferral({ referralId: referral2Id, toStatus: REFERRAL_STATES.ACCEPTED, actorUserId: facilityStaffUser.id, actorRole: 'FACILITY_STAFF', reason: 'Accepted' });
        await transitionReferral({ referralId: referral2Id, toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED, actorUserId: facilityStaffUser.id, actorRole: 'FACILITY_STAFF', reason: 'Booked' });
        await transitionReferral({ referralId: referral2Id, toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT, actorUserId: healthWorkerUser.id, actorRole: 'HEALTH_WORKER', reason: 'Transit' });
        await transitionReferral({ referralId: referral2Id, toStatus: REFERRAL_STATES.PATIENT_REACHED, actorUserId: facilityStaffUser.id, actorRole: 'FACILITY_STAFF', reason: 'Reached' });
        await transitionReferral({ referralId: referral2Id, toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED, actorUserId: facilityStaffUser.id, actorRole: 'FACILITY_STAFF', reason: 'Assigned' });

        // Doctor orders diagnostics
        const { req: docReq, res: docRes } = createMockReqRes({
            params: { id: referral2Id },
            body: {
                diagnosis: 'Suspected Appendicitis',
                clinical_summary: 'Right lower quadrant tenderness, fever',
                requires_diagnostics: true,
                diagnostic_tests: ['Abdominal Ultrasound', 'CBC', 'CRP'],
                prescription_items: [
                    { name: 'IV Paracetamol', dosage: '1g', frequency: 'Stat', duration: '1 day' }
                ]
            },
            user: doctorUser
        });
        await referralController.completeConsultation(docReq, docRes);
        assert.strictEqual(docRes.statusCode, 200);
        assert.strictEqual(docRes.jsonPayload.status, REFERRAL_STATES.DIAGNOSTICS_PENDING);

        // Facility Staff completes diagnostics
        const { req: diagReq, res: diagRes } = createMockReqRes({
            params: { id: referral2Id },
            body: {
                lab_results: { wbc: 14500, ultrasound: 'Inflamed appendix 8mm' },
                notes: 'Ultrasound confirmed mild appendicitis without perforation'
            },
            user: facilityStaffUser
        });
        await referralController.completeDiagnostics(diagReq, diagRes);
        assert.strictEqual(diagRes.statusCode, 200);
        assert.strictEqual(diagRes.jsonPayload.status, REFERRAL_STATES.TREATMENT_COMPLETED);
    });

    // 5. Care Loop Closure (TREATMENT_COMPLETED -> FOLLOW_UP_PENDING -> FOLLOW_UP_COMPLETED)
    await test("5. Closed Loop Care: TREATMENT_COMPLETED -> FOLLOW_UP_PENDING -> FOLLOW_UP_COMPLETED", async () => {
        // Doctor schedules follow-up for referral1
        const { req: schedReq, res: schedRes } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                follow_up_days: 7,
                instructions: 'Measure blood pressure at home, check for headache/blurring'
            },
            user: doctorUser
        });
        await referralController.scheduleFollowUp(schedReq, schedRes);
        assert.strictEqual(schedRes.statusCode, 200);
        assert.strictEqual(schedRes.jsonPayload.status, REFERRAL_STATES.FOLLOW_UP_PENDING);

        // Health Worker completes community follow-up
        const { req: compReq, res: compRes } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                notes: 'Day 7 home visit conducted. BP is 122/82 mmHg. Patient symptom-free and compliant with medications.',
                patient_status: 'RECOVERED'
            },
            user: healthWorkerUser
        });
        await referralController.completeFollowUp(compReq, compRes);
        assert.strictEqual(compRes.statusCode, 200);
        assert.strictEqual(compRes.jsonPayload.status, REFERRAL_STATES.FOLLOW_UP_COMPLETED);
    });

    // 6. Prescription Authorization & Security Check
    await test("6. Prescription RBAC: Patient/Doctor authorized, unauthorized patient receives 403", async () => {
        if (!savedPrescriptionId) return;

        // Authorized Patient fetches prescription
        const { req: pReq, res: pRes } = createMockReqRes({
            params: { id: savedPrescriptionId },
            user: patientUser
        });
        await referralController.getPrescription(pReq, pRes);
        assert.strictEqual(pRes.statusCode, 200);
        assert.strictEqual(pRes.jsonPayload.data.patient_id, patientUser.id);

        // Unauthorized stranger patient attempts to fetch
        const { req: uReq, res: uRes } = createMockReqRes({
            params: { id: savedPrescriptionId },
            user: unauthorizedPatientUser
        });
        await referralController.getPrescription(uReq, uRes);
        assert.strictEqual(uRes.statusCode, 403);
    });

    console.log(`\n====================================================`);
    console.log(`PHASE 11 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runClinicalCareTests().catch(err => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
});
