const dbService = require('../services/supabaseService');

// Calculate clinical risk level & triage factors
function calculateRisk(vitals) {
    const flags = [];
    let score = 0.0;

    const sys = Number(vitals.systolic_bp);
    const dia = Number(vitals.diastolic_bp);
    const spo2 = Number(vitals.spo2);
    const pulse = Number(vitals.pulse_rate);
    const temp = Number(vitals.temperature);
    const isPreg = vitals.is_pregnant;

    // Hypertensive crisis / Severe preeclampsia
    if (sys >= 160 || dia >= 110) {
        flags.push("Severe Hypertension (BP >= 160/110)");
        score += 0.4;
    } else if (sys >= 140 || dia >= 90) {
        flags.push("Stage 2 Hypertension");
        score += 0.2;
    }

    // Pregnancy specific risk
    if (isPreg && (sys >= 140 || dia >= 90)) {
        flags.push("High Maternal Risk: Pre-eclampsia Alert");
        score += 0.35;
    }

    // Hypoxia
    if (spo2 && spo2 < 90) {
        flags.push("Severe Hypoxia (SpO2 < 90%) - Immediate Oxygen Needed");
        score += 0.5;
    } else if (spo2 && spo2 < 94) {
        flags.push("Moderate Hypoxia (SpO2 90-94%)");
        score += 0.2;
    }

    // Tachycardia / Bradycardia
    if (pulse && (pulse > 120 || pulse < 50)) {
        flags.push(`Abnormal Heart Rate (${pulse} bpm)`);
        score += 0.2;
    }

    // High fever
    if (temp && temp >= 103) {
        flags.push("Hyperpyrexia (Temp >= 103°F)");
        score += 0.2;
    }

    // Danger signs
    if (vitals.danger_signs && vitals.danger_signs.trim().length > 0) {
        flags.push(`Reported Danger Signs: ${vitals.danger_signs}`);
        score += 0.3;
    }

    let level = 'LOW';
    if (score >= 0.6 || (spo2 && spo2 < 90) || (isPreg && sys >= 160)) {
        level = 'EMERGENCY';
    } else if (score >= 0.4) {
        level = 'HIGH';
    } else if (score >= 0.2) {
        level = 'MODERATE';
    }

    const explanation = flags.length > 0
        ? `Flags identified: ${flags.join('; ')}`
        : "Vitals are within acceptable baseline ranges.";

    return {
        ai_risk_score: Math.min(Number(score.toFixed(2)), 1.0),
        computed_risk_level: level,
        ai_triage_explanation: explanation
    };
}

// Record assessment with AI risk triage
exports.recordAssessment = async (req, res) => {
    try {
        const {
            patient_id,
            systolic_bp,
            diastolic_bp,
            pulse_rate,
            spo2,
            respiratory_rate,
            temperature,
            is_pregnant,
            danger_signs
        } = req.body;

        const assessor_id = req.user?.id || null;

        const riskEvaluation = calculateRisk(req.body);

        const assessment = await dbService.createAssessment({
            patient_id,
            assessor_id,
            systolic_bp,
            diastolic_bp,
            pulse_rate,
            spo2,
            respiratory_rate,
            temperature,
            is_pregnant,
            danger_signs,
            ...riskEvaluation
        });

        // Audit log
        await dbService.logAuditEvent(
            'ASSESSMENT_CREATED',
            assessor_id,
            assessment.id,
            'SUCCESS',
            `Risk: ${riskEvaluation.computed_risk_level}, Score: ${riskEvaluation.ai_risk_score}`
        );

        res.status(201).json({
            message: "Assessment recorded & risk evaluated",
            assessment
        });
    } catch (err) {
        console.error("[ASSESSMENT] Record error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get patient assessment history
exports.getPatientAssessments = async (req, res) => {
    try {
        const patientId = req.params.patient_id || req.user.id;
        const assessments = await dbService.getAssessmentsByPatient(patientId);
        res.json(assessments);
    } catch (err) {
        console.error("[ASSESSMENT] History error:", err);
        res.status(500).json({ error: err.message });
    }
};
