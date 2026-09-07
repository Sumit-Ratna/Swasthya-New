const assert = require('assert');
const config = require('../../src/config/env');
const facilityController = require('../../src/controllers/facilityController');
const referralController = require('../../src/controllers/referralController');
const facilityRepository = require('../../src/repositories/facilityRepository');
const referralRepository = require('../../src/repositories/referralRepository');
const supabaseService = require('../../src/services/supabaseService');

console.log('====================================================');
console.log('RUNNING PHASE 4 - PERSISTENT DATA LAYER & FALLBACK REMOVAL TESTS');
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

function createMockReqRes({ params = {}, query = {}, body = {}, user = null } = {}) {
    const req = {
        params,
        query,
        body,
        user,
        headers: {},
        id: 'req-test-phase4'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runPhase4Tests() {
    // 1. Non-existent referral returns 404 (REFERRAL_NOT_FOUND) rather than demo referral
    await test('getReferralDetails returns 404 (REFERRAL_NOT_FOUND) when referral ID does not exist', async () => {
        const { req, res } = createMockReqRes({
            params: { id: '00000000-0000-0000-0000-000000000000' }
        });

        await referralController.getReferralDetails(req, res, (err) => {
            if (err) throw err;
        });

        assert.strictEqual(res.statusCode, 404, 'Must return 404 status code');
        assert.strictEqual(res.jsonPayload.success, false);
        assert.strictEqual(res.jsonPayload.code, 'REFERRAL_NOT_FOUND');
    });

    // 2. Non-existent facility returns 404 (FACILITY_NOT_FOUND) rather than DEMO_FACILITIES[0]
    await test('getFacility returns 404 (FACILITY_NOT_FOUND) when facility ID does not exist', async () => {
        const { req, res } = createMockReqRes({
            params: { id: '00000000-0000-0000-0000-000000000099' }
        });

        await facilityController.getFacility(req, res, (err) => {
            if (err) throw err;
        });

        assert.strictEqual(res.statusCode, 404, 'Must return 404 status code');
        assert.strictEqual(res.jsonPayload.success, false);
        assert.strictEqual(res.jsonPayload.code, 'FACILITY_NOT_FOUND');
    });

    // 3. Querying facilities by non-existent district returns truthful empty array []
    await test('getFacilities with non-matching district returns truthful empty array [] and not DEMO_FACILITIES', async () => {
        const { req, res } = createMockReqRes({
            query: { district: 'NonExistentDistrictXYZ999' }
        });

        await facilityController.getFacilities(req, res, (err) => {
            if (err) throw err;
        });

        assert.strictEqual(res.statusCode, 200);
        assert(Array.isArray(res.jsonPayload), 'Must return an array');
        assert.strictEqual(res.jsonPayload.length, 0, 'Must return empty array for non-matching district');
    });

    // 4. Querying referrals by non-existent patient returns empty list []
    await test('getAllReferrals for non-existent patient returns empty list and not all referrals', async () => {
        const { req, res } = createMockReqRes({
            query: { patient_id: '00000000-0000-0000-0000-000000000000' }
        });

        await referralController.getAllReferrals(req, res, (err) => {
            if (err) throw err;
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert.strictEqual(res.jsonPayload.count, 0);
        assert.deepStrictEqual(res.jsonPayload.data, []);
    });

    // 5. supabaseService getReferralById returns null on non-existent record when not in demo mode
    await test('supabaseService.getReferralById returns null instead of first demo referral when record is missing', async () => {
        const result = await supabaseService.getReferralById('00000000-0000-0000-0000-000000000000');
        assert.strictEqual(result, null, 'Must return null for missing referral in persistent mode');
    });

    // 6. supabaseService getReferralTimeline returns empty array [] on missing referral
    await test('supabaseService.getReferralTimeline returns empty array [] on non-existent referral', async () => {
        const timeline = await supabaseService.getReferralTimeline('00000000-0000-0000-0000-000000000000');
        assert(Array.isArray(timeline), 'Timeline must be an array');
        assert.strictEqual(timeline.length, 0, 'Timeline must be empty for non-existent referral');
    });

    console.log('\n----------------------------------------------------');
    console.log(`TOTAL PHASE 4 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('----------------------------------------------------');

    if (failed > 0) {
        process.exit(1);
    }
}

runPhase4Tests().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
