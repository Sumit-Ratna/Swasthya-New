/**
 * SwasthyaSetu Clinical Vitals Validation & Deterministic Safe Triage Engine
 * Rule Version: SWASTHYA_TRIAGE_V2
 *
 * Rules & Invariants:
 * 1. Explicit physiological plausibility bounds for all vitals.
 * 2. Temperature standardization to both Celsius and Fahrenheit.
 * 3. Separation of Risk Level (LOW, MODERATE, HIGH, CRITICAL) from Urgency (ROUTINE, PRIORITY, EMERGENCY).
 * 4. Deterministic conservative danger-sign & maternal alert triggers.
 * 5. Action-oriented, non-diagnostic patient/clinician guidance.
 */

const TRIAGE_RULE_VERSION = 'SWASTHYA_TRIAGE_V2';

// 1. Plausible physiological ranges
const PHYSIOLOGICAL_BOUNDS = {
    systolic_bp: { min: 60, max: 260, unit: 'mmHg', name: 'Systolic Blood Pressure' },
    diastolic_bp: { min: 40, max: 160, unit: 'mmHg', name: 'Diastolic Blood Pressure' },
    pulse_rate: { min: 30, max: 220, unit: 'bpm', name: 'Pulse Rate' },
    spo2: { min: 50, max: 100, unit: '%', name: 'Oxygen Saturation (SpO2)' },
    respiratory_rate: { min: 6, max: 60, unit: 'breaths/min', name: 'Respiratory Rate' },
    temperature_c: { min: 30.0, max: 45.0, unit: '°C', name: 'Body Temperature' },
    temperature_f: { min: 86.0, max: 113.0, unit: '°F', name: 'Body Temperature' }
};

// Known critical danger signs that trigger immediate emergency escalation
const CRITICAL_DANGER_KEYWORDS = [
    'convulsion',
    'seizure',
    'unconscious',
    'altered consciousness',
    'altered mental',
    'severe chest pain',
    'active hemorrhage',
    'severe bleeding',
    'cyanosis',
    'severe shortness of breath',
    'gasping',
    'severe breathlessness',
    'stridor',
    'unresponsive'
];

/**
 * Standardize and validate temperature input
 * Accepts temperature value and optional unit ('C' or 'F').
 * Defaults/infers based on value magnitude if unit is omitted.
 */
function standardizeTemperature(tempVal, unitHint) {
    if (tempVal === null || tempVal === undefined || tempVal === '') {
        return { tempC: null, tempF: null, isValid: true, error: null };
    }

    const num = Number(tempVal);
    if (isNaN(num)) {
        return { tempC: null, tempF: null, isValid: false, error: 'Temperature must be a valid number' };
    }

    let unit = unitHint ? String(unitHint).trim().toUpperCase() : null;
    if (!unit || (unit !== 'C' && unit !== 'F')) {
        // Unambiguous inference: >= 75 is Fahrenheit, <= 45 is Celsius
        if (num >= 75 && num <= 115) {
            unit = 'F';
        } else if (num >= 30 && num <= 45) {
            unit = 'C';
        } else {
            return {
                tempC: null,
                tempF: null,
                isValid: false,
                error: `Ambiguous or out-of-range temperature value: ${num}. Please specify temperature_unit as 'C' or 'F'.`
            };
        }
    }

    let tempC, tempF;
    if (unit === 'C') {
        tempC = Number(num.toFixed(1));
        tempF = Number(((num * 9 / 5) + 32).toFixed(1));
    } else {
        tempF = Number(num.toFixed(1));
        tempC = Number(((num - 32) * 5 / 9).toFixed(1));
    }

    // Validate physiological limits
    if (tempC < PHYSIOLOGICAL_BOUNDS.temperature_c.min || tempC > PHYSIOLOGICAL_BOUNDS.temperature_c.max) {
        return {
            tempC,
            tempF,
            isValid: false,
            error: `Temperature ${num}°${unit} (${tempC}°C / ${tempF}°F) is outside plausible physiological bounds (30°C - 45°C / 86°F - 113°F).`
        };
    }

    return { tempC, tempF, isValid: true, error: null };
}

