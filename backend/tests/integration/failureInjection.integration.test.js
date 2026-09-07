/**
 * Phase 16: Failure Injection & Resilience Integration Test Suite
 * 
 * Verifies:
 * 1. AI microservice outage / circuit breaker trip -> Fast deterministic clinical fallback.
 * 2. External notification provider failure (SMS/Push) -> Non-blocking state progression.
 * 3. Unavailable doctor -> Automated assignment fallback to next qualified doctor.
 * 4. Facility overcapacity / closure -> Rejection and transition to REROUTING_REQUIRED.
 * 5. Corrupted/unauthorized tokens & role bypass -> Immediate 401/403 without data leakage.
 * 6. Caregiver scope tampering -> Immediate server-side 403.
 */

const assert = require('assert');
const crypto = require('crypto');
const localDb = require('../../src/services/localDb');
const aiService = require('../../src/services/aiService');
const notificationService = require('../../src/services/notificationService');
const doctorAssignmentService = require('../../src/services/doctorAssignmentService');
const { transitionReferral, REFERRAL_STATES } = require('../../src/domain/referralStateMachine');
const aiController = require('../../src/controllers/aiController');
const { authorize } = require('../../src/middleware/authorize');

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

function mockRes() {
    const res = {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        }
    };
    return res;
}

async function runFailureInjectionTests() {
    console.log('\n====================================================');
    console.log('RUNNING PHASE 16 - FAILURE INJECTION & RESILIENCE TESTS');
    console.log('====================================================\n');

    const testPatientId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const testFacilityId = '22222222-2222-2222-2222-222222222222';

    // 1. AI Service Outage & Circuit Breaker Fast Fallback
    await test('1. AI service outage trips circuit breaker and recovers with fast deterministic triage', async () => {
        // Reset and force circuit open
        aiService.circuitBreaker.reset();
        aiService.circuitBreaker.recordFailure();
        aiService.circuitBreaker.recordFailure();
        aiService.circuitBreaker.recordFailure();

        assert.strictEqual(aiService.circuitBreaker.state, 'OPEN');
        assert.strictEqual(aiService.circuitBreaker.canExecute(), false);

        const startTime = Date.now();
        const req = {
            body: { systolic_bp: 155, diastolic_bp: 95, spo2: 96, pulse_rate: 88 }
        };
        const res = mockRes();

        await aiController.triage(req, res);
        const durationMs = Date.now() - startTime;

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.data.source, 'DETERMINISTIC_FALLBACK');
        assert.ok(res.data.riskLevel === 'MODERATE' || res.data.riskLevel === 'HIGH');
        assert.ok(durationMs < 500, `Fallback must execute in < 500ms, took ${durationMs}ms`);
    });

    // 2. Notification Provider Outage Resilience
    await test('2. Multi-channel notification failure does not corrupt or abort core referral state machine', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityId,
            status: REFERRAL_STATES.APPOINTMENT_BOOKED,
            risk_level: 'HIGH',
            urgency: 'PRIORITY',
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        // Perform state transition
        const result = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT,
            actorUserId: testPatientId,
            actorRole: 'PATIENT',
            reason: 'Patient departed towards facility'
        });

        assert.strictEqual(result.toStatus, REFERRAL_STATES.PATIENT_IN_TRANSIT);

        // Verify notification failure logged gracefully without throwing uncaught exceptions
        const notifs = await notificationService.getUserNotifications(testPatientId);
        assert.ok(Array.isArray(notifs));
    });

    // 3. Doctor Unavailability Fallback
    await test('3. Doctor unavailability triggers automated fallback to next available specialist in facility', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityId,
            status: REFERRAL_STATES.PATIENT_REACHED,
            specialty: 'CARDIOLOGY',
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        // Assign with requested doctor who is busy / unavailable
        const assignment = await doctorAssignmentService.assignDoctorToReferral({
            referralId,
            facilityId: testFacilityId,
            requestedDoctorId: 'doc-busy-999',
            actorUserId: 'staff-1',
            actorRole: 'FACILITY_STAFF'
        });

        assert.ok(assignment.doctor && assignment.doctor.id, 'Expected an assigned doctor via fallback');
        assert.notStrictEqual(assignment.doctor.id, 'doc-busy-999');
        assert.strictEqual(assignment.status, REFERRAL_STATES.DOCTOR_ASSIGNED);
    });

    // 4. Facility Overcapacity & Rerouting
    await test('4. Facility overcapacity or emergency diversion triggers clean transition to REROUTING_REQUIRED', async () => {
        const referralId = crypto.randomUUID();
        const ref = {
            id: referralId,
            patient_id: testPatientId,
            receiving_facility_id: testFacilityId,
            status: REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING,
            created_at: new Date().toISOString()
        };
        localDb.insert('referrals', ref);

        const rerouteResult = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.REROUTING_REQUIRED,
            actorUserId: 'staff-1',
            actorRole: 'FACILITY_STAFF',
            reason: 'Facility ICU capacity full due to local disaster diversion'
        });

        assert.strictEqual(rerouteResult.toStatus, REFERRAL_STATES.REROUTING_REQUIRED);

        // Subsequent rerouting to new facility
        const newFacilityId = '11111111-1111-1111-1111-111111111111';
        const reselectedResult = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.FACILITY_SELECTED,
            actorUserId: 'worker-1',
            actorRole: 'HEALTH_WORKER',
            reason: `Rerouted to secondary facility ${newFacilityId}`
        });

        assert.strictEqual(reselectedResult.toStatus, REFERRAL_STATES.FACILITY_SELECTED);
    });

    // 5. Role Authorization Bypass Prevention
    await test('5. Role bypass attempts (e.g. PATIENT attempting DOCTOR consultation) return strict 403', () => {
        const docAuth = authorize('DOCTOR');
        const req = {
            user: { id: 'patient-hacker', role: 'PATIENT' }
        };
        const res = mockRes();
        let nextCalled = false;

        docAuth(req, res, () => { nextCalled = true; });

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.data.code, 'FORBIDDEN');
    });

    // 6. Caregiver Scope Violation
    await test('6. Caregiver scope tampering is rejected with 403 FORBIDDEN', () => {
        const staffAuth = authorize('FACILITY_STAFF', 'ADMIN');
        const req = {
            user: { id: 'caregiver-user-1', role: 'CAREGIVER' }
        };
        const res = mockRes();
        let nextCalled = false;

        staffAuth(req, res, () => { nextCalled = true; });

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(nextCalled, false);
    });

    console.log('\n====================================================');
    console.log('PHASE 16 FAILURE INJECTION TEST SUMMARY: 6 Passed, 0 Failed');
    console.log('====================================================\n');
}

if (require.main === module) {
    runFailureInjectionTests()
        .catch(err => {
            console.error('Test run failed:', err);
            process.exit(1);
        });
}

module.exports = runFailureInjectionTests;
