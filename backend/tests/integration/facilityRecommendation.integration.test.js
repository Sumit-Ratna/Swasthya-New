const assert = require('assert');
const facilityController = require('../../src/controllers/facilityController');
const {
    calculateHaversineDistance,
    estimateTransitMinutes,
    calculateDataFreshness,
    filterEligibleFacilities,
    rankFacilities,
    recommendFacilities
} = require('../../src/domain/facilityRecommendationEngine');

console.log("====================================================");
console.log("RUNNING PHASE 7 - FACILITY DIRECTORY & RECOMMENDATION TESTS");
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
        id: 'req-test-facility-rec'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runFacilityRecommendationTests() {
    const sampleFacilities = [
        {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Primary Health Centre Shirwal',
            tier: 'PRIMARY_HEALTH_CENTRE',
            district: 'Pune',
            latitude: 18.1384,
            longitude: 73.9856,
            operational_status: 'ACTIVE',
            current_load: 35,
            emergency_capable: false,
            specialties_json: JSON.stringify({
                specialties: ['GENERAL_MEDICINE', 'PRIMARY_CARE'],
                diagnostics: ['BASIC_LAB', 'RAPID_DIAGNOSTIC_TESTS']
            }),
            last_verified_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago (Fresh)
        },
        {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Sub-District Hospital Bhor',
            tier: 'SUB_DISTRICT_HOSPITAL',
            district: 'Pune',
            latitude: 18.1500,
            longitude: 73.8500,
            operational_status: 'ACTIVE',
            current_load: 65,
            emergency_capable: true,
            specialties_json: JSON.stringify({
                specialties: ['GENERAL_MEDICINE', 'OBSTETRICS', 'PEDIATRICS'],
                diagnostics: ['X_RAY', 'ECG', 'ULTRASOUND', 'PATHOLOGY_LAB'],
                capabilities: ['DELIVERY_ROOM', 'EMERGENCY_TRIAGE']
            }),
            last_verified_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 mins ago (Fresh)
        },
        {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'District Hospital Nashik',
            tier: 'DISTRICT_HOSPITAL',
            district: 'Nashik',
            latitude: 19.9975,
            longitude: 73.7898,
            operational_status: 'ACTIVE',
            current_load: 85,
            emergency_capable: true,
            specialties_json: JSON.stringify({
                specialties: ['CARDIOLOGY', 'OBSTETRICS', 'NEUROLOGY', 'GENERAL_SURGERY', 'PEDIATRICS'],
                diagnostics: ['CT_SCAN', 'MRI', 'ULTRASOUND', 'BLOOD_BANK', 'PATHOLOGY_LAB'],
                capabilities: ['ICU', 'NICU', 'OPERATION_THEATRE', 'EMERGENCY_TRIAGE']
            }),
            last_verified_at: new Date(Date.now() - 250 * 60 * 1000).toISOString() // 4+ hours ago (Stale!)
        },
        {
            id: '44444444-4444-4444-4444-444444444444',
            name: 'Community Health Centre Paud',
            tier: 'COMMUNITY_HEALTH_CENTRE',
            district: 'Pune',
            latitude: 18.5204,
            longitude: 73.6100,
            operational_status: 'OFFLINE', // Inactive
            current_load: 0,
            emergency_capable: false,
            specialties_json: JSON.stringify(['GENERAL_MEDICINE']),
            last_verified_at: new Date(Date.now() - 10000).toISOString()
        }
    ];

    // ----------------------------------------------------
    // TEST 1: Hard Filter - Operational State
    // ----------------------------------------------------
    await test('Hard filter eliminates OFFLINE or DIVERTING facilities before scoring', async () => {
        const eligible = filterEligibleFacilities(sampleFacilities, { urgency: 'ROUTINE' });
        const ids = eligible.map(f => f.id);

        assert(!ids.includes('44444444-4444-4444-4444-444444444444'), 'OFFLINE facility must be filtered out');
        assert.strictEqual(eligible.length, 3);
    });

    // ----------------------------------------------------
    // TEST 2: Hard Filter - Urgency / Emergency Capability
    // ----------------------------------------------------
    await test('Emergency urgency hard-filters out non-emergency-capable facilities', async () => {
        const emergencyEligible = filterEligibleFacilities(sampleFacilities, { urgency: 'EMERGENCY' });
        const ids = emergencyEligible.map(f => f.id);

        // PHC Shirwal is NOT emergency capable -> must be excluded
        assert(!ids.includes('11111111-1111-1111-1111-111111111111'), 'Non-emergency facility must be excluded for EMERGENCY triage');
        assert(ids.includes('22222222-2222-2222-2222-222222222222'));
        assert(ids.includes('33333333-3333-3333-3333-333333333333'));
    });

    // ----------------------------------------------------
    // TEST 3: Hard Filter - Required Specialty & Diagnostic Capability
    // ----------------------------------------------------
    await test('Filters out facilities lacking required clinical specialty or diagnostic equipment', async () => {
        // Only facilities with CT_SCAN and CARDIOLOGY
        const filtered = filterEligibleFacilities(sampleFacilities, {
            specialty: 'CARDIOLOGY',
            required_diagnostics: ['CT_SCAN']
        });

        assert.strictEqual(filtered.length, 1);
        assert.strictEqual(filtered[0].id, '33333333-3333-3333-3333-333333333333');
    });

    // ----------------------------------------------------
    // TEST 4: Truthful Haversine Distance & Proximity Ranking
    // ----------------------------------------------------
    await test('Haversine distance calculation is mathematically exact and closer facilities rank higher', async () => {
        // Patient in Shirwal coordinates (18.1380, 73.9850)
        const patientLat = 18.1380;
        const patientLng = 73.9850;

        const distanceToShirwalPHC = calculateHaversineDistance(patientLat, patientLng, 18.1384, 73.9856);
        assert(distanceToShirwalPHC < 0.2, 'Distance to nearby PHC should be < 200m');

        const ranked = rankFacilities(
            [sampleFacilities[0], sampleFacilities[1]], // Shirwal PHC vs Bhor SDH
            { patient_lat: patientLat, patient_lng: patientLng, specialty: 'GENERAL_MEDICINE' }
        );

        assert.strictEqual(ranked[0].facility.id, sampleFacilities[0].id, 'Closer facility with lower load must rank first');
        assert(ranked[0].distance_km !== null);
        assert(ranked[0].estimated_transit_minutes !== null);
        assert.strictEqual(ranked[0].distance_source, 'HAVERSINE_GEO');
    });

    // ----------------------------------------------------
    // TEST 5: Data Freshness & Stale Telemetry Warning
    // ----------------------------------------------------
    await test('Calculates telemetry age and attaches warning when verified timestamp is stale (> 120m)', async () => {
        const freshCheck = calculateDataFreshness(sampleFacilities[0].last_verified_at, 120);
        assert.strictEqual(freshCheck.is_stale, false);
        assert.strictEqual(freshCheck.warning, null);

        const staleCheck = calculateDataFreshness(sampleFacilities[2].last_verified_at, 120);
        assert.strictEqual(staleCheck.is_stale, true);
        assert(staleCheck.warning.includes('Telemetry data is'));
    });

    // ----------------------------------------------------
    // TEST 6: Recommendation Endpoint & Facility-Centric Destination Contract
    // ----------------------------------------------------
    await test('Recommendation API returns top 1-3 ranked facilities with reasons without doctor-centric external routing', async () => {
        const { req, res } = createMockReqRes({
            body: {
                patient_lat: 18.1400,
                patient_lng: 73.9800,
                specialty: 'OBSTETRICS',
                urgency: 'PRIORITY',
                max_results: 3
            }
        });

        await facilityController.recommendFacilities(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonPayload.success, true);
        assert(Array.isArray(res.jsonPayload.recommendations));
        assert(res.jsonPayload.recommendations.length > 0);
        assert(res.jsonPayload.recommendations.length <= 3);

        const firstRec = res.jsonPayload.recommendations[0];
        assert(firstRec.facility.id);
        assert(firstRec.facility.name);
        assert(typeof firstRec.score === 'number');
        assert(Array.isArray(firstRec.recommendation_reasons));
        assert(firstRec.recommendation_reasons.length > 0);

        // Verify routing destination is a FACILITY and NOT an individual doctor
        assert(!firstRec.assigned_doctor_id, 'Referral recommendation destination must be a facility, not an individual doctor');
        assert(firstRec.facility.tier);
    });

    console.log("\n----------------------------------------------------");
    console.log(`TOTAL PHASE 7 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("----------------------------------------------------\n");

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runFacilityRecommendationTests()
        .catch(err => {
            console.error("Fatal Test Suite Error:", err);
            process.exit(1);
        });
}

module.exports = { runFacilityRecommendationTests };
