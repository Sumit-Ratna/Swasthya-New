const aiService = require('../services/aiService');
const dbService = require('../services/supabaseService');

/**
 * GET /api/ai/health
 * Returns service status, circuit breaker telemetry, and model readiness without exposing secrets.
 */
exports.getHealth = async (req, res) => {
    try {
        const health = await aiService.getAiServiceHealth();
        res.json(health);
    } catch (err) {
        res.status(500).json({ error: "Failed to evaluate AI health", details: err.message });
    }
};

/**
 * POST /api/ai/triage
 * Runs AI-augmented triage clamped against deterministic safety floor.
 */
exports.triage = async (req, res) => {
    try {
        const vitals = req.body || {};
        const result = await aiService.triageAssessmentWithAI(vitals);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/ai/summarize-report or POST /api/ai/analyze-report
 * Summarizes lab report text with zero prescription guarantee and safety disclaimers.
 */
exports.summarizeReport = async (req, res) => {
    try {
        const reportText = req.body.report_text || req.body.reportText;
        if (!reportText || typeof reportText !== 'string') {
            return res.status(400).json({ error: "No report text provided or invalid format" });
        }

        if (reportText.length > 10000) {
            return res.status(400).json({ error: "Report text exceeds maximum limit of 10,000 characters" });
        }

        const metadata = {
            patient_name: req.body.patient_name || req.body.patientName || "Patient",
            report_type: req.body.report_type || "LAB_REPORT"
        };

        const result = await aiService.summarizeLabReport(reportText, metadata);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.analyzeText = async (req, res) => {
    return exports.summarizeReport(req, res);
};

exports.checkSafety = async (req, res) => {
    try {
        const { newMed, patientHistory } = req.body;
        if (!newMed) {
            return res.status(400).json({ error: "Medication name is required" });
        }
        const result = await aiService.checkDrugInteractions(newMed, patientHistory || {});
        res.json({ analysis: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.scribe = async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) {
            return res.status(400).json({ error: "Transcript is required" });
        }
        const result = await aiService.scribeConsultation(transcript);
        res.json({ notes: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.generateExplainer = async (req, res) => {
    try {
        const { medicine_name, patient_id, report_context } = req.body;

        if (!medicine_name) {
            return res.status(400).json({ error: "Medicine name is required" });
        }

        // Fetch patient profile if ID exists
        let patientProfile = { age: 70 };

        if (patient_id) {
            try {
                const patient = await dbService.getUser(patient_id);
                if (patient && patient.dob) {
                    const ageDifMs = Date.now() - new Date(patient.dob).getTime();
                    const ageDate = new Date(ageDifMs);
                    patientProfile = {
                        age: Math.abs(ageDate.getUTCFullYear() - 1970),
                        name: patient.name
                    };
                }
            } catch (err) {
                // Ignore DB error, use default age profile
            }
        }

        const storyboard = await aiService.generateMedicalExplainer(medicine_name, patientProfile, report_context || "");
        res.json({ storyboard });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/ai/n8n-webhook
 * Dispatches online user queries to external n8n AI agent workflows or cloud fallback.
 */
exports.n8nWebhook = async (req, res) => {
    const axios = require('axios');
    const { query, message, sessionId, userId, language, customWebhookUrl } = req.body;
    const promptText = query || message || '';

    if (!promptText.trim()) {
        return res.status(400).json({ error: 'Query or message text is required' });
    }

    const targetUrl = customWebhookUrl || process.env.N8N_WEBHOOK_URL || null;

    if (targetUrl) {
        try {
            console.log(`[N8N_WEBHOOK] Forwarding query to: ${targetUrl}`);
            const webhookRes = await axios.post(targetUrl, {
                query: promptText,
                message: promptText,
                sessionId: sessionId || req.id,
                userId: userId || req.user?.id || 'guest-user',
                language: language || 'en',
                timestamp: new Date().toISOString()
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 12000
            });

            const output = webhookRes.data;
            const replyText = typeof output === 'string' 
                ? output 
                : (output.reply || output.text || output.message || output.output || output.response || JSON.stringify(output));

            return res.json({
                success: true,
                reply: replyText,
                source: 'n8n_webhook',
                webhookUrl: targetUrl,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.warn('[N8N_WEBHOOK] External call failed, falling back:', err.message);
        }
    }

    // Dynamic Cloud AI Fallback when n8n webhook URL is not configured or offline
    try {
        const aiTriageResult = await aiService.triageAssessmentWithAI({ symptoms: promptText });
        const fallbackReply = `🤖 **Cloud AI Assessment (n8n Online Fallback):**\n\n` +
            `• **Risk Tier:** **${aiTriageResult.triage?.risk_tier || 'EVALUATED'}** (Priority Score: ${aiTriageResult.triage?.priority_score || 50}/100)\n` +
            `• **Recommended Urgency:** ${aiTriageResult.triage?.recommended_urgency || 'ROUTINE'}\n` +
            `• **Suggested Facility:** ${aiTriageResult.triage?.suggested_facility_tier || 'Primary Health Centre / District Hospital'}\n\n` +
            `📝 **Clinical Reasoning:** ${aiTriageResult.triage?.reasoning || 'Evaluated symptoms against safe clinical decision parameters.'}\n\n` +
            `⚠️ *Disclaimer: Decision support only. Configure custom n8n webhook in settings for custom multi-agent execution.*`;

        return res.json({
            success: true,
            reply: fallbackReply,
            source: 'cloud_ai_fallback',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Failed to process online query: ' + err.message
        });
    }
};
