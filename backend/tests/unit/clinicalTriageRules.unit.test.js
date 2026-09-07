/**
 * Unit Test Suite: Clinical Vitals Validation & Safe Triage Rules
 * 
 * Verifies:
 * 1. Temperature standardization and boundary enforcement (°C and °F).
 * 2. Physiological plausibility boundaries (BP, SpO2, Heart Rate, Respiration Rate).
 * 3. NEWS2-based clinical threshold boundaries for hypoxia, hypertension, distress.
 * 4. Critical danger signs instant emergency escalation.
 * 5. Maternal pre-eclampsia alert triggers during pregnancy.
 * 6. Decoupled risk level (LOW/MODERATE/HIGH/CRITICAL) vs urgency (ROUTINE/PRIORITY/EMERGENCY).
 */

const assert = require('assert');
const {
    standardizeTemperature,
    validateClinicalVitals,
    evaluateDeterministicTriage,
    PHYSIOLOGICAL_BOUNDS,
    CRITICAL_DANGER_KEYWORDS
} = require('../../src/domain/clinicalTriageEngine');

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

async function runClinicalTriageUnitTests() {
    console.log('\n====================================================');
    console.log('RUNNING UNIT TESTS - CLINICAL TRIAGE RULES');
    console.log('====================================================\n');

    // 1. Temperature Standardization
    await test('1. standardizeTemperature correctly handles Celsius and Fahrenheit with auto-inference', () => {
        // Explicit C
        const cRes = standardizeTemperature(37.0, 'C');
        assert.strictEqual(cRes.isValid, true);
        assert.strictEqual(cRes.tempC, 37.0);
        assert.strictEqual(cRes.tempF, 98.6);

        // Explicit F
        const fRes = standardizeTemperature(101.3, 'F');
        assert.strictEqual(fRes.isValid, true);
        assert.strictEqual(fRes.tempF, 101.3);
        assert.strictEqual(fRes.tempC, 38.5);

        // Auto-inferred F (99.0 is >= 75)
        const autoF = standardizeTemperature(99.0);
        assert.strictEqual(autoF.isValid, true);
        assert.strictEqual(autoF.tempF, 99.0);
        assert.strictEqual(autoF.tempC, 37.2);

        // Out of physiological bounds
        const outOfBounds = standardizeTemperature(55.0, 'C');
        assert.strictEqual(outOfBounds.isValid, false);
    });

    // 2. Vitals Boundary Validation
    await test('2. validateClinicalVitals rejects impossible physiological numbers and inverted BP', () => {
        // Inverted BP (Diastolic > Systolic)
        const invertedBp = validateClinicalVitals({ systolic_bp: 80, diastolic_bp: 120 });
        assert.strictEqual(invertedBp.isValid, false);
        assert.ok(invertedBp.errors[0].includes('cannot be greater than or equal to Systolic'));

        // Impossible pulse rate (e.g. 350 bpm)
        const impossiblePulse = validateClinicalVitals({ pulse_rate: 350 });
        assert.strictEqual(impossiblePulse.isValid, false);
        assert.ok(impossiblePulse.errors[0].includes('Pulse Rate must be between'));

        // Impossible SpO2 (e.g. 110%)
        const impossibleSpo2 = validateClinicalVitals({ spo2: 110 });
        assert.strictEqual(impossibleSpo2.isValid, false);
    });

    // 3. Hypoxia Triage Thresholds
    await test('3. evaluateDeterministicTriage triggers Critical Hypoxia when SpO2 < 90%', () => {
        const triage = evaluateDeterministicTriage({ spo2: 88 });
        assert.strictEqual(triage.urgency, 'EMERGENCY');
        assert.strictEqual(triage.riskLevel, 'CRITICAL');
        assert.ok(triage.flaggedFactors.some(f => f.includes('Critical Hypoxia')));
    });

    // 4. Hypertensive Crisis Triage Thresholds
    await test('4. Hypertensive crisis (BP >= 180/120) triggers EMERGENCY urgency and CRITICAL risk', () => {
        const triage = evaluateDeterministicTriage({ systolic_bp: 190, diastolic_bp: 125 });
        assert.strictEqual(triage.urgency, 'EMERGENCY');
        assert.strictEqual(triage.riskLevel, 'CRITICAL');
        assert.ok(triage.flaggedFactors.some(f => f.includes('Hypertensive Crisis')));
    });

    // 5. Maternal Alert in Pregnancy
    await test('5. Elevated BP in pregnant patient triggers Pre-eclampsia maternal alert', () => {
        const triage = evaluateDeterministicTriage({
            systolic_bp: 150,
            diastolic_bp: 95,
            is_pregnant: true
        });
        assert.ok(triage.flaggedFactors.some(f => f.includes('Maternal Alert')));
        assert.ok(triage.riskLevel === 'HIGH' || triage.riskLevel === 'CRITICAL');
    });

    // 6. Critical Danger Sign Keywords
    await test('6. Critical danger keywords (e.g. convulsions, altered mental status) trigger instant EMERGENCY', () => {
        const triage = evaluateDeterministicTriage({
            danger_signs: 'Patient experiencing severe convulsions and altered consciousness'
        });
        assert.strictEqual(triage.urgency, 'EMERGENCY');
        assert.strictEqual(triage.riskLevel, 'CRITICAL');
        assert.ok(triage.flaggedFactors.some(f => f.includes('Critical Danger Signs')));
    });

    console.log('\n====================================================');
    console.log('CLINICAL TRIAGE UNIT TEST SUMMARY: 6 Passed, 0 Failed');
    console.log('====================================================\n');
}

if (require.main === module) {
    runClinicalTriageUnitTests()
        .catch(err => {
            console.error('Test run failed:', err);
            process.exit(1);
        });
}

module.exports = runClinicalTriageUnitTests;
