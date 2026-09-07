const assert = require('assert');
const assessmentController = require('../../src/controllers/assessmentController');
const {
    validateClinicalVitals,
    standardizeTemperature,
    evaluateDeterministicTriage,
    TRIAGE_RULE_VERSION
} = require('../../src/domain/clinicalTriageEngine');
const supabaseService = require('../../src/services/supabaseService');

console.log("====================================================");
console.log("RUNNING PHASE 6 - ASSESSMENT & SAFE TRIAGE TESTS");
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
        id: 'req-test-safe-triage'
    };

    const res = {
        statusCode: 200,
        jsonPayload: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runSafeTriageIntegrationTests() {
    const testDoctor = {
        id: '44444444-4444-4444-4444-444444444444',
        role: 'DOCTOR',
        phone: '+919123456780',
        name: 'Dr. Anand Deshmukh'
    };

    const testHealthWorker = {
        id: '11111111-aaaa-1111-aaaa-111111111111',
        role: 'HEALTH_WORKER',
        phone: '+919876543210',
        name: 'Sunita Patil'
    };

    const patientId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    // ----------------------------------------------------
    // TEST 1: Physiological Bounds Validation
    // ----------------------------------------------------
    await test('Implausible physiological vitals (SpO2 > 100%, Dia >= Sys, Pulse < 30) are rejected with 400 VALIDATION_ERROR', async () => {
        // 1a. Implausible SpO2
        const { req: req1, res: res1 } = createMockReqRes({
            user: testHealthWorker,
            body: {
                patient_id: patientId,
                systolic_bp: 120,
                diastolic_bp: 80,
                spo2: 125
            }
        });
        await assessmentController.recordAssessment(req1, res1);
        assert.strictEqual(res1.statusCode, 400);
        assert.strictEqual(res1.jsonPayload.code, 'VALIDATION_ERROR');

        // 1b. Diastolic >= Systolic
        const { req: req2, res: res2 } = createMockReqRes({
            user: testHealthWorker,
            body: {
                patient_id: patientId,
                systolic_bp: 110,
                diastolic_bp: 120
            }
        });
        await assessmentController.recordAssessment(req2, res2);
        assert.strictEqual(res2.statusCode, 400);
        assert.strictEqual(res2.jsonPayload.code, 'VALIDATION_ERROR');

        // 1c. Implausible Pulse Rate
        const { req: req3, res: res3 } = createMockReqRes({
            user: testHealthWorker,
            body: {
                patient_id: patientId,
                systolic_bp: 120,
                diastolic_bp: 80,
                pulse_rate: 10
            }
        });
        await assessmentController.recordAssessment(req3, res3);
        assert.strictEqual(res3.statusCode, 400);
        assert.strictEqual(res3.jsonPayload.code, 'VALIDATION_ERROR');
    });

    // ----------------------------------------------------
    // TEST 2: Temperature Standardization & Unit Conversion
    // ----------------------------------------------------
    await test('Temperature unit standardization (°C / °F) accurately converts and catches ambiguous readings', async () => {
        const tempC = standardizeTemperature(39.0, 'C');
        assert.strictEqual(tempC.isValid, true);
        assert.strictEqual(tempC.tempC, 39.0);
        assert.strictEqual(tempC.tempF, 102.2);

        const tempF = standardizeTemperature(104.0, 'F');
        assert.strictEqual(tempF.isValid, true);
        assert.strictEqual(tempF.tempF, 104.0);
        assert.strictEqual(tempF.tempC, 40.0);

        // Ambiguous value outside known C or F ranges
        const amb = standardizeTemperature(65);
        assert.strictEqual(amb.isValid, false);
    });

    // ----------------------------------------------------
    // TEST 3: Deterministic Danger Signs & Emergency Triage
    // ----------------------------------------------------
    await test('Danger signs trigger instant deterministic CRITICAL + EMERGENCY triage with action-oriented guidance', async () => {
        const triageDanger = evaluateDeterministicTriage({
            systolic_bp: 120,
            diastolic_bp: 80,
            pulse_rate: 82,
            spo2: 98,
            danger_signs: 'Patient having active convulsions and altered consciousness'
        });

        assert.strictEqual(triageDanger.riskLevel, 'CRITICAL');
        assert.strictEqual(triageDanger.urgency, 'EMERGENCY');
        assert.strictEqual(triageDanger.requiredHumanReview, true);
        assert.strictEqual(triageDanger.ruleVersion, TRIAGE_RULE_VERSION);
        assert(triageDanger.actionRecommendation.includes('Immediate emergency clinical stabilization'));
        // Verify output does NOT claim autonomous disease diagnosis
        assert(!triageDanger.actionRecommendation.includes('You have epilepsy'));
    });

    // ----------------------------------------------------
    // TEST 4: Maternal Hypertensive Risk Alert
    // ----------------------------------------------------
    await test('High maternal risk (Pregnancy + Severe Hypertension) triggers CRITICAL + EMERGENCY pre-eclampsia alert', async () => {
        const triageMaternal = evaluateDeterministicTriage({
            systolic_bp: 165,
            diastolic_bp: 105,
            pulse_rate: 94,
            spo2: 97,
            is_pregnant: true
        });

        assert.strictEqual(triageMaternal.riskLevel, 'CRITICAL');
        assert.strictEqual(triageMaternal.urgency, 'EMERGENCY');
        assert(triageMaternal.flaggedFactors.some(f => f.includes('Maternal Alert') || f.includes('Pre-eclampsia')));
    });

    // ----------------------------------------------------
    // TEST 5: Assessment Record Creation with Safe AI Fallback
    // ----------------------------------------------------
    let createdAssessmentId = null;
    await test('Assessment successfully recorded with decoupled riskLevel & urgency and non-diagnostic guidance', async () => {
        const { req, res } = createMockReqRes({
            user: testHealthWorker,
            body: {
                patient_id: patientId,
                systolic_bp: 155,
                diastolic_bp: 95,
                pulse_rate: 88,
                spo2: 96,
                respiratory_rate: 18,
                temperature: 98.6,
                temperature_unit: 'F',
                is_pregnant: false,
                danger_signs: 'Persistent headache'
            }
        });

        await assessmentController.recordAssessment(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert(res.jsonPayload.assessment);
        assert(res.jsonPayload.assessment.id);
        assert.strictEqual(res.jsonPayload.triage.rule_version, TRIAGE_RULE_VERSION);
        assert(res.jsonPayload.triage.risk_level === 'HIGH' || res.jsonPayload.triage.risk_level === 'MODERATE');
        assert(res.jsonPayload.triage.action_recommendation);

        createdAssessmentId = res.jsonPayload.assessment.id;
    });

    // ----------------------------------------------------
    // TEST 6: Authorized Clinician Triage Override & Audit Trail
    // ----------------------------------------------------
    await test('Authorized clinician triage override enforces mandatory reason and persists audit metadata', async () => {
        assert(createdAssessmentId, 'Requires created assessment ID from Test 5');

        // 6a. Missing reason must be rejected
        const { req: reqNoReason, res: resNoReason } = createMockReqRes({
            user: testDoctor,
            params: { id: createdAssessmentId },
            body: {
                override_risk_level: 'LOW',
                override_urgency: 'ROUTINE',
                override_reason: ''
            }
        });

        await assessmentController.overrideTriage(reqNoReason, resNoReason);
        assert.strictEqual(resNoReason.statusCode, 400);
        assert.strictEqual(resNoReason.jsonPayload.code, 'VALIDATION_ERROR');

        // 6b. Valid clinical override with mandatory reason
        const { req: reqOverride, res: resOverride } = createMockReqRes({
            user: testDoctor,
            params: { id: createdAssessmentId },
            body: {
                override_risk_level: 'LOW',
                override_urgency: 'ROUTINE',
                override_reason: 'Patient re-checked after resting 20 mins; repeat BP 118/76 mmHg. Headache resolved after hydration.'
            }
        });

        await assessmentController.overrideTriage(reqOverride, resOverride);
        assert.strictEqual(resOverride.statusCode, 200);
        assert.strictEqual(resOverride.jsonPayload.assessment.override_risk_level, 'LOW');
        assert.strictEqual(resOverride.jsonPayload.assessment.override_urgency, 'ROUTINE');
        assert.strictEqual(resOverride.jsonPayload.assessment.overridden_by, testDoctor.id);
    });

    console.log("\n----------------------------------------------------");
    console.log(`TOTAL PHASE 6 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("----------------------------------------------------\n");

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runSafeTriageIntegrationTests()
        .then(() => process.exit(0))
        .catch(err => {
            console.error("Fatal Test Suite Error:", err);
            process.exit(1);
        });
}

module.exports = { runSafeTriageIntegrationTests };
