const assert = require('assert');
const caregiverController = require('../../src/controllers/caregiverController');
const proxyAuthorizationService = require('../../src/services/proxyAuthorizationService');
const referralController = require('../../src/controllers/referralController');
const localDb = require('../../src/services/localDb');

console.log("====================================================");
console.log("RUNNING PHASE 12 - CAREGIVER & FAMILY PROXY TESTS");
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
        id: 'req-test-proxy-auth'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runProxyAuthTests() {
    const patientUser = {
        id: '99999999-9999-9999-9999-999999999999',
        role: 'PATIENT',
        phone: '9811122233',
        name: 'Sunita Sharma'
    };

    const caregiverUser = {
        id: '66666666-6666-6666-6666-666666666666',
        role: 'CAREGIVER',
        phone: '9800000004',
        name: 'Ramesh Patil (Caregiver)'
    };

    const unrelatedPatientUser = {
        id: '11111111-aaaa-1111-aaaa-111111111111',
        role: 'PATIENT',
        phone: '9800000005',
        name: 'Unrelated Patient'
    };

    let createdLinkId = null;

    // 1. Patient grants proxy access with scope REFERRAL_STATUS
    await test("1. Patient grants proxy access with explicit scope 'REFERRAL_STATUS'", async () => {
        const { req, res } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                caregiver_user_id: caregiverUser.id,
                relationship_type: 'DAUGHTER',
                permission_scope: 'REFERRAL_STATUS'
            },
            user: patientUser
        });

        await caregiverController.linkPatient(req, res);
        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.jsonPayload.data.permission_scope, 'REFERRAL_STATUS');
        assert.strictEqual(res.jsonPayload.data.status, 'ACTIVE');
        createdLinkId = res.jsonPayload.data.id;
    });

    // 2. Caregiver accesses patient referrals within granted scope
    await test("2. Caregiver successfully queries patient referrals under 'REFERRAL_STATUS' scope", async () => {
        const { req, res } = createMockReqRes({
            params: { patientId: patientUser.id },
            user: caregiverUser
        });

        await caregiverController.getPatientReferrals(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert(Array.isArray(res.jsonPayload.data));
    });

    // 3. Caregiver is rejected when requesting clinical documents without SELECTED_RECORDS scope (403)
    await test("3. Caregiver denied clinical document access without 'SELECTED_RECORDS' scope (403 SCOPE_UNAUTHORIZED)", async () => {
        const { req, res } = createMockReqRes({
            params: { patientId: patientUser.id },
            user: caregiverUser
        });

        await caregiverController.getPatientDocuments(req, res);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonPayload.code, 'SCOPE_UNAUTHORIZED');
    });

    // 4. Patient updates scope to SELECTED_RECORDS; caregiver now accesses clinical documents
    await test("4. Patient grants 'SELECTED_RECORDS' scope and caregiver accesses clinical documents", async () => {
        // Upgrade scope
        const { req: upReq, res: upRes } = createMockReqRes({
            body: {
                patient_id: patientUser.id,
                caregiver_user_id: caregiverUser.id,
                relationship_type: 'DAUGHTER',
                permission_scope: 'SELECTED_RECORDS'
            },
            user: patientUser
        });
        await caregiverController.linkPatient(upReq, upRes);
        assert.strictEqual(upRes.statusCode, 201);

        // Fetch documents now
        const { req: docReq, res: docRes } = createMockReqRes({
            params: { patientId: patientUser.id },
            user: caregiverUser
        });
        await caregiverController.getPatientDocuments(docReq, docRes);
        assert.strictEqual(docRes.statusCode, 200);
        assert(Array.isArray(docRes.jsonPayload.data));
    });

    // 5. Patient revokes proxy access; revocation takes effect server-side immediately (403 PROXY_REVOKED)
    await test("5. Patient revokes proxy access; immediate server-side enforcement rejects subsequent requests (403)", async () => {
        const { req: revReq, res: revRes } = createMockReqRes({
            params: { id: createdLinkId },
            body: { reason: 'Patient changed caregiver' },
            user: patientUser
        });
        await caregiverController.revokePatientLink(revReq, revRes);
        assert.strictEqual(revRes.statusCode, 200);
        assert.strictEqual(revRes.jsonPayload.data.status, 'REVOKED');

        // Caregiver attempts to fetch referrals post-revocation
        const { req: pReq, res: pRes } = createMockReqRes({
            params: { patientId: patientUser.id },
            user: caregiverUser
        });
        await caregiverController.getPatientReferrals(pReq, pRes);
        assert.strictEqual(pRes.statusCode, 403);
        assert.strictEqual(pRes.jsonPayload.code, 'PROXY_REVOKED');
    });

    // 6. Caregiver cannot discover or query unrelated patients (isolation)
    await test("6. Strict isolation: Caregiver cannot query unrelated patient without relationship (403 PROXY_NOT_LINKED)", async () => {
        const { req, res } = createMockReqRes({
            params: { patientId: unrelatedPatientUser.id },
            user: caregiverUser
        });

        await caregiverController.getPatientReferrals(req, res);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonPayload.code, 'PROXY_NOT_LINKED');
    });

    // 7. Clinical Role Isolation: Caregiver cannot perform clinician actions (e.g. complete consultation)
    await test("7. Clinical Role Isolation: Caregiver cannot perform clinician actions (403 DOCTOR_UNAUTHORIZED)", async () => {
        const { req, res } = createMockReqRes({
            params: { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
            body: {
                diagnosis: 'Caregiver self diagnosis',
                clinical_summary: 'Not allowed'
            },
            user: caregiverUser
        });

        await referralController.completeConsultation(req, res);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonPayload.code, 'DOCTOR_UNAUTHORIZED');
    });

    console.log(`\n====================================================`);
    console.log(`PHASE 12 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runProxyAuthTests().catch(err => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
});
