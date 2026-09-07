/**
 * Phase 16: Multi-Branch End-to-End Referral Workflow Test Suite
 * 
 * Verifies all clinical execution branches:
 * 1. Routine Referral & Closed-Loop Care (10-state lifecycle)
 * 2. Emergency Immediate Triage Bypass
 * 3. Facility Capacity Exhaustion & Rerouting Lifecycle
 * 4. Appointment Cancellation with Mandatory Reason Audit
 * 5. Missed Appointment & Rebooking Flow
 * 6. Diagnostics & Lab Branching Flow
 */

const assert = require('assert');
const crypto = require('crypto');
const localDb = require('../../src/services/localDb');
const { transitionReferral, REFERRAL_STATES } = require('../../src/domain/referralStateMachine');

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${err.message}`);
        console.error(err.stack);
        throw err;
    }
}

async function runMultiBranchE2ETests() {
    console.log('\n====================================================');
    console.log('RUNNING E2E MULTI-BRANCH REFERRAL WORKFLOW TESTS');
    console.log('====================================================\n');

    const testPatientId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const testFacilityIdA = '11111111-1111-1111-1111-111111111111';
    const testFacilityIdB = '22222222-2222-2222-2222-222222222222';
    const testDoctorId = '44444444-4444-4444-4444-444444444444';

    // Branch 1: Routine Referral & Closed-Loop Care (Full 10-state progression)
    await test('Branch 1: Routine Referral & Closed Loop Care (10 states complete)', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityIdA,
            status: REFERRAL_STATES.FACILITY_SELECTED,
            risk_level: 'MODERATE',
            urgency: 'ROUTINE',
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        // 1. ACCEPTED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.ACCEPTED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF' });
        // 2. APPOINTMENT_BOOKED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF', reason: 'Slot #42 booked' });
        // 3. PATIENT_IN_TRANSIT
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT, actorUserId: testPatientId, actorRole: 'PATIENT' });
        // 4. PATIENT_REACHED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.PATIENT_REACHED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF' });
        // 5. DOCTOR_ASSIGNED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF', assignedDoctorId: testDoctorId });
        // 6. CONSULTATION_COMPLETED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'Initial consult complete' });
        // 7. TREATMENT_COMPLETED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.TREATMENT_COMPLETED, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'Treatment prescribed' });
        // 8. FOLLOW_UP_PENDING
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.FOLLOW_UP_PENDING, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'ASHA follow up needed in 7 days' });
        // 9. FOLLOW_UP_COMPLETED
        const finalResult = await transitionReferral({ referralId, toStatus: REFERRAL_STATES.FOLLOW_UP_COMPLETED, actorUserId: 'worker-1', actorRole: 'HEALTH_WORKER', reason: 'Vitals stable on day 7 visit' });

        assert.strictEqual(finalResult.toStatus, REFERRAL_STATES.FOLLOW_UP_COMPLETED);
    });

    // Branch 2: Emergency Immediate Triage Bypass
    await test('Branch 2: Emergency Triage directly advances to arrival and consultation', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityIdA,
            status: REFERRAL_STATES.FACILITY_SELECTED,
            risk_level: 'CRITICAL',
            urgency: 'EMERGENCY',
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        // Emergency fast-track: ACCEPTED -> PATIENT_IN_TRANSIT (immediate emergency transit) -> PATIENT_REACHED
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.ACCEPTED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF' });
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT, actorUserId: testPatientId, actorRole: 'PATIENT', reason: 'Emergency 108 ambulance transit' });
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.PATIENT_REACHED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF', reason: 'Emergency ambulance arrival' });
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF', assignedDoctorId: testDoctorId });
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'Emergency physician examination complete' });
        const res = await transitionReferral({ referralId, toStatus: REFERRAL_STATES.TREATMENT_COMPLETED, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'Emergency resuscitation & stabilization successful' });

        assert.strictEqual(res.toStatus, REFERRAL_STATES.TREATMENT_COMPLETED);
    });

    // Branch 3: Facility Capacity Exhaustion & Rerouting
    await test('Branch 3: Overcapacity triggers REROUTING_REQUIRED and successful secondary facility transfer', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityIdA,
            status: REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING,
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        // Facility A diverts / capacity full
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.REROUTING_REQUIRED, actorUserId: 'staff-1', actorRole: 'FACILITY_STAFF', reason: 'Facility A ICU at full capacity' });
        
        // Rerouted to Facility B
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.FACILITY_SELECTED, actorUserId: 'worker-1', actorRole: 'HEALTH_WORKER', reason: `Transfer to ${testFacilityIdB}` });
        const res = await transitionReferral({ referralId, toStatus: REFERRAL_STATES.ACCEPTED, actorUserId: 'staff-2', actorRole: 'FACILITY_STAFF' });

        assert.strictEqual(res.toStatus, REFERRAL_STATES.ACCEPTED);
    });

    // Branch 4: Patient Appointment Cancellation with Mandatory Reason
    await test('Branch 4: Appointment cancellation records reason and advances to CANCELLED', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityIdA,
            status: REFERRAL_STATES.APPOINTMENT_BOOKED,
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        const res = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.CANCELLED,
            actorUserId: testPatientId,
            actorRole: 'PATIENT',
            reason: 'Patient symptoms resolved, unable to travel'
        });

        assert.strictEqual(res.toStatus, REFERRAL_STATES.CANCELLED);
    });

    // Branch 5: Missed Appointment & Rebooking
    await test('Branch 5: Missed appointment allows subsequent rebooking', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityIdA,
            status: REFERRAL_STATES.APPOINTMENT_BOOKED,
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        // Patient missed slot
        await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.MISSED_APPOINTMENT,
            actorUserId: 'staff-1',
            actorRole: 'FACILITY_STAFF',
            reason: 'Patient did not arrive within 4-hour window'
        });

        // Rebooked
        const res = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorUserId: 'staff-1',
            actorRole: 'FACILITY_STAFF',
            reason: 'Rebooked for next Tuesday 11:00 AM'
        });

        assert.strictEqual(res.toStatus, REFERRAL_STATES.APPOINTMENT_BOOKED);
    });

    // Branch 6: Diagnostics & Lab Branching
    await test('Branch 6: Diagnostics branching flow (CONSULTATION -> DIAGNOSTICS -> TREATMENT)', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityIdA,
            status: REFERRAL_STATES.DOCTOR_ASSIGNED,
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED, actorUserId: testDoctorId, actorRole: 'DOCTOR' });
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.DIAGNOSTICS_PENDING, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'Ordered Ultrasound & CBC' });
        await transitionReferral({ referralId, toStatus: REFERRAL_STATES.DIAGNOSTICS_COMPLETED, actorUserId: 'lab-tech-1', actorRole: 'FACILITY_STAFF', reason: 'Ultrasound report attached' });
        const res = await transitionReferral({ referralId, toStatus: REFERRAL_STATES.TREATMENT_COMPLETED, actorUserId: testDoctorId, actorRole: 'DOCTOR', reason: 'Prescribed medication based on ultrasound' });

        assert.strictEqual(res.toStatus, REFERRAL_STATES.TREATMENT_COMPLETED);
    });

    console.log('\n====================================================');
    console.log('E2E MULTI-BRANCH WORKFLOW TEST SUMMARY: 6 Passed, 0 Failed');
    console.log('====================================================\n');
}

if (require.main === module) {
    runMultiBranchE2ETests()
        .catch(err => {
            console.error('Test run failed:', err);
            process.exit(1);
        });
}

module.exports = runMultiBranchE2ETests;
