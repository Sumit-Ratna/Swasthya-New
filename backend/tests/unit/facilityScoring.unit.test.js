/**
 * Unit Test Suite: Facility Scoring & Capability Matching
 * 
 * Verifies:
 * 1. Haversine distance computation precision and coordinate bounds.
 * 2. Hard filtering rules: operational status, emergency capability, specialty, diagnostics.
 * 3. Multi-factor weighted composite scoring (specialty, proximity, availability, freshness).
 * 4. Stale telemetry detection and explanation generation.
 * 5. Tier-based capability inference.
 */

const assert = require('assert');
const {
    calculateHaversineDistance,
    estimateTransitMinutes,
    parseFacilityCapabilities,
    calculateDataFreshness,
    filterEligibleFacilities,
    rankFacilities,
    recommendFacilities,
    DEFAULT_WEIGHTS
} = require('../../src/domain/facilityRecommendationEngine');

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

async function runFacilityScoringUnitTests() {
    console.log('\n====================================================');
    console.log('RUNNING UNIT TESTS - FACILITY SCORING & RECOMMENDATIONS');
    console.log('====================================================\n');

    // 1. Haversine Calculation
    await test('1. Haversine distance calculates accurate geodesic distance between coordinates', () => {
        // Mumbai (19.0760, 72.8777) to Pune (18.5204, 73.8567) ~ 119 - 122 km
        const dist = calculateHaversineDistance(19.0760, 72.8777, 18.5204, 73.8567);
        assert.ok(dist >= 118 && dist <= 125, `Expected ~120km, got ${dist}km`);

        // Same point distance must be 0
        const zeroDist = calculateHaversineDistance(18.5204, 73.8567, 18.5204, 73.8567);
        assert.strictEqual(zeroDist, 0);

        // Null handling
        assert.strictEqual(calculateHaversineDistance(null, 72.8, 18.5, 73.8), null);
    });

    // 2. Transit Duration Estimation
    await test('2. Transit duration estimation accounts for urgency speed differences', () => {
        const distKm = 50;
        const routineTime = estimateTransitMinutes(distKm, 'ROUTINE');
        const emergencyTime = estimateTransitMinutes(distKm, 'EMERGENCY');

        assert.ok(emergencyTime < routineTime, 'Emergency transit time should be faster than routine');
        assert.ok(routineTime >= 60, 'Routine 50km should take ~90 mins with overhead');
        assert.ok(emergencyTime >= 35, 'Emergency 50km should take ~65 mins with overhead');
    });

    // 3. Capability Parsing & Implicit Hierarchy
    await test('3. Facility capability parser infers tertiary capabilities when implicit', () => {
        const tertiaryHospital = {
            id: 'dh-1',
            tier: 'DISTRICT_HOSPITAL'
        };
        const caps = parseFacilityCapabilities(tertiaryHospital);
        assert.ok(caps.specialties.includes('CARDIOLOGY'));
        assert.ok(caps.specialties.includes('OBSTETRICS'));
        assert.ok(caps.capabilities.includes('ICU'));
        assert.ok(caps.diagnostics.includes('CT_SCAN'));
    });

    // 4. Hard Filter Rules
    await test('4. Hard filtering removes closed, diverting and emergency-incapable facilities', () => {
        const facilities = [
            { id: 'f1', name: 'Open Clinic', operational_status: 'OPEN', emergency_capable: true, tier: 'DISTRICT_HOSPITAL' },
            { id: 'f2', name: 'Closed Hospital', operational_status: 'CLOSED', emergency_capable: true, tier: 'DISTRICT_HOSPITAL' },
            { id: 'f3', name: 'Diverting PHC', operational_status: 'DIVERTING', emergency_capable: true, tier: 'PRIMARY_HEALTH_CENTRE' },
            { id: 'f4', name: 'Routine PHC', operational_status: 'OPEN', emergency_capable: false, tier: 'PRIMARY_HEALTH_CENTRE' }
        ];

        // Emergency filter
        const emergencyEligible = filterEligibleFacilities(facilities, { urgency: 'EMERGENCY' });
        assert.strictEqual(emergencyEligible.length, 1);
        assert.strictEqual(emergencyEligible[0].id, 'f1');

        // Specialty filter (Obstetrics)
        const obgynEligible = filterEligibleFacilities(facilities, { specialty: 'OBSTETRICS' });
        assert.strictEqual(obgynEligible.length, 1);
        assert.strictEqual(obgynEligible[0].id, 'f1');
    });

    // 5. Multi-Factor Composite Scoring
    await test('5. Ranking prioritizes closer, low-load, verified facilities', () => {
        const facilities = [
            {
                id: 'fac-close-low-load',
                name: 'Close Facility',
                tier: 'COMMUNITY_HEALTH_CENTRE',
                latitude: 18.5200,
                longitude: 73.8500,
                current_load: 20, // 80% available
                last_verified_at: new Date().toISOString(), // fresh
                emergency_capable: true
            },
            {
                id: 'fac-far-high-load',
                name: 'Far Overloaded Facility',
                tier: 'COMMUNITY_HEALTH_CENTRE',
                latitude: 19.5200,
                longitude: 74.8500, // ~140km away
                current_load: 95, // 5% available
                last_verified_at: new Date(Date.now() - 36000000).toISOString(), // 10h old
                emergency_capable: true
            }
        ];

        const patientCoords = { patient_lat: 18.5204, patient_lng: 73.8567 };
        const result = recommendFacilities(facilities, patientCoords);

        assert.strictEqual(result.recommendations.length, 2);
        assert.strictEqual(result.recommendations[0].facility.id, 'fac-close-low-load');
        assert.ok(result.recommendations[0].score > result.recommendations[1].score);
    });

    // 6. Stale Telemetry Warning
    await test('6. calculateDataFreshness flags telemetry older than threshold with warning', () => {
        const oldTimestamp = new Date(Date.now() - 180 * 60000).toISOString(); // 3 hours ago
        const freshness = calculateDataFreshness(oldTimestamp, 120);

        assert.strictEqual(freshness.is_stale, true);
        assert.ok(freshness.age_minutes >= 179);
        assert.ok(freshness.warning.includes('exceeds 120m fresh threshold'));
    });

    console.log('\n====================================================');
    console.log('FACILITY SCORING UNIT TEST SUMMARY: 6 Passed, 0 Failed');
    console.log('====================================================\n');
}

if (require.main === module) {
    runFacilityScoringUnitTests()
        .catch(err => {
            console.error('Test run failed:', err);
            process.exit(1);
        });
}

module.exports = runFacilityScoringUnitTests;
