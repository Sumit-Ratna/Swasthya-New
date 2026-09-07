const assert = require('assert');
const referralController = require('../../src/controllers/referralController');
const facilityOpsController = require('../../src/controllers/facilityOpsController');
const doctorAssignmentService = require('../../src/services/doctorAssignmentService');
const { REFERRAL_STATES, transitionReferral } = require('../../src/domain/referralStateMachine');
const supabase = require('../../src/config/supabaseClient');
const crypto = require('crypto');

console.log("====================================================");
console.log("RUNNING PHASE 10 - FACILITY OPS & DOCTOR ASSIGNMENT TESTS");
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
        id: 'req-test-doctor-assignment'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runDoctorAssignmentTests() {
    const patientUser = {
        id: '99999999-9999-9999-9999-999999999999',
        role: 'PATIENT',
        phone: '9811122233',
        name: 'Sunita Sharma'
    };

    const healthWorkerUser = {
        id: '77777777-7777-7777-7777-777777777777',
        role: 'HEALTH_WORKER',
        phone: '9800000001',
        name: 'Sunita Gaikwad'
    };

    const facilityStaffUser = {
        id: '66666666-6666-6666-6666-666666666666',
        role: 'FACILITY_STAFF',
        phone: '9800000003',
        name: 'SDH Staff Operator'
    };

    const facilityA = '11111111-1111-1111-1111-111111111111'; // PHC Shirwal
    const facilityB = '22222222-2222-2222-2222-222222222222'; // SDH Bhor

    // Ensure test doctors exist in DB
    const doctorA_Id = crypto.randomUUID();
    const doctorB_Id = crypto.randomUUID();
    const doctorB_Alt_Id = crypto.randomUUID();

    // Doctor A at Facility A (General Medicine)
    await supabase.from('doctors').insert([{
        id: doctorA_Id,
        name: 'Dr. Ramesh FacilityA',
        specialty_name: 'GENERAL_MEDICINE',
        facility_id: facilityA,
        availability_status: 'AVAILABLE',
        status: 'ACTIVE'
    }]);

    // Doctor B at Facility B (Cardiology, Unavailable)
    await supabase.from('doctors').insert([{
        id: doctorB_Id,
        name: 'Dr. Suresh Busy',
        specialty_name: 'CARDIOLOGY',
        facility_id: facilityB,
        availability_status: 'BUSY',
        status: 'ACTIVE'
    }]);

    // Doctor B Alternative at Facility B (Cardiology, Available)
    await supabase.from('doctors').insert([{
        id: doctorB_Alt_Id,
        name: 'Dr. Priya Available',
        specialty_name: 'CARDIOLOGY',
        facility_id: facilityB,
        availability_status: 'AVAILABLE',
        status: 'ACTIVE'
    }]);

    // 1. Doctor Assignment Before Patient Arrival is Rejected (409 Conflict)
    let referral1Id = null;
    await test("1. Doctor assignment before patient arrival (status != PATIENT_REACHED) is rejected with 409 PATIENT_NOT_REACHED", async () => {
        // Create referral in TRIAGED state
        const { req: cReq, res: cRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                receiving_facility_id: facilityB,
                primary_complaint: 'Chest discomfort',
                urgency: 'HIGH',
                specialty_required: 'CARDIOLOGY'
            },
            user: healthWorkerUser
        });
        await referralController.createReferral(cReq, cRes, (e) => { throw e; });
        referral1Id = cRes.jsonPayload.data.id;

        // Attempt to assign doctor while referral is still in FACILITY_SELECTED / TRIAGED
        const { req: aReq, res: aRes } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                doctor_id: doctorB_Alt_Id,
                reason: 'Assigning cardiologist in advance'
            },
            user: facilityStaffUser
        });

        await referralController.assignDoctor(aReq, aRes);
        assert.strictEqual(aRes.statusCode, 409);
        assert.strictEqual(aRes.jsonPayload.code, 'PATIENT_NOT_REACHED');
    });

    // 2. Cross-Facility Doctor Assignment is Rejected (400)
    await test("2. Cross-facility doctor assignment (doctor from facility A to referral at facility B) is rejected with 400", async () => {
        // Bring referral1 to PATIENT_REACHED:
        // Move: FACILITY_SELECTED -> ACCEPTED -> APPOINTMENT_BOOKED -> PATIENT_IN_TRANSIT -> PATIENT_REACHED
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
            reason: 'Patient arrived at triage desk'
        });

        // Try assigning Doctor A (who belongs to facility A) to referral1 (which is at facility B)
        const { req, res } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                doctor_id: doctorA_Id,
                reason: 'Attempt cross facility assignment'
            },
            user: facilityStaffUser
        });

        await referralController.assignDoctor(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonPayload.code, 'CROSS_FACILITY_ASSIGNMENT_DENIED');
    });

    // 3. Unavailable Doctor Fallback to Alternative Doctor in Same Facility
    await test("3. When preferred doctor is unavailable/busy, fallback automatically selects alternative available doctor in same facility", async () => {
        // Request Doctor B (busy), should auto-select Doctor B Alt (available cardiologist at facility B)
        const { req, res } = createMockReqRes({
            params: { id: referral1Id },
            body: {
                doctor_id: doctorB_Id,
                reason: 'Patient ready for cardiac consult'
            },
            user: facilityStaffUser
        });

        await referralController.assignDoctor(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.status, REFERRAL_STATES.DOCTOR_ASSIGNED);
        assert(res.jsonPayload.doctor);
        assert.notStrictEqual(res.jsonPayload.doctor.id, doctorB_Id);
        assert.strictEqual(res.jsonPayload.doctor.specialty_name, 'CARDIOLOGY');
        assert.strictEqual(res.jsonPayload.doctor.facility_id, facilityB);
        assert.strictEqual(res.jsonPayload.data.status, REFERRAL_STATES.DOCTOR_ASSIGNED);
    });

    // 4. Controlled Rerouting when No Eligible Doctor Exists
    await test("4. Controlled Rerouting: When no matching/available doctor exists at facility, transitions to REROUTING_REQUIRED", async () => {
        // Create referral requiring a non-existent specialty (e.g., NEUROSURGERY) at facility A
        const { req: cReq, res: cRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                receiving_facility_id: facilityA,
                primary_complaint: 'Severe traumatic brain injury',
                urgency: 'EMERGENCY',
                specialty_required: 'NEUROSURGERY'
            },
            user: healthWorkerUser
        });
        await referralController.createReferral(cReq, cRes, (e) => { throw e; });
        const ref2Id = cRes.jsonPayload.data.id;

        // Progress to PATIENT_REACHED
        await transitionReferral({
            referralId: ref2Id,
            toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT,
            actorUserId: healthWorkerUser.id,
            actorRole: 'HEALTH_WORKER',
            reason: 'Emergency ambulance dispatch'
        });
        await transitionReferral({
            referralId: ref2Id,
            toStatus: REFERRAL_STATES.PATIENT_REACHED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Ambulance reached Facility A triage'
        });

        // Try assigning a doctor via FacilityOpsController (no neurosurgeon exists at Facility A)
        const { req: opsReq, res: opsRes } = createMockReqRes({
            body: {
                referralId: ref2Id
            },
            user: facilityStaffUser
        });

        await facilityOpsController.assignDoctor(opsReq, opsRes);
        assert.strictEqual(opsRes.statusCode, 200);
        assert.strictEqual(opsRes.jsonPayload.status, REFERRAL_STATES.REROUTING_REQUIRED);
        assert.strictEqual(opsRes.jsonPayload.rerouted, true);
        assert.strictEqual(opsRes.jsonPayload.referral.status, REFERRAL_STATES.REROUTING_REQUIRED);
    });

    // 5. DOCTOR_ASSIGNED is the Only Assignment State & Verified via Audit
    await test("5. DOCTOR_ASSIGNED is the canonical assignment state with complete audit event", async () => {
        // Check timeline events for referral1
        const { req: tReq, res: tRes } = createMockReqRes({
            params: { id: referral1Id },
            user: facilityStaffUser
        });

        await referralController.getReferralDetails(tReq, tRes, (e) => { throw e; });
        assert.strictEqual(tRes.statusCode, 200);
        const { timeline, referral } = tRes.jsonPayload.data;

        assert.strictEqual(referral.status, REFERRAL_STATES.DOCTOR_ASSIGNED);
        const assignmentEvent = timeline.find(e => e.to_status === REFERRAL_STATES.DOCTOR_ASSIGNED);
        assert(assignmentEvent, "Must have an immutable event for DOCTOR_ASSIGNED");
        assert.strictEqual(assignmentEvent.from_status, REFERRAL_STATES.PATIENT_REACHED);
        assert.strictEqual(assignmentEvent.actor_role, 'FACILITY_STAFF');
    });

    console.log(`\n====================================================`);
    console.log(`PHASE 10 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runDoctorAssignmentTests().catch(err => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
});
