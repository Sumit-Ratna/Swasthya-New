const assert = require('assert');
const referralController = require('../../src/controllers/referralController');
const {
    REFERRAL_STATES,
    isValidTransition,
    isActorAuthorized,
    transitionReferral
} = require('../../src/domain/referralStateMachine');
const supabase = require('../../src/config/supabaseClient');

console.log("====================================================");
console.log("RUNNING PHASE 8 - CANONICAL STATE MACHINE TESTS");
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
        id: 'req-test-state-machine'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runStateMachineTests() {
    const patientUser = {
        id: '99999999-9999-9999-9999-999999999999',
        role: 'PATIENT',
        phone: '9811122233',
        name: 'Sunita Sharma'
    };

    const healthWorkerUser = {
        id: '77777777-7777-7777-7777-777777777777',
        role: 'HEALTH_WORKER',
        phone: '9876543210',
        name: 'Sunita Gaikwad'
    };

    const facilityStaffUser = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        role: 'FACILITY_STAFF',
        phone: '9899988877',
        name: 'District Hospital Intake Desk'
    };

    const doctorUser = {
        id: '88888888-8888-8888-8888-888888888888',
        role: 'DOCTOR',
        phone: '9822012345',
        name: 'Dr. Anand Deshmukh'
    };

    const assignedDoctorId = '44444444-4444-4444-4444-444444444444';
    const receivingFacilityId = '22222222-2222-2222-2222-222222222222';

    let testReferralId = null;

    // ----------------------------------------------------
    // TEST 1: Forced Canonical Entry in TRIAGED
    // ----------------------------------------------------
    await test('Every new referral creation strictly starts in TRIAGED lifecycle state', async () => {
        const { req, res } = createMockReqRes({
            user: healthWorkerUser,
            body: {
                patient_id: patientUser.id,
                primary_complaint: 'Severe headache, elevated blood pressure during pregnancy',
                urgency: 'ROUTINE',
                risk_level: 'HIGH',
                specialty_required: 'OBSTETRICS'
            }
        });

        await referralController.createReferral(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert(res.jsonPayload.data);
        assert(res.jsonPayload.data.id);
        assert.strictEqual(res.jsonPayload.data.status, REFERRAL_STATES.TRIAGED);

        testReferralId = res.jsonPayload.data.id;

        // Verify initial event recorded in DB
        const { data: events } = await supabase
            .from('referral_events')
            .select('*')
            .eq('referral_id', testReferralId)
            .order('created_at', { ascending: true });

        assert(events && events.length > 0);
        assert.strictEqual(events[0].from_status, 'INIT');
        assert.strictEqual(events[0].to_status, REFERRAL_STATES.TRIAGED);
    });

    // ----------------------------------------------------
    // TEST 2: Rejection of Illegal Skip with HTTP 409 Conflict
    // ----------------------------------------------------
    await test('Illegal state skip (TRIAGED -> APPOINTMENT_BOOKED) is rejected with 409 CONFLICT', async () => {
        assert(testReferralId, 'Requires active testReferralId');

        const { req, res } = createMockReqRes({
            user: healthWorkerUser,
            params: { id: testReferralId },
            body: {
                to_status: REFERRAL_STATES.APPOINTMENT_BOOKED,
                reason: 'Attempting invalid skip to booked'
            }
        });

        await referralController.updateStatus(req, res);

        assert.strictEqual(res.statusCode, 409, `Expected 409 Conflict for illegal skip, received ${res.statusCode}`);
        assert.strictEqual(res.jsonPayload.code, 'INVALID_TRANSITION');
        assert(res.jsonPayload.error.includes("Cannot transition referral from 'TRIAGED' to 'APPOINTMENT_BOOKED'"));
    });

    // ----------------------------------------------------
    // TEST 3: Rejection of Arbitrary / Unknown Status with HTTP 400
    // ----------------------------------------------------
    await test('Arbitrary or non-existent status value is rejected with 400 VALIDATION_ERROR', async () => {
        assert(testReferralId, 'Requires active testReferralId');

        const { req, res } = createMockReqRes({
            user: healthWorkerUser,
            params: { id: testReferralId },
            body: {
                to_status: 'SUPER_DISCHARGED_NOW',
                reason: 'Non-canonical status value'
            }
        });

        await referralController.updateStatus(req, res);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonPayload.code, 'VALIDATION_ERROR');
        assert(res.jsonPayload.error.includes("Unknown or arbitrary referral status"));
    });

    // ----------------------------------------------------
    // TEST 4: Actor Role Authorization Enforcement
    // ----------------------------------------------------
    await test('Actor role authorization blocks unauthorized roles with 403 ACTOR_UNAUTHORIZED', async () => {
        assert(testReferralId, 'Requires active testReferralId');

        // Move to FACILITY_SELECTED first
        await transitionReferral({
            referralId: testReferralId,
            toStatus: REFERRAL_STATES.FACILITY_SELECTED,
            actorUserId: healthWorkerUser.id,
            actorRole: healthWorkerUser.role,
            reason: 'Facility selected: District Hospital',
            payload: { receiving_facility_id: receivingFacilityId }
        });

        // Patient attempting to ACCEPT referral (only FACILITY_STAFF, DOCTOR, ADMIN can accept)
        const { req, res } = createMockReqRes({
            user: patientUser,
            params: { id: testReferralId },
            body: {
                to_status: REFERRAL_STATES.ACCEPTED,
                reason: 'Patient trying to self-accept facility admission'
            }
        });

        await referralController.updateStatus(req, res);

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonPayload.code, 'ACTOR_UNAUTHORIZED');
        assert(res.jsonPayload.error.includes("is not authorized to transition referral to 'ACCEPTED'"));
    });

    // ----------------------------------------------------
    // TEST 5: Mandatory Reason Enforcement
    // ----------------------------------------------------
    await test('Transitions requiring mandatory reasons (e.g. CANCELLED) fail if reason is missing', async () => {
        // Create a separate referral for cancellation test
        const { req: reqCreate, res: resCreate } = createMockReqRes({
            user: healthWorkerUser,
            body: {
                patient_id: patientUser.id,
                primary_complaint: 'Routine follow-up cancellation test',
                urgency: 'ROUTINE',
                risk_level: 'LOW'
            }
        });
        await referralController.createReferral(reqCreate, resCreate);
        assert.strictEqual(resCreate.statusCode, 201);
        const cancelReferralId = resCreate.jsonPayload.data.id;

        // 5a. Missing reason must be rejected with 400
        const { req: reqNoReason, res: resNoReason } = createMockReqRes({
            user: healthWorkerUser,
            params: { id: cancelReferralId },
            body: {
                to_status: REFERRAL_STATES.CANCELLED,
                reason: '' // empty reason
            }
        });

        await referralController.updateStatus(reqNoReason, resNoReason);

        assert.strictEqual(resNoReason.statusCode, 400);
        assert.strictEqual(resNoReason.jsonPayload.code, 'VALIDATION_ERROR');
        assert(resNoReason.jsonPayload.error.includes("A mandatory, descriptive reason is required"));

        // 5b. Valid reason successfully cancels
        const { req: reqValid, res: resValid } = createMockReqRes({
            user: healthWorkerUser,
            params: { id: cancelReferralId },
            body: {
                to_status: REFERRAL_STATES.CANCELLED,
                reason: 'Patient symptoms resolved after medication; in-person referral no longer necessary.'
            }
        });

        await referralController.updateStatus(reqValid, resValid);
        assert.strictEqual(resValid.statusCode, 200);
        assert.strictEqual(resValid.jsonPayload.data.status, REFERRAL_STATES.CANCELLED);
    });

    // ----------------------------------------------------
    // TEST 6: Complete Replayable Timeline Progression
    // ----------------------------------------------------
    await test('Routine referral progression creates full replayable immutable timeline', async () => {
        // Step 1: Facility staff accepts
        const r1 = await transitionReferral({
            referralId: testReferralId,
            toStatus: REFERRAL_STATES.ACCEPTED,
            actorUserId: facilityStaffUser.id,
            actorRole: facilityStaffUser.role,
            reason: 'Facility bed and OBGYN consultant available'
        });
        assert.strictEqual(r1.toStatus, REFERRAL_STATES.ACCEPTED);

        // Step 2: Book appointment slot
        const r2 = await transitionReferral({
            referralId: testReferralId,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorUserId: facilityStaffUser.id,
            actorRole: facilityStaffUser.role,
            reason: 'Token slot allocated for tomorrow 10:00 AM',
            payload: { slot_token: 'TOKEN-NASHIK-99' }
        });
        assert.strictEqual(r2.toStatus, REFERRAL_STATES.APPOINTMENT_BOOKED);

        // Step 3: Patient in transit
        const r3 = await transitionReferral({
            referralId: testReferralId,
            toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT,
            actorUserId: patientUser.id,
            actorRole: patientUser.role,
            reason: 'Patient boarded 108 ambulance'
        });
        assert.strictEqual(r3.toStatus, REFERRAL_STATES.PATIENT_IN_TRANSIT);

        // Step 4: Patient reached
        const r4 = await transitionReferral({
            referralId: testReferralId,
            toStatus: REFERRAL_STATES.PATIENT_REACHED,
            actorUserId: facilityStaffUser.id,
            actorRole: facilityStaffUser.role,
            reason: 'Patient arrived at hospital triage reception'
        });
        assert.strictEqual(r4.toStatus, REFERRAL_STATES.PATIENT_REACHED);

        // Step 5: Doctor assigned
        const r5 = await transitionReferral({
            referralId: testReferralId,
            toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED,
            actorUserId: facilityStaffUser.id,
            actorRole: facilityStaffUser.role,
            reason: 'Assigned to Dr. Anand Deshmukh',
            payload: { assigned_doctor_id: assignedDoctorId }
        });
        assert.strictEqual(r5.toStatus, REFERRAL_STATES.DOCTOR_ASSIGNED);

        // Verify timeline contains all 6 transitions
        const { data: timeline } = await supabase
            .from('referral_events')
            .select('*')
            .eq('referral_id', testReferralId)
            .order('created_at', { ascending: true });

        assert(timeline.length >= 6, `Expected at least 6 timeline events, found ${timeline.length}`);
    });

    console.log("\n----------------------------------------------------");
    console.log(`TOTAL PHASE 8 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("----------------------------------------------------\n");

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runStateMachineTests()
        .catch(err => {
            console.error("Fatal Test Suite Error:", err);
            process.exit(1);
        });
}

module.exports = { runStateMachineTests };
