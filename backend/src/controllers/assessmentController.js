const dbService = require('../services/supabaseService');
const aiService = require('../services/aiService');
const { validateClinicalVitals, evaluateDeterministicTriage } = require('../domain/clinicalTriageEngine');

// Record assessment with clinical validation and safe triage
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
            temperature_unit,
            is_pregnant,
            danger_signs
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                error: 'patient_id is required to record a clinical assessment',
                code: 'VALIDATION_ERROR'
            });
        }

        // 1. Explicit physiological plausibility validation
        const validation = validateClinicalVitals({
            systolic_bp,
            diastolic_bp,
            pulse_rate,
            spo2,
            respiratory_rate,
            temperature,
            temperature_unit,
            is_pregnant,
            danger_signs
        });

        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Clinical vitals validation failed: physiological values outside plausible ranges.',
                code: 'VALIDATION_ERROR',
                details: validation.errors
            });
        }

        const assessor_id = req.user?.id || req.user?.phone || null;

        // 2. Safe triage evaluation with transparent AI fallback
        const triageResult = await aiService.triageAssessmentWithAI(validation.validatedVitals);

        // 3. Persist assessment record
        const assessmentPayload = {
            patient_id,
            assessor_id,
            systolic_bp: validation.validatedVitals.systolic_bp || null,
            diastolic_bp: validation.validatedVitals.diastolic_bp || null,
            pulse_rate: validation.validatedVitals.pulse_rate || null,
            spo2: validation.validatedVitals.spo2 || null,
            respiratory_rate: validation.validatedVitals.respiratory_rate || null,
            temperature: validation.validatedVitals.temperature_f || validation.validatedVitals.temperature_c || null,
            temperature_c: validation.validatedVitals.temperature_c || null,
            temperature_f: validation.validatedVitals.temperature_f || null,
            is_pregnant: validation.validatedVitals.is_pregnant,
            danger_signs: validation.validatedVitals.danger_signs || null,
            ai_risk_score: triageResult.riskScore,
            computed_risk_level: triageResult.riskLevel,
            urgency: triageResult.urgency,
            ai_triage_explanation: triageResult.explanation,
            flagged_factors: triageResult.flaggedFactors,
            action_recommendation: triageResult.actionRecommendation,
            source: triageResult.source,
            triage_rule_version: triageResult.ruleVersion,
            required_human_review: triageResult.requiredHumanReview
        };

        const assessment = await dbService.createAssessment(assessmentPayload);

        // 4. Audit Log
        await dbService.logAuditEvent(
            'ASSESSMENT_CREATED',
            assessor_id,
            assessment.id,
            'SUCCESS',
            `Risk: ${triageResult.riskLevel} | Urgency: ${triageResult.urgency} | Source: ${triageResult.source}`
        );

        res.status(201).json({
            message: 'Assessment recorded & risk evaluated',
            assessment,
            triage: {
                risk_level: triageResult.riskLevel,
                urgency: triageResult.urgency,
                risk_score: triageResult.riskScore,
                flagged_factors: triageResult.flaggedFactors,
                action_recommendation: triageResult.actionRecommendation,
                source: triageResult.source,
                required_human_review: triageResult.requiredHumanReview,
                rule_version: triageResult.ruleVersion
            }
        });
    } catch (err) {
        console.error('[ASSESSMENT] Record error:', err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
};

// Authorized triage override endpoint
exports.overrideTriage = async (req, res) => {
    try {
        const assessmentId = req.params.id;
        const { override_risk_level, override_urgency, override_reason } = req.body;

        const validRiskLevels = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
        const validUrgencies = ['ROUTINE', 'PRIORITY', 'EMERGENCY'];

        if (!override_risk_level || !validRiskLevels.includes(override_risk_level.toUpperCase())) {
            return res.status(400).json({
                error: `override_risk_level is required and must be one of: ${validRiskLevels.join(', ')}`,
                code: 'VALIDATION_ERROR'
            });
        }

        if (!override_urgency || !validUrgencies.includes(override_urgency.toUpperCase())) {
            return res.status(400).json({
                error: `override_urgency is required and must be one of: ${validUrgencies.join(', ')}`,
                code: 'VALIDATION_ERROR'
            });
        }

        if (!override_reason || typeof override_reason !== 'string' || override_reason.trim().length < 3) {
            return res.status(400).json({
                error: 'A mandatory, descriptive override_reason is required for clinical audit compliance',
                code: 'VALIDATION_ERROR'
            });
        }

        const user = req.user;
        const normalizedRisk = override_risk_level.toUpperCase();
        const normalizedUrgency = override_urgency.toUpperCase();

        const updatedAssessment = await dbService.overrideAssessmentTriage(
            assessmentId,
            {
                override_risk_level: normalizedRisk,
                override_urgency: normalizedUrgency,
                override_reason: override_reason.trim()
            },
            user
        );

        // Security Audit Log for triage override
        await dbService.logAuditEvent(
            'TRIAGE_OVERRIDE',
            user.id || user.phone,
            assessmentId,
            'SUCCESS',
            `Triage overridden to Risk: ${normalizedRisk}, Urgency: ${normalizedUrgency}. Reason: ${override_reason.trim()}`
        );

        res.json({
            message: 'Clinical triage override successfully applied',
            assessment: updatedAssessment
        });
    } catch (err) {
        console.error('[ASSESSMENT] Override error:', err);
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: 'Assessment not found', code: 'ASSESSMENT_NOT_FOUND' });
        }
        res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
};

// Get single assessment by ID
exports.getAssessmentById = async (req, res) => {
    try {
        const assessment = await dbService.getAssessmentById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found', code: 'ASSESSMENT_NOT_FOUND' });
        }
        res.json(assessment);
    } catch (err) {
        console.error('[ASSESSMENT] Get by ID error:', err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
};

// Get patient assessment history
exports.getPatientAssessments = async (req, res) => {
    try {
        const patientId = req.params.patient_id || req.user.id;
        const assessments = await dbService.getAssessmentsByPatient(patientId);
        res.json(assessments);
    } catch (err) {
        console.error('[ASSESSMENT] History error:', err);
        res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
};
