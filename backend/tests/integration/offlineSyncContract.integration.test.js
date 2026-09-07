const assert = require('assert');
const ashaController = require('../../src/controllers/ashaController');
const offlineSyncService = require('../../src/services/offlineSyncService');
const referralController = require('../../src/controllers/referralController');
const { REFERRAL_STATES, transitionReferral } = require('../../src/domain/referralStateMachine');
const crypto = require('crypto');

console.log("====================================================");
console.log("RUNNING PHASE 13 - ASHA OFFLINE & SYNC CONTRACT TESTS");
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
        id: 'req-test-offline-sync'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runOfflineSyncTests() {
    const healthWorkerUser = {
        id: '77777777-7777-7777-7777-777777777777',
        role: 'HEALTH_WORKER',
        phone: '9800000001',
        name: 'Sunita Gaikwad'
    };

    const patientUser = {
        id: '99999999-9999-9999-9999-999999999999',
        role: 'PATIENT',
        phone: '9811122233',
        name: 'Sunita Sharma'
    };

    const deviceId = 'ASHA-TAB-PUNE-88';
    const clientOpId1 = crypto.randomUUID();
    const idempotencyKey1 = `IDEM-REG-${Date.now()}`;

    const clientOpId2 = crypto.randomUUID();
    const idempotencyKey2 = `IDEM-ASS-${Date.now()}`;

    let syncedPatientId = null;

    // 1. Offline Registration and Assessment Batch Sync
    await test("1. Offline Beneficiary Registration & Triage Sync processes queued writes", async () => {
        const batch = {
            device_id: deviceId,
            operations: [
                {
                    client_operation_id: clientOpId1,
                    idempotency_key: idempotencyKey1,
                    operation_type: 'CREATE_PATIENT',
                    local_created_at: new Date(Date.now() - 3600000).toISOString(),
                    payload: {
                        name: 'Asha Offline Test Beneficiary',
                        phone: '9844433322',
                        gender: 'Female',
                        age: 28,
                        address: 'Shirwal Wasti',
                        district: 'Pune'
                    }
                },
                {
                    client_operation_id: clientOpId2,
                    idempotency_key: idempotencyKey2,
                    operation_type: 'RECORD_ASSESSMENT',
                    local_created_at: new Date(Date.now() - 3500000).toISOString(),
                    payload: {
                        patient_phone: '9844433322',
                        systolic_bp: 145,
                        diastolic_bp: 95,
                        pulse_rate: 86,
                        spo2: 98,
                        temperature: 98.6,
                        is_pregnant: true
                    }
                }
            ]
        };

        const { req, res } = createMockReqRes({
            body: batch,
            user: healthWorkerUser
        });

        await ashaController.syncOfflineQueue(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.data.synced_count, 2);
        assert.strictEqual(res.jsonPayload.data.results[0].status, 'SYNCED');
        assert.strictEqual(res.jsonPayload.data.results[1].status, 'SYNCED');
        syncedPatientId = res.jsonPayload.data.results[0].server_id;
        assert(syncedPatientId);
    });

    // 2. Batch Idempotency: Retrying the identical sync batch is completely harmless and deterministic
    await test("2. Idempotent Replay: Retrying identical sync batch returns IDEMPOTENT_REPLAY without duplicates", async () => {
        const batch = {
            device_id: deviceId,
            operations: [
                {
                    client_operation_id: clientOpId1,
                    idempotency_key: idempotencyKey1,
                    operation_type: 'CREATE_PATIENT',
                    payload: { name: 'Asha Offline Test Beneficiary', phone: '9844433322' }
                },
                {
                    client_operation_id: clientOpId2,
                    idempotency_key: idempotencyKey2,
                    operation_type: 'RECORD_ASSESSMENT',
                    payload: { patient_phone: '9844433322', systolic_bp: 145, diastolic_bp: 95 }
                }
            ]
        };

        const { req, res } = createMockReqRes({
            body: batch,
            user: healthWorkerUser
        });

        await ashaController.syncOfflineQueue(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.data.replayed_count, 2);
        assert.strictEqual(res.jsonPayload.data.results[0].status, 'IDEMPOTENT_REPLAY');
        assert.strictEqual(res.jsonPayload.data.results[0].server_id, syncedPatientId);
    });

    // 3. Offline Referral Preparation
    let referralId = null;
    await test("3. Offline Referral Preparation creates canonical referral in FACILITY_SELECTED state", async () => {
        const opId = crypto.randomUUID();
        const facilityId = '22222222-2222-2222-2222-222222222222';

        const batch = {
            device_id: deviceId,
            operations: [
                {
                    client_operation_id: opId,
                    idempotency_key: `IDEM-REF-${opId}`,
                    operation_type: 'CREATE_REFERRAL',
                    payload: {
                        patient_id: patientUser.id,
                        receiving_facility_id: facilityId,
                        primary_complaint: 'Maternal severe headache and BP 150/98',
                        risk_level: 'HIGH',
                        urgency: 'HIGH',
                        specialty_required: 'OBSTETRICS'
                    }
                }
            ]
        };

        const { req, res } = createMockReqRes({
            body: batch,
            user: healthWorkerUser
        });

        await ashaController.syncOfflineQueue(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.data.synced_count, 1);
        referralId = res.jsonPayload.data.results[0].server_id;
        assert(referralId);
    });

    // 4. Anti-Last-Write-Wins: Queued state transition against progressed server state returns CONFLICT
    await test("4. Anti-Last-Write-Wins: Queued offline state mutation against drifted server state returns CONFLICT", async () => {
        // Move live server referral forward: FACILITY_SELECTED -> ACCEPTED -> APPOINTMENT_BOOKED
        const facilityStaffUser = { id: '66666666-6666-6666-6666-666666666666', role: 'FACILITY_STAFF' };
        await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.ACCEPTED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Facility accepted'
        });
        await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorUserId: facilityStaffUser.id,
            actorRole: 'FACILITY_STAFF',
            reason: 'Slot booked'
        });

        // Now offline ASHA tries to sync a stale transition that assumed the referral was still in TRIAGED
        const staleOpId = crypto.randomUUID();
        const batch = {
            device_id: deviceId,
            operations: [
                {
                    client_operation_id: staleOpId,
                    idempotency_key: `IDEM-TRANS-${staleOpId}`,
                    operation_type: 'TRANSITION_REFERRAL',
                    client_base_state: REFERRAL_STATES.TRIAGED, // Base state drifted! Server is APPOINTMENT_BOOKED
                    payload: {
                        referral_id: referralId,
                        to_status: REFERRAL_STATES.CANCELLED,
                        reason: 'Client tried to cancel based on stale local state'
                    }
                }
            ]
        };

        const { req, res } = createMockReqRes({
            body: batch,
            user: healthWorkerUser
        });

        await ashaController.syncOfflineQueue(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.data.conflict_count, 1);
        const conflictRes = res.jsonPayload.data.results[0];
        assert.strictEqual(conflictRes.status, 'CONFLICT');
        assert.strictEqual(conflictRes.conflict_code, 'STATE_DRIFT');
        assert.strictEqual(conflictRes.server_state, REFERRAL_STATES.APPOINTMENT_BOOKED);
        assert.strictEqual(conflictRes.client_base_state, REFERRAL_STATES.TRIAGED);
        assert.strictEqual(conflictRes.resolution_required, true);
    });

    // 5. Offline Cached Facility Directory Metadata
    await test("5. Offline Directory: Cached facilities include live_verified: false telemetry indicator", async () => {
        const { req, res } = createMockReqRes({
            query: { district: 'Pune' },
            user: healthWorkerUser
        });

        await ashaController.getOfflineDirectory(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert(Array.isArray(res.jsonPayload.data));
        assert(res.jsonPayload.data.length > 0);
        assert.strictEqual(res.jsonPayload.data[0].live_verified, false);
        assert(res.jsonPayload.data[0].telemetry_age_note);
    });

    // 6. Role Authorization: Non-health worker roles receive 403 UNAUTHORIZED_SYNC
    await test("6. Role Authorization: Unauthorized roles (e.g. PATIENT) rejected with 403", async () => {
        const { req, res } = createMockReqRes({
            body: {
                device_id: deviceId,
                operations: []
            },
            user: patientUser
        });

        await ashaController.syncOfflineQueue(req, res);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonPayload.code, 'UNAUTHORIZED_SYNC');
    });

    // 7. Granular Partial Failure Resilience
    await test("7. Partial Failure: Malformed operation in batch does not crash valid operations", async () => {
        const validOpId = crypto.randomUUID();
        const invalidOpId = crypto.randomUUID();

        const batch = {
            device_id: deviceId,
            operations: [
                {
                    client_operation_id: invalidOpId,
                    idempotency_key: `IDEM-INV-${invalidOpId}`,
                    operation_type: 'INVALID_UNKNOWN_OP',
                    payload: {}
                },
                {
                    client_operation_id: validOpId,
                    idempotency_key: `IDEM-REG-${validOpId}`,
                    operation_type: 'CREATE_PATIENT',
                    payload: { name: 'Valid Partial Sync Patient', phone: '9855544433' }
                }
            ]
        };

        const { req, res } = createMockReqRes({
            body: batch,
            user: healthWorkerUser
        });

        await ashaController.syncOfflineQueue(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.data.synced_count, 1);
        assert.strictEqual(res.jsonPayload.data.failed_count, 1);
        assert.strictEqual(res.jsonPayload.data.results[0].status, 'REJECTED');
        assert.strictEqual(res.jsonPayload.data.results[1].status, 'SYNCED');
    });

    console.log(`\n====================================================`);
    console.log(`PHASE 13 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runOfflineSyncTests().catch(err => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
});
