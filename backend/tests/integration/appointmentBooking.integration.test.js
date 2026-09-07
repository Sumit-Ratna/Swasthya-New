const assert = require('assert');
const appointmentController = require('../../src/controllers/appointmentController');
const referralController = require('../../src/controllers/referralController');
const appointmentService = require('../../src/services/appointmentService');
const { REFERRAL_STATES, transitionReferral } = require('../../src/domain/referralStateMachine');
const supabase = require('../../src/config/supabaseClient');

console.log("====================================================");
console.log("RUNNING PHASE 9 - APPOINTMENT BOOKING & ARRIVAL TESTS");
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
        id: 'req-test-appointment'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runAppointmentTests() {
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

    const doctorUser = {
        id: '88888888-8888-8888-8888-888888888888',
        role: 'DOCTOR',
        phone: '9800000002',
        name: 'Dr. Anand Deshmukh'
    };

    const facilityStaffUser = {
        id: '66666666-6666-6666-6666-666666666666',
        role: 'FACILITY_STAFF',
        phone: '9800000003',
        name: 'SDH Staff Operator'
    };

    const facilityId = '22222222-2222-2222-2222-222222222222';

    // 1. Explicit Slot Input Validation
    await test("1. Rejects booking missing date or time_slot when is_walk_in is false (400 VALIDATION_ERROR)", async () => {
        const { req, res } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                is_walk_in: false
                // missing appointment_date and time_slot
            },
            user: patientUser
        });

        await appointmentController.bookAppointment(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonPayload.code, 'VALIDATION_ERROR');
    });

    // 2. Explicit Walk-In Booking
    await test("2. Explicit walk-in (is_walk_in: true) books walk-in slot with auto-date", async () => {
        const { req, res } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                is_walk_in: true,
                type: 'OPD',
                reason: 'Emergency fever walk-in'
            },
            user: patientUser
        });

        await appointmentController.bookAppointment(req, res);
        assert.strictEqual(res.statusCode, 201);
        assert(res.jsonPayload.appointment);
        assert.strictEqual(res.jsonPayload.appointment.status, 'confirmed');
        assert(res.jsonPayload.appointment.time_slot.includes('Walk-in'));
    });

    // 3. Double Booking Conflict Prevention (Dynamic Unique Slot)
    const uniqueNonce = Math.floor(Math.random() * 1000000);
    const testDate = `2027-01-${String((uniqueNonce % 25) + 1).padStart(2, '0')}`;
    const testSlot = `Slot-${uniqueNonce}`;

    await test("3. First booking on specific date/slot succeeds, duplicate booking returns 409 SLOT_ALREADY_BOOKED", async () => {
        // First booking
        const { req: req1, res: res1 } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                appointment_date: testDate,
                time_slot: testSlot,
                type: 'OPD',
                reason: 'First booking consultation'
            },
            user: patientUser
        });
        await appointmentController.bookAppointment(req1, res1);
        assert.strictEqual(res1.statusCode, 201);
        assert(res1.jsonPayload.appointment);

        // Duplicate booking attempt for same doctor, date, and slot
        const { req: req2, res: res2 } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                appointment_date: testDate,
                time_slot: testSlot,
                type: 'OPD',
                reason: 'Conflicting second booking attempt'
            },
            user: patientUser
        });
        await appointmentController.bookAppointment(req2, res2);
        assert.strictEqual(res2.statusCode, 409);
        assert.strictEqual(res2.jsonPayload.code, 'SLOT_ALREADY_BOOKED');
    });

    // 4. Referral-Linked Booking & Transition
    let createdReferralId = null;
    await test("4. Referral-linked booking transitions referral from ACCEPTED -> APPOINTMENT_BOOKED with slot token", async () => {
        // Create referral via referralController
        const { req: createReq, res: createRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                receiving_facility_id: facilityId,
                primary_complaint: 'Suspected severe malaria',
                urgency: 'HIGH',
                risk_level: 'HIGH'
            },
            user: healthWorkerUser
        });

        await referralController.createReferral(createReq, createRes, (err) => { throw err; });
        assert.strictEqual(createRes.statusCode, 201);
        createdReferralId = createRes.jsonPayload.data.id;

        // Move to ACCEPTED
        await transitionReferral({
            referralId: createdReferralId,
            toStatus: REFERRAL_STATES.ACCEPTED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Facility has bed and OPD capacity'
        });

        // Book appointment linked to this referral
        const refDate = `2027-02-${String((uniqueNonce % 25) + 1).padStart(2, '0')}`;
        const refSlot = `RefSlot-${uniqueNonce}`;

        const { req, res } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                facility_id: facilityId,
                referral_id: createdReferralId,
                appointment_date: refDate,
                time_slot: refSlot,
                type: 'SPECIALIST',
                reason: 'Follow-up on malaria referral'
            },
            user: healthWorkerUser
        });

        await appointmentController.bookAppointment(req, res);
        assert.strictEqual(res.statusCode, 201);
        assert(res.jsonPayload.appointment);
        assert(res.jsonPayload.referral);
        assert.strictEqual(res.jsonPayload.referral.status, REFERRAL_STATES.APPOINTMENT_BOOKED);
        assert(res.jsonPayload.appointment.slot_token.startsWith('TOKEN-'));
    });

    // 5. Booking Guard on Non-Accepted Referral
    await test("5. Rejects appointment booking if linked referral is in invalid state (409 INVALID_TRANSITION)", async () => {
        // Create new referral (starts in TRIAGED)
        const { req: createReq, res: createRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                primary_complaint: 'Routine checkup',
                urgency: 'ROUTINE',
                risk_level: 'LOW'
            },
            user: healthWorkerUser
        });

        await referralController.createReferral(createReq, createRes, (err) => { throw err; });
        assert.strictEqual(createRes.statusCode, 201);
        const draftRefId = createRes.jsonPayload.data.id;

        // Attempt to book appointment while referral is in TRIAGED state (not ACCEPTED)
        const { req, res } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                referral_id: draftRefId,
                appointment_date: '2027-03-01',
                time_slot: '02:00 PM'
            },
            user: healthWorkerUser
        });

        await appointmentController.bookAppointment(req, res);
        assert.strictEqual(res.statusCode, 409);
        assert.strictEqual(res.jsonPayload.code, 'INVALID_TRANSITION');
    });

    // 6. Decoupled Arrival Semantics: Cannot jump APPOINTMENT_BOOKED -> PATIENT_REACHED
    await test("6. Decoupled Arrival: APPOINTMENT_BOOKED cannot skip PATIENT_IN_TRANSIT (409 Conflict)", async () => {
        const { req, res } = createMockReqRes({
            params: { id: createdReferralId },
            body: {
                to_status: REFERRAL_STATES.PATIENT_REACHED,
                reason: 'Patient says they arrived early'
            },
            user: facilityStaffUser
        });

        await referralController.updateStatus(req, res, (err) => { throw err; });
        assert.strictEqual(res.statusCode, 409);
        assert.strictEqual(res.jsonPayload.code, 'INVALID_TRANSITION');

        // Valid transition sequence: APPOINTMENT_BOOKED -> PATIENT_IN_TRANSIT -> PATIENT_REACHED
        const { req: transitReq, res: transitRes } = createMockReqRes({
            params: { id: createdReferralId },
            body: {
                to_status: REFERRAL_STATES.PATIENT_IN_TRANSIT,
                reason: 'Ambulance / travel initiated'
            },
            user: healthWorkerUser
        });
        await referralController.updateStatus(transitReq, transitRes, (err) => { throw err; });
        assert.strictEqual(transitRes.statusCode, 200);
        assert.strictEqual(transitRes.jsonPayload.data.status, REFERRAL_STATES.PATIENT_IN_TRANSIT);

        const { req: reachReq, res: reachRes } = createMockReqRes({
            params: { id: createdReferralId },
            body: {
                to_status: REFERRAL_STATES.PATIENT_REACHED,
                reason: 'Patient arrived at triage counter'
            },
            user: facilityStaffUser
        });
        await referralController.updateStatus(reachReq, reachRes, (err) => { throw err; });
        assert.strictEqual(reachRes.statusCode, 200);
        assert.strictEqual(reachRes.jsonPayload.data.status, REFERRAL_STATES.PATIENT_REACHED);
    });

    // 7. Missed Appointment & Rebooking
    await test("7. Missed appointment records reason and allows subsequent rebooking", async () => {
        // Create fresh referral and bring to APPOINTMENT_BOOKED
        const { req: createReq, res: createRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                receiving_facility_id: facilityId,
                primary_complaint: 'Persistent cough',
                urgency: 'ROUTINE',
                risk_level: 'LOW'
            },
            user: healthWorkerUser
        });

        await referralController.createReferral(createReq, createRes, (err) => { throw err; });
        const refId = createRes.jsonPayload.data.id;

        await transitionReferral({
            referralId: refId,
            toStatus: REFERRAL_STATES.ACCEPTED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Accepted'
        });

        const missDate = `2027-04-${String((uniqueNonce % 25) + 1).padStart(2, '0')}`;
        const missSlot = `MissSlot-${uniqueNonce}`;

        const { req: bookReq, res: bookRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                referral_id: refId,
                appointment_date: missDate,
                time_slot: missSlot
            },
            user: healthWorkerUser
        });
        await appointmentController.bookAppointment(bookReq, bookRes);
        assert.strictEqual(bookRes.statusCode, 201);
        const aptId = bookRes.jsonPayload.appointment.id;

        // Mark appointment as missed
        const { req: missReq, res: missRes } = createMockReqRes({
            params: { id: aptId },
            body: {
                referral_id: refId,
                reason: 'Patient was unable to arrange transport'
            },
            user: facilityStaffUser
        });
        await appointmentController.markMissedAppointment(missReq, missRes);
        assert.strictEqual(missRes.statusCode, 200);
        assert.strictEqual(missRes.jsonPayload.referral.status, REFERRAL_STATES.MISSED_APPOINTMENT);

        // Rebooking from MISSED_APPOINTMENT
        const rebookDate = `2027-04-${String(((uniqueNonce + 1) % 25) + 1).padStart(2, '0')}`;
        const rebookSlot = `RebookSlot-${uniqueNonce}`;

        const { req: rebookReq, res: rebookRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                referral_id: refId,
                appointment_date: rebookDate,
                time_slot: rebookSlot,
                reason: 'Rebooked after transport arranged'
            },
            user: healthWorkerUser
        });
        await appointmentController.bookAppointment(rebookReq, rebookRes);
        assert.strictEqual(rebookRes.statusCode, 201);
        assert.strictEqual(rebookRes.jsonPayload.referral.status, REFERRAL_STATES.APPOINTMENT_BOOKED);
    });

    // 8. Rescheduling & Cancellation
    await test("8. Reschedules to free slot successfully and cancels with reason", async () => {
        const schedDate1 = `2027-05-${String((uniqueNonce % 25) + 1).padStart(2, '0')}`;
        const schedDate2 = `2027-05-${String(((uniqueNonce + 1) % 25) + 1).padStart(2, '0')}`;
        const schedSlot1 = `SchedSlot1-${uniqueNonce}`;
        const schedSlot2 = `SchedSlot2-${uniqueNonce}`;

        // Book appointment
        const { req: bReq, res: bRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                doctor_id: doctorUser.id,
                appointment_date: schedDate1,
                time_slot: schedSlot1,
                reason: 'Consultation'
            },
            user: patientUser
        });
        await appointmentController.bookAppointment(bReq, bRes);
        assert.strictEqual(bRes.statusCode, 201);
        const aptId = bRes.jsonPayload.appointment.id;

        // Reschedule
        const { req: reschedReq, res: reschedRes } = createMockReqRes({
            params: { id: aptId },
            body: {
                new_date: schedDate2,
                new_slot: schedSlot2,
                reason: 'Doctor requested change'
            },
            user: doctorUser
        });
        await appointmentController.rescheduleAppointment(reschedReq, reschedRes);
        assert.strictEqual(reschedRes.statusCode, 200);
        assert.strictEqual(reschedRes.jsonPayload.appointment.appointment_date, schedDate2);
        assert.strictEqual(reschedRes.jsonPayload.appointment.time_slot, schedSlot2);

        // Cancel
        const { req: cancelReq, res: cancelRes } = createMockReqRes({
            params: { id: aptId },
            body: {
                reason: 'Patient recovered and cancelled'
            },
            user: patientUser
        });
        await appointmentController.cancelAppointment(cancelReq, cancelRes);
        assert.strictEqual(cancelRes.statusCode, 200);
        assert.strictEqual(cancelRes.jsonPayload.appointment.status, 'cancelled');
    });

    console.log(`\n====================================================`);
    console.log(`PHASE 9 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runAppointmentTests().catch(err => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
});
