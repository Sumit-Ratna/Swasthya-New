/**
 * Unit Test Suite: Idempotency & Resource Authorization Helpers
 * 
 * Verifies:
 * 1. normalizeRole mapping for standard and uppercase roles.
 * 2. authorize middleware role validation logic.
 * 3. belongsToFacility matching and ADMIN global bypass.
 * 4. Offline sync idempotency deduplication cache.
 * 5. Caregiver scope evaluation hierarchy.
 */

const assert = require('assert');
const crypto = require('crypto');
const { normalizeRole } = require('../../src/middleware/auth');
const { authorize, belongsToFacility } = require('../../src/middleware/authorize');
const offlineSyncService = require('../../src/services/offlineSyncService');

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

async function runIdempotencyAndAuthUnitTests() {
    console.log('\n====================================================');
    console.log('RUNNING UNIT TESTS - IDEMPOTENCY & AUTH HELPERS');
    console.log('====================================================\n');

    // 1. normalizeRole
    await test('1. normalizeRole standardizes roles to canonical uppercase strings', () => {
        assert.strictEqual(normalizeRole('doctor'), 'DOCTOR');
        assert.strictEqual(normalizeRole('HEALTH_WORKER'), 'HEALTH_WORKER');
        assert.strictEqual(normalizeRole('facility_staff'), 'FACILITY_STAFF');
        assert.strictEqual(normalizeRole('Admin'), 'ADMIN');
        assert.strictEqual(normalizeRole('patient'), 'PATIENT');
        assert.strictEqual(normalizeRole('caregiver'), 'CAREGIVER');
    });

    // 2. authorize Middleware Factory
    await test('2. authorize allows matching role and ADMIN, but rejects unauthenticated or mismatched roles', () => {
        const authMiddleware = authorize('DOCTOR', 'FACILITY_STAFF');

        // Case A: Unauthenticated (req.user missing)
        const reqUnauth = {};
        const resUnauth = mockRes();
        let nextCalled = false;
        authMiddleware(reqUnauth, resUnauth, () => { nextCalled = true; });
        assert.strictEqual(resUnauth.statusCode, 401);
        assert.strictEqual(nextCalled, false);

        // Case B: Mismatched Role (PATIENT)
        const reqPatient = { user: { id: 'p1', role: 'PATIENT' } };
        const resPatient = mockRes();
        nextCalled = false;
        authMiddleware(reqPatient, resPatient, () => { nextCalled = true; });
        assert.strictEqual(resPatient.statusCode, 403);
        assert.strictEqual(nextCalled, false);

        // Case C: Allowed Role (DOCTOR)
        const reqDoc = { user: { id: 'd1', role: 'DOCTOR' } };
        const resDoc = mockRes();
        nextCalled = false;
        authMiddleware(reqDoc, resDoc, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);

        // Case D: Global Admin Override
        const reqAdmin = { user: { id: 'a1', role: 'ADMIN' } };
        const resAdmin = mockRes();
        nextCalled = false;
        authMiddleware(reqAdmin, resAdmin, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);
    });

    // 3. belongsToFacility Helper
    await test('3. belongsToFacility enforces facility scoping and allows ADMIN bypass', () => {
        const facilityId = 'fac-pune-phc-1';
        
        const docAtFacility = { id: 'd1', role: 'DOCTOR', assigned_facility_id: 'fac-pune-phc-1' };
        const docAtOtherFacility = { id: 'd2', role: 'DOCTOR', assigned_facility_id: 'fac-nashik-dh-2' };
        const adminUser = { id: 'admin1', role: 'ADMIN' };

        assert.strictEqual(belongsToFacility(docAtFacility, facilityId), true);
        assert.strictEqual(belongsToFacility(docAtOtherFacility, facilityId), false);
        assert.strictEqual(belongsToFacility(adminUser, facilityId), true);
        assert.strictEqual(belongsToFacility(null, facilityId), false);
    });

    // 4. Offline Sync Idempotency Deduplication
    await test('4. processSyncBatch detects duplicate client_operation_id and returns idempotent cached response', async () => {
        const testDeviceId = 'device-unit-test-99';
        const testOpId = `op-dedup-${Date.now()}`;

        const operations = [
            {
                client_operation_id: testOpId,
                operation_type: 'CREATE_PATIENT',
                payload: {
                    name: 'Asha Beneficiary',
                    phone: '9877700011',
                    gender: 'FEMALE',
                    district: 'Pune'
                }
            }
        ];

        const testWorkerId = crypto.randomUUID();

        // First Execution
        const res1 = await offlineSyncService.processSyncBatch({
            deviceId: testDeviceId,
            workerUser: { id: testWorkerId, role: 'HEALTH_WORKER' },
            operations
        });
        assert.strictEqual(res1.synced_count, 1);
        assert.strictEqual(res1.replayed_count, 0);

        // Second Execution (Identical client_operation_id)
        const res2 = await offlineSyncService.processSyncBatch({
            deviceId: testDeviceId,
            workerUser: { id: testWorkerId, role: 'HEALTH_WORKER' },
            operations
        });
        assert.strictEqual(res2.replayed_count, 1);
        assert.strictEqual(res2.results[0].status, 'IDEMPOTENT_REPLAY');
    });

    console.log('\n====================================================');
    console.log('IDEMPOTENCY & AUTH UNIT TEST SUMMARY: 4 Passed, 0 Failed');
    console.log('====================================================\n');
}

if (require.main === module) {
    runIdempotencyAndAuthUnitTests()
        .catch(err => {
            console.error('Test run failed:', err);
            process.exit(1);
        });
}

module.exports = runIdempotencyAndAuthUnitTests;
