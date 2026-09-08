const assert = require('assert');
const familyController = require('../../src/controllers/familyController');
const proxyAuthorizationService = require('../../src/services/proxyAuthorizationService');
const localDb = require('../../src/services/localDb');

console.log("====================================================");
console.log("RUNNING FAMILY HEALTH EMAIL INVITATION INTEGRATION TESTS");
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
        headers: { ...headers }
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runFamilyEmailTests() {
    const timestamp = Date.now();
    const requester = {
        id: `user-req-${timestamp}`,
        name: 'Aditya Singh',
        email: `aditya.${timestamp}@test.com`,
        role: 'PATIENT'
    };

    const familyMember = {
        id: `user-fam-${timestamp}`,
        name: 'Pooja Singh',
        email: `pooja.${timestamp}@test.com`,
        role: 'PATIENT'
    };

    localDb.insert('users', requester);
    localDb.insert('users', familyMember);

    let invitationToken = null;
    let verificationCode = null;
    let invitationId = null;

    // Test 1: Send Family Member Email Invitation
    await test("1. User invites family member by email (returns pending state)", async () => {
        const { req, res } = createMockReqRes({
            body: {
                email: familyMember.email,
                relation: 'SISTER',
                permission_scope: 'REFERRAL_STATUS'
            },
            user: requester
        });

        await familyController.inviteFamilyMemberByEmail(req, res);
        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.invitation.status, 'PENDING');
        assert.strictEqual(res.jsonPayload.invitation.caregiver_email, familyMember.email);

        invitationId = res.jsonPayload.invitation.id;
        const record = localDb.findOne('family_invitations', inv => inv.id === invitationId);
        assert(record);
        invitationToken = record.invitation_token;
        verificationCode = record.verification_code;
    });

    // Test 2: Cannot invite oneself
    await test("2. Rejects self-invitation with clear error", async () => {
        const { req, res } = createMockReqRes({
            body: {
                email: requester.email,
                relation: 'SELF'
            },
            user: requester
        });

        await familyController.inviteFamilyMemberByEmail(req, res);
        assert.strictEqual(res.statusCode, 400);
    });

    // Test 3: Requester views pending invitations
    await test("3. Requester retrieves pending sent invitations", async () => {
        const { req, res } = createMockReqRes({
            user: requester
        });

        await familyController.getPendingInvitations(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert(Array.isArray(res.jsonPayload.sent));
        assert(res.jsonPayload.sent.some(inv => inv.caregiver_email === familyMember.email && inv.status === 'PENDING'));
    });

    // Test 4: Family Member inspects invitation by token
    await test("4. Recipient inspects invitation details via token preview", async () => {
        const { req, res } = createMockReqRes({
            params: { token: invitationToken }
        });

        await familyController.getInvitationDetailsByToken(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.requester_name, requester.name);
        assert.strictEqual(res.jsonPayload.relationship_type, 'SISTER');
        assert.strictEqual(res.jsonPayload.status, 'PENDING');
    });

    // Test 5: Family Member accepts invitation
    await test("5. Family member accepts connection via token (activates proxy relationship)", async () => {
        const { req, res } = createMockReqRes({
            body: { token: invitationToken },
            user: familyMember
        });

        await familyController.acceptFamilyInvitation(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.invitation.status, 'ACCEPTED');

        // Check active relationship in db
        const relationship = localDb.findOne('caregiver_relationships', r =>
            r.patient_id === requester.id &&
            (r.caregiver_user_id === familyMember.id || r.caregiver_id === familyMember.id)
        );
        assert(relationship);
        assert.strictEqual(relationship.status, 'ACTIVE');
    });

    // Test 6: Accepting already-used token is rejected
    await test("6. Rejects reuse of already accepted token", async () => {
        const { req, res } = createMockReqRes({
            body: { token: invitationToken },
            user: familyMember
        });

        await familyController.acceptFamilyInvitation(req, res);
        assert.strictEqual(res.statusCode, 400);
    });

    // Test 7: Duplicate connection prevention
    await test("7. Prevents sending invitation to already-connected family member", async () => {
        const { req, res } = createMockReqRes({
            body: {
                email: familyMember.email,
                relation: 'SISTER'
            },
            user: requester
        });

        await familyController.inviteFamilyMemberByEmail(req, res);
        assert.strictEqual(res.statusCode, 409);
    });

    console.log(`\n====================================================`);
    console.log(`FAMILY HEALTH EMAIL TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`====================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runFamilyEmailTests();
