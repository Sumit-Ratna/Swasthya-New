const assert = require('assert');
const {
    REFERRAL_STATES,
    VALID_TRANSITIONS,
    isValidTransition,
    computeAuditHash
} = require('../../src/domain/referralStateMachine');

console.log('====================================================');
console.log('RUNNING SWASTHYASETU CANONICAL STATE MACHINE TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
    try {
        fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${desc}`);
        console.error(`    Error: ${err.message}`);
        failed++;
    }
}

// 1. ROUTINE REFERRAL PATH
it('Routine Referral Full Lifecycle Transitions are valid', () => {
    const routinePath = [
        [REFERRAL_STATES.TRIAGED, REFERRAL_STATES.FACILITY_RECOMMENDED],
        [REFERRAL_STATES.FACILITY_RECOMMENDED, REFERRAL_STATES.FACILITY_SELECTED],
        [REFERRAL_STATES.FACILITY_SELECTED, REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING],
        [REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING, REFERRAL_STATES.ACCEPTED],
        [REFERRAL_STATES.ACCEPTED, REFERRAL_STATES.APPOINTMENT_BOOKED],
        [REFERRAL_STATES.APPOINTMENT_BOOKED, REFERRAL_STATES.PATIENT_IN_TRANSIT],
        [REFERRAL_STATES.PATIENT_IN_TRANSIT, REFERRAL_STATES.PATIENT_REACHED],
        [REFERRAL_STATES.PATIENT_REACHED, REFERRAL_STATES.DOCTOR_ASSIGNED],
        [REFERRAL_STATES.DOCTOR_ASSIGNED, REFERRAL_STATES.CONSULTATION_COMPLETED],
        [REFERRAL_STATES.CONSULTATION_COMPLETED, REFERRAL_STATES.TREATMENT_COMPLETED],
        [REFERRAL_STATES.TREATMENT_COMPLETED, REFERRAL_STATES.FOLLOW_UP_PENDING],
        [REFERRAL_STATES.FOLLOW_UP_PENDING, REFERRAL_STATES.FOLLOW_UP_COMPLETED]
    ];

    for (const [from, to] of routinePath) {
        assert.strictEqual(isValidTransition(from, to), true, `Expected valid transition from ${from} to ${to}`);
    }
});

// 2. EMERGENCY ESCALATION PATH
it('Emergency Escalation Lifecycle Transitions are valid', () => {
    const urgentPath = [
        [REFERRAL_STATES.TRIAGED, REFERRAL_STATES.URGENT_ESCALATION],
        [REFERRAL_STATES.URGENT_ESCALATION, REFERRAL_STATES.FACILITY_ALERTED],
        [REFERRAL_STATES.FACILITY_ALERTED, REFERRAL_STATES.PATIENT_IN_TRANSIT],
        [REFERRAL_STATES.PATIENT_IN_TRANSIT, REFERRAL_STATES.PATIENT_REACHED],
        [REFERRAL_STATES.PATIENT_REACHED, REFERRAL_STATES.DOCTOR_ASSIGNED],
        [REFERRAL_STATES.DOCTOR_ASSIGNED, REFERRAL_STATES.CONSULTATION_COMPLETED],
        [REFERRAL_STATES.CONSULTATION_COMPLETED, REFERRAL_STATES.DIAGNOSTICS_PENDING],
        [REFERRAL_STATES.DIAGNOSTICS_PENDING, REFERRAL_STATES.DIAGNOSTICS_COMPLETED],
        [REFERRAL_STATES.DIAGNOSTICS_COMPLETED, REFERRAL_STATES.TREATMENT_COMPLETED]
    ];

    for (const [from, to] of urgentPath) {
        assert.strictEqual(isValidTransition(from, to), true, `Expected valid transition from ${from} to ${to}`);
    }
});

// 3. REROUTING PATH
it('Rerouting on facility overload is valid', () => {
    const reroutePath = [
        [REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING, REFERRAL_STATES.REROUTING_REQUIRED],
        [REFERRAL_STATES.REROUTING_REQUIRED, REFERRAL_STATES.FACILITY_RECOMMENDED],
        [REFERRAL_STATES.FACILITY_RECOMMENDED, REFERRAL_STATES.FACILITY_SELECTED]
    ];

    for (const [from, to] of reroutePath) {
        assert.strictEqual(isValidTransition(from, to), true, `Expected valid transition from ${from} to ${to}`);
    }
});

// 4. INVALID TRANSITIONS REJECTION
it('Disallows skipping required steps (TRIAGED -> CONSULTATION_COMPLETED)', () => {
    assert.strictEqual(isValidTransition(REFERRAL_STATES.TRIAGED, REFERRAL_STATES.CONSULTATION_COMPLETED), false);
});

it('Disallows doctor assignment before patient arrival (PATIENT_IN_TRANSIT -> DOCTOR_ASSIGNED)', () => {
    assert.strictEqual(isValidTransition(REFERRAL_STATES.PATIENT_IN_TRANSIT, REFERRAL_STATES.DOCTOR_ASSIGNED), false);
});

it('Disallows transitioning out of terminal states (FOLLOW_UP_COMPLETED -> TRIAGED)', () => {
    assert.strictEqual(isValidTransition(REFERRAL_STATES.FOLLOW_UP_COMPLETED, REFERRAL_STATES.TRIAGED), false);
    assert.strictEqual(isValidTransition(REFERRAL_STATES.FAILED_REFERRAL, REFERRAL_STATES.ACCEPTED), false);
    assert.strictEqual(isValidTransition(REFERRAL_STATES.CANCELLED, REFERRAL_STATES.ACCEPTED), false);
});

// 5. CRYPTOGRAPHIC LEDGER CHAINING
it('Computes deterministic tamper-evident SHA-256 hash chains', () => {
    const genesisHash = 'GENESIS_BLOCK_SWSTHYA_2026';
    const event1 = { referral_id: 'ref-1', from: 'TRIAGED', to: 'FACILITY_SELECTED' };
    const hash1 = computeAuditHash(genesisHash, event1);

    assert.ok(hash1 && hash1.length === 64, 'Hash must be 64-char hex string');

    const event2 = { referral_id: 'ref-1', from: 'FACILITY_SELECTED', to: 'ACCEPTED' };
    const hash2 = computeAuditHash(hash1, event2);

    assert.ok(hash2 && hash2.length === 64);
    assert.notStrictEqual(hash1, hash2, 'Subsequent block hashes must differ');
});

console.log('\n----------------------------------------------------');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('----------------------------------------------------');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
