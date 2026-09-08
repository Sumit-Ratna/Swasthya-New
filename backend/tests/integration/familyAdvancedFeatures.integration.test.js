const assert = require('assert');
const familyController = require('../../src/controllers/familyController');
const documentController = require('../../src/controllers/documentController');
const proxyAuthorizationService = require('../../src/services/proxyAuthorizationService');
const localDb = require('../../src/services/localDb');

console.log("====================================================");
console.log("RUNNING ADVANCED FAMILY FEATURES INTEGRATION TESTS");
console.log("====================================================");

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(err);
        process.exit(1);
    }
}

function mockRes() {
    return {
        statusCode: 200,
        jsonPayload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.jsonPayload = data;
            return this;
        }
    };
}

async function runAdvancedFamilyTests() {
    const primaryUser = {
        id: 'usr-parent-' + Date.now(),
        role: 'PATIENT',
        email: `parent.${Date.now()}@test.com`,
        phone: '9888800001',
        name: 'Aarav Sharma'
    };

    const caregiverUser = {
        id: 'usr-caregiver-' + Date.now(),
        role: 'CAREGIVER',
        email: `caregiver.${Date.now()}@test.com`,
        phone: '9888800002',
        name: 'Neha Sharma'
    };

    localDb.insert('users', primaryUser);
    localDb.insert('users', caregiverUser);

    // Link caregiver to primaryUser with SELECTED_RECORDS scope
    await proxyAuthorizationService.grantProxyAccess({
        patientId: primaryUser.id,
        caregiverUserId: caregiverUser.id,
        relationshipType: 'SPOUSE',
        permissionScope: 'SELECTED_RECORDS',
        requestingUser: primaryUser
    });

    // -------------------------------------------------------------
    // Test 1: Granular Per-Record Consent & Privacy Controls
    // -------------------------------------------------------------
    let doc1Id = 'doc-test-1-' + Date.now();
    let doc2Id = 'doc-test-2-' + Date.now();

    localDb.insert('documents', {
        id: doc1Id,
        patient_id: primaryUser.id,
        type: 'lab_report',
        summary: 'General Health Blood Count',
        extracted_data: { hidden_from_family: false },
        created_at: new Date().toISOString()
    });

    localDb.insert('documents', {
        id: doc2Id,
        patient_id: primaryUser.id,
        type: 'lab_report',
        summary: 'Sensitive Confidential Screening',
        extracted_data: { hidden_from_family: true },
        created_at: new Date().toISOString()
    });

    await test("1. Patient toggles document family privacy (hidden_from_family)", async () => {
        const req = {
            params: { id: doc1Id },
            body: { hidden_from_family: true },
            user: primaryUser
        };
        const res = mockRes();
        await documentController.toggleFamilyVisibility(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.hidden_from_family, true);

        // Toggle back to visible
        const req2 = {
            params: { id: doc1Id },
            body: { hidden_from_family: false },
            user: primaryUser
        };
        const res2 = mockRes();
        await documentController.toggleFamilyVisibility(req2, res2);
        assert.strictEqual(res2.jsonPayload.hidden_from_family, false);
    });

    await test("2. Caregiver proxy only sees records that are NOT hidden from family", async () => {
        const req = {
            params: { patient_id: primaryUser.id },
            user: caregiverUser
        };
        const res = mockRes();
        await documentController.getDocuments(req, res);

        assert.strictEqual(res.statusCode, 200);
        const docs = res.jsonPayload;
        // doc1 should be visible, doc2 (confidential) must be filtered out
        assert(docs.some(d => d.id === doc1Id));
        assert(!docs.some(d => d.id === doc2Id));
    });

    await test("3. Non-owner cannot toggle family visibility (403)", async () => {
        const req = {
            params: { id: doc1Id },
            body: { hidden_from_family: true },
            user: caregiverUser
        };
        const res = mockRes();
        await documentController.toggleFamilyVisibility(req, res);

        assert.strictEqual(res.statusCode, 403);
    });

    // -------------------------------------------------------------
    // Test 2: Child & Elder Dependent Profiles (Managed Accounts)
    // -------------------------------------------------------------
    let createdDepId = null;

    await test("4. Parent creates managed Child dependent profile without email", async () => {
        const req = {
            user: primaryUser,
            body: {
                full_name: 'Reyansh Sharma',
                relation: 'SON',
                dob: '2020-05-15',
                gender: 'Male',
                blood_group: 'B+',
                allergies: ['Peanuts'],
                medical_conditions: ['Mild Asthma']
            }
        };
        const res = mockRes();
        await familyController.createDependentProfile(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.dependent.full_name, 'Reyansh Sharma');
        assert.strictEqual(res.jsonPayload.dependent.managed_by_user_id, primaryUser.id);
        createdDepId = res.jsonPayload.dependent.id;
    });

    await test("5. Primary user fetches list of managed dependents", async () => {
        const req = { user: primaryUser };
        const res = mockRes();
        await familyController.getDependentsList(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert(res.jsonPayload.dependents.some(d => d.id === createdDepId));
    });

    await test("6. Primary user updates managed dependent profile details", async () => {
        const req = {
            params: { dependentId: createdDepId },
            user: primaryUser,
            body: {
                blood_group: 'O+',
                medical_history: { allergies: ['Peanuts', 'Dust'] }
            }
        };
        const res = mockRes();
        await familyController.updateDependentProfile(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.dependent.blood_group, 'O+');
    });

    // -------------------------------------------------------------
    // Test 3: Multi-Channel Dispatch (SMS & WhatsApp Integration)
    // -------------------------------------------------------------
    await test("7. User dispatches SMS invitation with 6-digit code", async () => {
        const req = {
            user: primaryUser,
            body: {
                phone: '9876543210',
                relation: 'Mother',
                permission_scope: 'REFERRAL_STATUS'
            }
        };
        const res = mockRes();
        await familyController.inviteFamilyMemberByPhone(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.jsonPayload.success, true);
        assert(res.jsonPayload.invitation.verification_code.length === 6);
    });

    await test("8. Generates formatted WhatsApp share payload with dynamic link", async () => {
        const req = {
            user: primaryUser,
            query: {
                phone: '9876543210',
                relation: 'Father',
                code: '654321',
                token: 'tok_test_123'
            }
        };
        const res = mockRes();
        await familyController.getWhatsAppInvitePayload(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert(res.jsonPayload.whatsappUrl.includes('wa.me'));
        assert(res.jsonPayload.shareText.includes('654321'));
    });

    // -------------------------------------------------------------
    // Test 4: Family Activity Feed & Real-Time Care Alerts
    // -------------------------------------------------------------
    await test("9. Aggregates live family activity feed across appointments and referrals", async () => {
        // Insert a mock appointment and referral for dependent
        localDb.insert('appointments', {
            id: 'apt-dep-1',
            patient_id: createdDepId,
            department: 'Pediatrics',
            appointment_date: new Date().toISOString(),
            status: 'CONFIRMED'
        });

        localDb.insert('referrals', {
            id: 'ref-dep-1',
            patient_id: createdDepId,
            primary_complaint: 'Routine Child Immunization',
            urgency: 'ROUTINE',
            status: 'ACCEPTED',
            created_at: new Date().toISOString()
        });

        const req = { user: primaryUser };
        const res = mockRes();
        await familyController.getFamilyActivityFeed(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert(res.jsonPayload.activities.length >= 2);
        assert(res.jsonPayload.activities.some(a => a.type === 'APPOINTMENT' && a.member_id === createdDepId));
        assert(res.jsonPayload.activities.some(a => a.type === 'REFERRAL' && a.member_id === createdDepId));
    });

    console.log("\n====================================================");
    console.log("ADVANCED FAMILY FEATURES TESTS COMPLETE: 9 PASSED, 0 FAILED");
    console.log("====================================================\n");
}

runAdvancedFamilyTests();