/**
 * Validate all clinical vitals before scoring
 */
function validateClinicalVitals(vitals = {}) {
    const errors = [];
    const validated = {};

    // 1. Temperature
    const tempResult = standardizeTemperature(vitals.temperature, vitals.temperature_unit);
    if (!tempResult.isValid) {
        errors.push(tempResult.error);
    } else {
        validated.temperature_c = tempResult.tempC;
        validated.temperature_f = tempResult.tempF;
    }

    // 2. Systolic & Diastolic BP
    const sys = vitals.systolic_bp !== undefined && vitals.systolic_bp !== null && vitals.systolic_bp !== '' ? Number(vitals.systolic_bp) : null;
    const dia = vitals.diastolic_bp !== undefined && vitals.diastolic_bp !== null && vitals.diastolic_bp !== '' ? Number(vitals.diastolic_bp) : null;

    if (sys !== null) {
        if (isNaN(sys) || sys < PHYSIOLOGICAL_BOUNDS.systolic_bp.min || sys > PHYSIOLOGICAL_BOUNDS.systolic_bp.max) {
            errors.push(`Systolic BP must be between ${PHYSIOLOGICAL_BOUNDS.systolic_bp.min} and ${PHYSIOLOGICAL_BOUNDS.systolic_bp.max} mmHg (received: ${vitals.systolic_bp}).`);
        } else {
            validated.systolic_bp = sys;
        }
    }

    if (dia !== null) {
        if (isNaN(dia) || dia < PHYSIOLOGICAL_BOUNDS.diastolic_bp.min || dia > PHYSIOLOGICAL_BOUNDS.diastolic_bp.max) {
            errors.push(`Diastolic BP must be between ${PHYSIOLOGICAL_BOUNDS.diastolic_bp.min} and ${PHYSIOLOGICAL_BOUNDS.diastolic_bp.max} mmHg (received: ${vitals.diastolic_bp}).`);
        } else {
            validated.diastolic_bp = dia;
        }
    }

    if (sys !== null && dia !== null && !isNaN(sys) && !isNaN(dia)) {
        if (dia >= sys) {
            errors.push(`Diastolic BP (${dia} mmHg) cannot be greater than or equal to Systolic BP (${sys} mmHg).`);
        }
    }

    // 3. Pulse Rate
    if (vitals.pulse_rate !== undefined && vitals.pulse_rate !== null && vitals.pulse_rate !== '') {
        const pulse = Number(vitals.pulse_rate);
        if (isNaN(pulse) || pulse < PHYSIOLOGICAL_BOUNDS.pulse_rate.min || pulse > PHYSIOLOGICAL_BOUNDS.pulse_rate.max) {
            errors.push(`Pulse Rate must be between ${PHYSIOLOGICAL_BOUNDS.pulse_rate.min} and ${PHYSIOLOGICAL_BOUNDS.pulse_rate.max} bpm (received: ${vitals.pulse_rate}).`);
        } else {
            validated.pulse_rate = pulse;
        }
    }

    // 4. SpO2
    if (vitals.spo2 !== undefined && vitals.spo2 !== null && vitals.spo2 !== '') {
        const spo2 = Number(vitals.spo2);
        if (isNaN(spo2) || spo2 < PHYSIOLOGICAL_BOUNDS.spo2.min || spo2 > PHYSIOLOGICAL_BOUNDS.spo2.max) {
            errors.push(`SpO2 must be between ${PHYSIOLOGICAL_BOUNDS.spo2.min}% and ${PHYSIOLOGICAL_BOUNDS.spo2.max}% (received: ${vitals.spo2}).`);
        } else {
            validated.spo2 = spo2;
        }
    }

    // 5. Respiratory Rate
    if (vitals.respiratory_rate !== undefined && vitals.respiratory_rate !== null && vitals.respiratory_rate !== '') {
        const resp = Number(vitals.respiratory_rate);
        if (isNaN(resp) || resp < PHYSIOLOGICAL_BOUNDS.respiratory_rate.min || resp > PHYSIOLOGICAL_BOUNDS.respiratory_rate.max) {
            errors.push(`Respiratory Rate must be between ${PHYSIOLOGICAL_BOUNDS.respiratory_rate.min} and ${PHYSIOLOGICAL_BOUNDS.respiratory_rate.max} breaths/min (received: ${vitals.respiratory_rate}).`);
        } else {
            validated.respiratory_rate = resp;
        }
    }

    // 6. Pregnancy flag
    validated.is_pregnant = Boolean(vitals.is_pregnant);

    // 7. Danger signs string
    validated.danger_signs = vitals.danger_signs ? String(vitals.danger_signs).trim() : null;

    return {
        isValid: errors.length === 0,
        errors,
        validatedVitals: validated
    };
}

