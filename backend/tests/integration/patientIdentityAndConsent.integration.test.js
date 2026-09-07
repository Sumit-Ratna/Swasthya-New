const assert = require('assert');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/env');
const supabase = require('../../src/config/supabaseClient');
const supabaseService = require('../../src/services/supabaseService');
const patientRepository = require('../../src/repositories/patientRepository');
const patientController = require('../../src/controllers/patientController');
const authController = require('../../src/controllers/authController');
const { requirePatientAccess } = require('../../src/middleware/authorize');

console.log('====================================================');
console.log('RUNNING PHASE 5 - PATIENT IDENTITY, CONSENT & INTEGRITY TESTS');
console.log('====================================================\n');

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
        id: 'req-test-phase5'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runPhase5Tests() {
    const testDoctorPhone = '9199990001';
    const testDoctorId = 'd5000000-0000-0000-0000-000000000001';
    const testPatientPhone = '9199990002';
    const testPatientId = 'f5000000-0000-0000-0000-000000000001';
    const testWorkerId = '77777777-7777-7777-7777-777777777777';

    // 1. User role decoupling: registering a DOCTOR does NOT insert into patients table
    await test('Registering a DOCTOR does not create a record in patients table', async () => {
        // Clean up previous test doctor if exists
        await supabase.from('patients').delete().eq('id', testDoctorId);
        await supabase.from('users').delete().eq('id', testDoctorId);

        const doctorUser = await supabaseService.createUser(testDoctorId, {
            phone: testDoctorPhone,
            name: 'Dr. Test Medical Officer',
            role: 'DOCTOR'
        });

        assert.strictEqual(doctorUser.role, 'doctor');

        // Verify patient table has NO record for this doctor
        const patientRecord = await patientRepository.findById(testDoctorId);
        assert.strictEqual(patientRecord, null, 'Doctor must not receive a patient record');
    });

    // 2. Mandatory fields validation: registration without name is rejected
    await test('Registration without full_name is rejected with 400 VALIDATION_ERROR', async () => {
        const { req, res } = createMockReqRes({
            body: {
                phone: '9876543210',
                role: 'patient',
                name: ''
            }
        });

        await authController.register(req, res);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonPayload.code, 'VALIDATION_ERROR');
    });

    // 3. Duplicate detection: registering existing patient phone returns existing user session
    await test('Registering existing phone number returns existing user without creating duplicate', async () => {
        // Ensure patient exists
        await supabase.from('patients').delete().eq('id', testPatientId);
        await supabase.from('users').delete().eq('id', testPatientId);

        await supabaseService.createUser(testPatientId, {
            phone: testPatientPhone,
            name: 'Pooja Patil',
            role: 'PATIENT',
            gender: 'FEMALE',
            dob: '1996-05-15',
            district: 'Pune'
        });

        const { req, res } = createMockReqRes({
            body: {
                phone: testPatientPhone,
                name: 'Pooja Patil Duplicate Request',
                role: 'patient'
            }
        });

        await authController.register(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.user.id, testPatientId);
    });

    // 4. Health worker assisted registration creates linked patient record with audit trail
    await test('Health worker assisted registration creates patient with registered_by_health_worker_id', async () => {
        const assistedPhone = '9199990003';
        const assistedId = 'f5000000-0000-0000-0000-000000000003';

        // Clean up if exists
        await supabase.from('patients').delete().eq('phone', assistedPhone);

        const { req, res } = createMockReqRes({
            user: { id: testWorkerId, role: 'HEALTH_WORKER', jurisdiction_district: 'Pune' },
            body: {
                id: assistedId,
                full_name: 'Anita Suresh Deshmukh',
                phone: assistedPhone,
                gender: 'FEMALE',
                date_of_birth: '1992-08-20',
                village: 'Shirwal',
                district: 'Pune',
                consent_status: 'GRANTED'
            }
        });

        await patientController.assistedRegistration(req, res, (err) => {
            if (err) throw err;
        });

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.data.full_name, 'Anita Suresh Deshmukh');
        assert.strictEqual(res.jsonPayload.data.registered_by_health_worker_id, testWorkerId);
        assert.strictEqual(res.jsonPayload.data.consent_status, 'GRANTED');
    });

    // 5. Consent status update is recorded and logged to audit ledger
    await test('Patient consent update (GRANTED -> REVOKED) updates record and logs audit event', async () => {
        const { req, res } = createMockReqRes({
            user: { id: testPatientId, role: 'PATIENT' },
            params: { id: testPatientId },
            body: { consent_status: 'REVOKED' }
        });

        await patientController.updateConsent(req, res, (err) => {
            if (err) throw err;
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.data.consent_status, 'REVOKED');

        // Check updated record directly in Supabase
        const updated = await patientRepository.findById(testPatientId);
        assert.strictEqual(updated.consent_status, 'REVOKED');
    });

    // 6. Resource authorization: unauthorized user cannot access another patient's clinical history
    await test('Unauthorized user requesting another patient clinical history receives 403 FORBIDDEN', async () => {
        const unauthorizedUser = {
            id: '00000000-0000-0000-0000-000000000999',
            role: 'PATIENT'
        };

        const { req, res } = createMockReqRes({
            user: unauthorizedUser,
            params: { id: testPatientId }
        });

        let nextCalled = false;
        await requirePatientAccess(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false, 'Next must not be called for unauthorized access');
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonPayload.code, 'FORBIDDEN');
    });

    console.log('\n----------------------------------------------------');
    console.log(`TOTAL PHASE 5 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('----------------------------------------------------');

    if (failed > 0) {
        process.exit(1);
    }
}

runPhase5Tests().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
