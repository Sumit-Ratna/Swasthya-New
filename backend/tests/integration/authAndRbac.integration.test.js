const assert = require('assert');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/env');
const authMiddleware = require('../../src/middleware/auth');
const {
    authorize,
    canAccessPatient,
    canAccessReferral,
    belongsToFacility,
    canManageCaregiverScope
} = require('../../src/middleware/authorize');

console.log('====================================================');
console.log('RUNNING PHASE 3 - AUTHENTICATION & RBAC TESTS');
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

function createMockReqRes({ headers = {}, user = null } = {}) {
    const req = {
        headers: { ...headers },
        header(name) { return this.headers[name.toLowerCase()] || this.headers[name]; },
        user,
        id: 'test-req-auth'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runAuthTests() {
    // 1. Anonymous Access Rejection
    await test('Anonymous request without token is rejected with 401 UNAUTHORIZED', async () => {
        const { req, res } = createMockReqRes();
        let nextCalled = false;

        await authMiddleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false, 'Next must not be called for anonymous request');
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.jsonPayload.code, 'UNAUTHORIZED');
    });

    // 2. Expired Token Rejection
    await test('Expired JWT token is rejected with 401 TOKEN_EXPIRED', async () => {
        const expiredToken = jwt.sign(
            { id: 'user-123', role: 'PATIENT' },
            config.jwtSecret,
            { expiresIn: '-10s' }
        );

        const { req, res } = createMockReqRes({
            headers: { authorization: `Bearer ${expiredToken}` }
        });
        let nextCalled = false;

        await authMiddleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.jsonPayload.code, 'TOKEN_EXPIRED');
    });

    // 3. Endpoint-Level RBAC (authorize middleware)
    await test('authorize middleware permits authorized roles and blocks forbidden roles', async () => {
        const doctorAuth = authorize('DOCTOR', 'ADMIN');

        // Patient trying to access doctor endpoint -> 403
        const { req: pReq, res: pRes } = createMockReqRes({ user: { id: 'p-1', role: 'PATIENT' } });
        let pNext = false;
        doctorAuth(pReq, pRes, () => { pNext = true; });
        assert.strictEqual(pNext, false);
        assert.strictEqual(pRes.statusCode, 403);
        assert.strictEqual(pRes.jsonPayload.code, 'FORBIDDEN');

        // Doctor accessing doctor endpoint -> 200/Next
        const { req: dReq, res: dRes } = createMockReqRes({ user: { id: 'd-1', role: 'DOCTOR' } });
        let dNext = false;
        doctorAuth(dReq, dRes, () => { dNext = true; });
        assert.strictEqual(dNext, true);

        // Admin accessing doctor endpoint -> 200/Next (Bypass)
        const { req: aReq, res: aRes } = createMockReqRes({ user: { id: 'a-1', role: 'ADMIN' } });
        let aNext = false;
        doctorAuth(aReq, aRes, () => { aNext = true; });
        assert.strictEqual(aNext, true);
    });

    // 4. Resource Authorization: Patient Ownership
    await test('canAccessPatient validates patient identity and admin oversight', async () => {
        const patientUser = { id: 'pat-99', role: 'PATIENT' };
        const otherPatient = { id: 'pat-88', role: 'PATIENT' };
        const adminUser = { id: 'adm-01', role: 'ADMIN' };

        assert.strictEqual(await canAccessPatient(patientUser, 'pat-99'), true);
        assert.strictEqual(await canAccessPatient(otherPatient, 'pat-99'), false);
        assert.strictEqual(await canAccessPatient(adminUser, 'pat-99'), true);
    });

    // 5. Resource Authorization: Facility Scope
    await test('belongsToFacility restricts staff to assigned facility ID', async () => {
        const staffNashik = { id: 'st-1', role: 'FACILITY_STAFF', assigned_facility_id: 'fac-nashik' };
        const admin = { id: 'adm-1', role: 'ADMIN' };

        assert.strictEqual(belongsToFacility(staffNashik, 'fac-nashik'), true);
        assert.strictEqual(belongsToFacility(staffNashik, 'fac-pune'), false);
        assert.strictEqual(belongsToFacility(admin, 'fac-pune'), true);
    });

    // 6. Resource Authorization: Referral Scope
    await test('canAccessReferral restricts access to patient, receiving facility, or admin', async () => {
        const referral = {
            id: 'ref-1',
            patient_id: 'pat-10',
            receiving_facility_id: 'fac-100',
            referring_user_id: 'hw-5'
        };

        assert.strictEqual(await canAccessReferral({ id: 'pat-10', role: 'PATIENT' }, referral), true);
        assert.strictEqual(await canAccessReferral({ id: 'pat-20', role: 'PATIENT' }, referral), false);
        assert.strictEqual(await canAccessReferral({ id: 'hw-5', role: 'HEALTH_WORKER' }, referral), true);
        assert.strictEqual(await canAccessReferral({ id: 'doc-1', role: 'DOCTOR', assigned_facility_id: 'fac-100' }, referral), true);
        assert.strictEqual(await canAccessReferral({ id: 'doc-2', role: 'DOCTOR', assigned_facility_id: 'fac-200' }, referral), false);
    });

    console.log('\n----------------------------------------------------');
    console.log(`TOTAL PHASE 3 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('----------------------------------------------------');

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runAuthTests();