/**
 * Deterministic Safe Triage Evaluation
 * Evaluates clinical rules and returns a structured, explainable triage result.
 */
function evaluateDeterministicTriage(vitals = {}) {
    const flags = [];
    let score = 0.0;
    let isEmergency = false;
    let isCriticalDanger = false;

    const sys = vitals.systolic_bp !== undefined ? Number(vitals.systolic_bp) : null;
    const dia = vitals.diastolic_bp !== undefined ? Number(vitals.diastolic_bp) : null;
    const spo2 = vitals.spo2 !== undefined ? Number(vitals.spo2) : null;
    const pulse = vitals.pulse_rate !== undefined ? Number(vitals.pulse_rate) : null;
    const resp = vitals.respiratory_rate !== undefined ? Number(vitals.respiratory_rate) : null;
    const isPreg = Boolean(vitals.is_pregnant);
    const dangerSigns = vitals.danger_signs ? String(vitals.danger_signs).toLowerCase() : '';

    // Standardize temperature for evaluation
    const tempRes = standardizeTemperature(vitals.temperature, vitals.temperature_unit);
    const tempC = tempRes.tempC;
    const tempF = tempRes.tempF;

    // 1. DANGER SIGNS CHECK (Instant Critical / Emergency trigger)
    if (dangerSigns) {
        const detectedKeywords = CRITICAL_DANGER_KEYWORDS.filter(k => dangerSigns.includes(k));
        if (detectedKeywords.length > 0) {
            flags.push(`Critical Danger Signs Reported: "${vitals.danger_signs}"`);
            score += 0.6;
            isEmergency = true;
            isCriticalDanger = true;
        } else {
            flags.push(`Reported Symptoms/Signs: "${vitals.danger_signs}"`);
            score += 0.25;
        }
    }

    // 2. OXYGEN SATURATION (SpO2)
    if (spo2 !== null && !isNaN(spo2)) {
        if (spo2 < 90) {
            flags.push(`Critical Hypoxia (SpO2 ${spo2}% < 90%) - Immediate high-flow oxygen required`);
            score += 0.55;
            isEmergency = true;
        } else if (spo2 < 94) {
            flags.push(`Moderate Hypoxia (SpO2 ${spo2}% [90-93%]) - Oxygen monitoring required`);
            score += 0.3;
        }
    }

    // 3. RESPIRATORY RATE
    if (resp !== null && !isNaN(resp)) {
        if (resp >= 30 || resp <= 8) {
            flags.push(`Severe Respiratory Distress (Rate: ${resp} breaths/min)`);
            score += 0.45;
            isEmergency = true;
        } else if (resp >= 24) {
            flags.push(`Tachypnea (Rate: ${resp} breaths/min)`);
            score += 0.2;
        }
    }

    // 4. BLOOD PRESSURE & PREGNANCY SPECIFIC RISKS
    if (sys !== null && dia !== null) {
        if (sys >= 180 || dia >= 120) {
            flags.push(`Hypertensive Crisis (BP ${sys}/${dia} mmHg >= 180/120)`);
            score += 0.5;
            isEmergency = true;
        } else if (sys >= 160 || dia >= 100) {
            flags.push(`Severe Hypertension (BP ${sys}/${dia} mmHg >= 160/100)`);
            score += 0.35;
        } else if (sys >= 140 || dia >= 90) {
            flags.push(`Stage 2 Hypertension (BP ${sys}/${dia} mmHg)`);
            score += 0.2;
        } else if (sys < 90 || dia < 60) {
            flags.push(`Hypotension / Possible Shock (BP ${sys}/${dia} mmHg < 90/60)`);
            score += 0.35;
            if (sys < 80) isEmergency = true;
        }

        // Pregnancy-specific hypertensive alert (Pre-eclampsia danger)
        if (isPreg) {
            if (sys >= 140 || dia >= 90) {
                flags.push(`Maternal Alert: Gestational Hypertension / Possible Pre-eclampsia (BP ${sys}/${dia} mmHg in pregnancy)`);
                score += 0.35;
                if (sys >= 160 || dia >= 110) {
                    isEmergency = true;
                }
            }
        }
    }

    // 5. HEART RATE / PULSE
    if (pulse !== null && !isNaN(pulse)) {
        if (pulse > 140 || pulse < 40) {
            flags.push(`Extreme Heart Rate (${pulse} bpm)`);
            score += 0.4;
            isEmergency = true;
        } else if (pulse > 120 || pulse < 50) {
            flags.push(`Abnormal Heart Rate (${pulse} bpm)`);
            score += 0.25;
        }
    }

    // 6. TEMPERATURE
    if (tempC !== null) {
        if (tempC >= 39.5) {
            flags.push(`Hyperpyrexia (Temp ${tempC}°C / ${tempF}°F >= 39.5°C / 103.1°F)`);
            score += 0.3;
        } else if (tempC >= 38.0) {
            flags.push(`Pyrexia / Fever (Temp ${tempC}°C / ${tempF}°F)`);
            score += 0.15;
        } else if (tempC < 35.0) {
            flags.push(`Hypothermia (Temp ${tempC}°C / ${tempF}°F < 35.0°C / 95.0°F)`);
            score += 0.35;
        }
    }

    // Determine decoupled Risk Level and Urgency
    const normalizedScore = Math.min(Number(score.toFixed(2)), 1.0);

    let riskLevel = 'LOW';
    let urgency = 'ROUTINE';

    if (isCriticalDanger || isEmergency || normalizedScore >= 0.7) {
        riskLevel = 'CRITICAL';
        urgency = 'EMERGENCY';
    } else if (normalizedScore >= 0.45) {
        riskLevel = 'HIGH';
        urgency = 'PRIORITY';
    } else if (normalizedScore >= 0.2) {
        riskLevel = 'MODERATE';
        urgency = 'PRIORITY';
    } else {
        riskLevel = 'LOW';
        urgency = 'ROUTINE';
    }

    // Generate action-oriented, strictly non-diagnostic guidance
    let actionRecommendation;
    if (urgency === 'EMERGENCY' || riskLevel === 'CRITICAL') {
        actionRecommendation = 'Immediate emergency clinical stabilization and rapid facility referral required. Do not delay transit.';
    } else if (urgency === 'PRIORITY' || riskLevel === 'HIGH') {
        actionRecommendation = 'Priority medical evaluation recommended at the nearest primary/secondary healthcare facility within 24 hours.';
    } else if (riskLevel === 'MODERATE') {
        actionRecommendation = 'Scheduled clinical consultation recommended. Continue vital sign monitoring with community health worker.';
    } else {
        actionRecommendation = 'Routine primary health follow-up and general wellness maintenance.';
    }

    const explanation = flags.length > 0
        ? `Clinical Flags Identified: ${flags.join('; ')}`
        : 'Vitals are within acceptable baseline clinical limits.';

    return {
        riskLevel,
        urgency,
        riskScore: normalizedScore,
        flaggedFactors: flags,
        explanation,
        actionRecommendation,
        source: 'DETERMINISTIC_RULES',
        requiredHumanReview: riskLevel !== 'LOW' || flags.length > 0,
        ruleVersion: TRIAGE_RULE_VERSION,
        temperatureStandardized: {
            celsius: tempC,
            fahrenheit: tempF
        }
    };
}

module.exports = {
    TRIAGE_RULE_VERSION,
    PHYSIOLOGICAL_BOUNDS,
    CRITICAL_DANGER_KEYWORDS,
    standardizeTemperature,
    validateClinicalVitals,
    evaluateDeterministicTriage
};
