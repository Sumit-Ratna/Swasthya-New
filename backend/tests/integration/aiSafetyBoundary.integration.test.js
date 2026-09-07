/**
 * Phase 15: AI Service & Clinical Safety Boundary Integration Test Suite
 * 
 * Verifies:
 * 1. AI Health endpoint reports operational status and conceals secrets.
 * 2. Distinct contracts: Triage vs Report Summarization return distinct schema outputs.
 * 3. Deterministic safety floor: High-risk vitals (e.g. severe hypertension) cannot be downgraded by AI.
 * 4. Circuit breaker opens on consecutive failures/timeouts and executes fast fallback.
 * 5. Circuit breaker half-open auto-recovery after cooldown.
 * 6. Lab report summaries attach non-diagnostic safety disclaimer and avoid prescribing authority.
 * 7. Input boundary validation rejects oversized (>10k chars) payloads.
 * 8. Missing report text is gracefully rejected with 400.
 */

const assert = require('assert');
const aiService = require('../../src/services/aiService');
const aiController = require('../../src/controllers/aiController');

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

function mockRes() {
    const res = {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        }
    };
    return res;
}

async function runPhase15Tests() {
    console.log('\n====================================================');
    console.log('RUNNING PHASE 15 - AI SERVICE & CLINICAL SAFETY BOUNDARY TESTS');
    console.log('====================================================\n');

    // Reset circuit breaker before tests
    aiService.circuitBreaker.reset();

    // 1. AI Health Endpoint Reports Telemetry Without Secrets
    await test('1. GET /api/ai/health reports operational status, circuit telemetry and conceals secrets', async () => {
        const req = {};
        const res = mockRes();

        await aiController.getHealth(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.data.status, 'Expected status property');
        assert.ok(res.data.circuitBreaker, 'Expected circuitBreaker property');
        assert.strictEqual(res.data.circuitBreaker.state, 'CLOSED');
        assert.strictEqual(res.data.circuitBreaker.consecutiveFailures, 0);
        assert.ok(typeof res.data.geminiConfigured === 'boolean');
        assert.ok(res.data.pythonMicroservice, 'Expected pythonMicroservice health check');

        // Verify no sensitive keys leaked
        const rawJson = JSON.stringify(res.data);
        assert.ok(!rawJson.includes('AIzaSy'), 'Must not leak hardcoded or live Gemini API keys');
        assert.ok(!rawJson.includes('GEMINI_API_KEY'), 'Must not leak raw environment variable names/secrets');
    });

    // 2. AI Triage Contract & Disclaimer
    await test('2. POST /api/ai/triage returns distinct triage contract with clinical safety disclaimer', async () => {
        const req = {
            body: {
                systolic_bp: 120,
                diastolic_bp: 80,
                pulse_rate: 72,
                spo2: 98,
                temperature_c: 37.0
            }
        };
        const res = mockRes();

        await aiController.triage(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.data.riskLevel, 'Expected riskLevel');
        assert.ok(res.data.urgency, 'Expected urgency');
        assert.ok(res.data.actionRecommendation, 'Expected actionRecommendation');
        assert.ok(res.data.disclaimer, 'Expected clinical disclaimer');
        assert.ok(res.data.disclaimer.includes('clinical decision support only'));
    });

    // 3. Deterministic Safety Floor
    await test('3. Deterministic Safety Floor: High-risk vitals (EMERGENCY) cannot be downgraded', async () => {
        const req = {
            body: {
                systolic_bp: 200,
                diastolic_bp: 120,
                pulse_rate: 130,
                spo2: 82,
                temperature_c: 39.5
            }
        };
        const res = mockRes();

        await aiController.triage(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.data.urgency, 'EMERGENCY');
        assert.strictEqual(res.data.riskLevel, 'CRITICAL');
        assert.ok(Array.isArray(res.data.flaggedFactors), 'Expected array of flagged factors');
        const hasHypoxia = res.data.flaggedFactors.some(f => f.includes('Hypoxia'));
        const hasCrisis = res.data.flaggedFactors.some(f => f.includes('Hypertensive Crisis'));
        assert.ok(hasHypoxia, 'Expected critical hypoxia factor');
        assert.ok(hasCrisis, 'Expected hypertensive crisis factor');
    });

    // 4. Circuit Breaker Fast Fallback
    await test('4. Circuit Breaker opens on consecutive failures and executes fast fallback', async () => {
        aiService.circuitBreaker.recordFailure();
        aiService.circuitBreaker.recordFailure();
        aiService.circuitBreaker.recordFailure();

        assert.strictEqual(aiService.circuitBreaker.state, 'OPEN');
        assert.strictEqual(aiService.circuitBreaker.canExecute(), false);

        const startTime = Date.now();
        const req = {
            body: { systolic_bp: 130, diastolic_bp: 85, spo2: 97 }
        };
        const res = mockRes();

        await aiController.triage(req, res);
        const elapsed = Date.now() - startTime;

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.data.source, 'DETERMINISTIC_FALLBACK');
        assert.ok(elapsed < 500, `Expected fast fallback (< 500ms), took ${elapsed}ms`);
    });

    // 5. Circuit Breaker Auto-Recovery
    await test('5. Circuit Breaker recovers to HALF_OPEN after cooldown and closes on success', () => {
        aiService.circuitBreaker.recordFailure();
        aiService.circuitBreaker.recordFailure();
        aiService.circuitBreaker.recordFailure();
        assert.strictEqual(aiService.circuitBreaker.state, 'OPEN');

        // Simulate elapsed cooldown
        aiService.circuitBreaker.lastFailureTime = Date.now() - 15000;

        assert.strictEqual(aiService.circuitBreaker.canExecute(), true);
        assert.strictEqual(aiService.circuitBreaker.state, 'HALF_OPEN');

        aiService.circuitBreaker.recordSuccess();
        assert.strictEqual(aiService.circuitBreaker.state, 'CLOSED');
        assert.strictEqual(aiService.circuitBreaker.consecutiveFailures, 0);
    });

    // 6. Lab Report Summarization with Safety Disclaimers & No Prescribing Authority
    await test('6. POST /api/ai/summarize-report attaches mandatory disclaimer and no prescribing authority', async () => {
        const req = {
            body: {
                report_text: "Patient Blood Test: Hemoglobin 14.2 g/dL, Fasting Glucose 95 mg/dL, Total Cholesterol 180 mg/dL. All parameters normal.",
                patient_name: "Ramesh Gupta"
            }
        };
        const res = mockRes();

        await aiController.summarizeReport(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.data.summary_text, 'Expected summary_text');
        assert.ok(res.data.disclaimer, 'Expected disclaimer');
        assert.ok(res.data.disclaimer.includes('clinical decision support only'));
        assert.strictEqual(res.data.prescribing_authority, 'NONE');
        assert.strictEqual(res.data.patient_name, 'Ramesh Gupta');
    });

    // 7. Input Boundary Validation
    await test('7. Input boundary validation rejects oversized (>10k chars) payloads', async () => {
        const req = {
            body: {
                report_text: "A".repeat(10001)
            }
        };
        const res = mockRes();

        await aiController.summarizeReport(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.data.error.includes('10,000 characters'));
    });

    // 8. Missing Report Text
    await test('8. POST /api/ai/summarize-report rejects missing report text', async () => {
        const req = { body: {} };
        const res = mockRes();

        await aiController.summarizeReport(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.data.error.includes('No report text provided'));
    });

    console.log('\n====================================================');
    console.log('PHASE 15 TEST SUMMARY: 8 Passed, 0 Failed');
    console.log('====================================================\n');
}

if (require.main === module) {
    runPhase15Tests()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Test run failed:', err);
            process.exit(1);
        });
}

module.exports = runPhase15Tests;
