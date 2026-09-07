const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const { evaluateDeterministicTriage } = require('../domain/clinicalTriageEngine');
require('dotenv').config();

const MEDGEMMA_URL = process.env.MEDGEMMA_URL || "http://localhost:5000";
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS, 10) || 2500;
const FAILURE_THRESHOLD = 3;
const RECOVERY_COOLDOWN_MS = 10000;

// Standard Clinical Safety Disclaimer
const CLINICAL_SAFETY_DISCLAIMER = "This AI-generated summary is for clinical decision support only and does not constitute a diagnostic conclusion, prescription, or therapeutic directive. A qualified medical professional must independently review all raw findings.";

// Risk Level Hierarchy for Deterministic Clamping
const RISK_HIERARCHY = {
    'LOW': 1,
    'MODERATE': 2,
    'HIGH': 3,
    'CRITICAL': 4
};

const URGENCY_HIERARCHY = {
    'ROUTINE': 1,
    'PRIORITY': 2,
    'EMERGENCY': 3
};

/**
 * Resilient AI Circuit Breaker Pattern
 */
class AiCircuitBreaker {
    constructor() {
        this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
        this.consecutiveFailures = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    canExecute() {
        const now = Date.now();
        if (this.state === 'OPEN') {
            if (now - this.lastFailureTime > RECOVERY_COOLDOWN_MS) {
                this.state = 'HALF_OPEN';
                return true;
            }
            return false;
        }
        return true;
    }

    recordSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
        }
        this.consecutiveFailures = 0;
        this.successCount += 1;
    }

    recordFailure() {
        this.consecutiveFailures += 1;
        this.lastFailureTime = Date.now();
        if (this.consecutiveFailures >= FAILURE_THRESHOLD || this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
        }
    }

    getStatus() {
        return {
            state: this.state,
            consecutiveFailures: this.consecutiveFailures,
            lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
            threshold: FAILURE_THRESHOLD,
            cooldownMs: RECOVERY_COOLDOWN_MS
        };
    }

    reset() {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        this.lastFailureTime = null;
    }
}

const circuitBreaker = new AiCircuitBreaker();
exports.circuitBreaker = circuitBreaker;

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
}

// NVIDIA Nemotron / OpenAI-compatible API Helper
async function callNemotronAI(userPrompt, systemPrompt = "You are a professional medical AI assistant. Analyze medical reports, medicines, and clinical data accurately without giving uncertified prescription directives.") {
    const apiKey = process.env.NEMOTRON_API_KEY || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('HERE')) return null;

    const baseUrl = process.env.NEMOTRON_BASE_URL || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    const model = process.env.NEMOTRON_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct';

    const payload = {
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
    };

    const response = await axios.post(`${baseUrl}/chat/completions`, payload, {
        headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
        },
        timeout: 25000
    });

    const content = response.data?.choices?.[0]?.message?.content || '';
    return content;
}

/**
 * Clamps AI triage risk and urgency against the deterministic floor.
 * AI cannot downgrade deterministic severity.
 */
function clampAgainstDeterministicFloor(aiResult, deterministicResult) {
    const aiRiskRank = RISK_HIERARCHY[aiResult?.riskLevel] || 1;
    const detRiskRank = RISK_HIERARCHY[deterministicResult?.riskLevel] || 1;

    const aiUrgencyRank = URGENCY_HIERARCHY[aiResult?.urgency] || 1;
    const detUrgencyRank = URGENCY_HIERARCHY[deterministicResult?.urgency] || 1;

    const finalRiskLevel = detRiskRank >= aiRiskRank ? deterministicResult.riskLevel : aiResult.riskLevel;
    const finalUrgency = detUrgencyRank >= aiUrgencyRank ? deterministicResult.urgency : aiResult.urgency;

    return {
        ...deterministicResult,
        riskLevel: finalRiskLevel,
        urgency: finalUrgency,
        source: 'AI_ASSISTED',
        ai_summary: aiResult?.clinical_summary || deterministicResult.explanation,
        actionRecommendation: aiResult?.action_recommendation || deterministicResult.actionRecommendation,
        ai_concerns: aiResult?.key_concerns || deterministicResult.flaggedFactors,
        disclaimer: CLINICAL_SAFETY_DISCLAIMER
    };
}

/**
 * AI Service Health Check
 */
exports.getAiServiceHealth = async () => {
    const cbStatus = circuitBreaker.getStatus();
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    
    let pythonServiceHealth = {
        status: 'OFFLINE',
        url: MEDGEMMA_URL,
        details: null
    };

    try {
        const response = await axios.get(`${MEDGEMMA_URL}/health`, { timeout: 1500 });
        if (response.status === 200) {
            pythonServiceHealth = {
                status: 'ONLINE',
                url: MEDGEMMA_URL,
                details: response.data
            };
        }
    } catch (err) {
        pythonServiceHealth.details = { error: err.message };
    }

    return {
        status: (cbStatus.state === 'CLOSED' || pythonServiceHealth.status === 'ONLINE') ? 'OPERATIONAL' : 'DEGRADED',
        circuitBreaker: cbStatus,
        geminiConfigured: hasApiKey,
        pythonMicroservice: pythonServiceHealth,
        timeoutMs: AI_TIMEOUT_MS,
        timestamp: new Date().toISOString()
    };
};

/**
 * Safe AI-Augmented Triage
 */
exports.triageAssessmentWithAI = async (vitals) => {
    // 1. Establish deterministic clinical safety baseline
    const deterministicResult = evaluateDeterministicTriage(vitals);

    // If deterministic evaluation is CRITICAL / EMERGENCY, do not delay for AI
    if (deterministicResult.urgency === 'EMERGENCY') {
        return {
            ...deterministicResult,
            disclaimer: CLINICAL_SAFETY_DISCLAIMER
        };
    }

    if (!circuitBreaker.canExecute()) {
        console.warn("[AI_TRIAGE] Circuit breaker is OPEN. Fast-falling back to deterministic rules.");
        return {
            ...deterministicResult,
            source: 'DETERMINISTIC_FALLBACK',
            disclaimer: CLINICAL_SAFETY_DISCLAIMER
        };
    }

    try {
        const genAI = getGeminiClient();
        if (!genAI) {
            return {
                ...deterministicResult,
                source: 'DETERMINISTIC_FALLBACK',
                disclaimer: CLINICAL_SAFETY_DISCLAIMER
            };
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are a clinical decision support AI assisting community health workers.
You MUST NOT generate autonomous disease diagnoses or drug prescriptions. Provide action-oriented guidance.

PATIENT VITALS:
- Systolic BP: ${vitals.systolic_bp || 'Not recorded'} mmHg
- Diastolic BP: ${vitals.diastolic_bp || 'Not recorded'} mmHg
- Pulse Rate: ${vitals.pulse_rate || 'Not recorded'} bpm
- SpO2: ${vitals.spo2 || 'Not recorded'} %
- Respiratory Rate: ${vitals.respiratory_rate || 'Not recorded'} breaths/min
- Temperature: ${vitals.temperature_c ? vitals.temperature_c + '°C' : (vitals.temperature || 'Not recorded')}
- Pregnancy: ${vitals.is_pregnant ? 'Yes' : 'No'}
- Danger Signs / Notes: ${vitals.danger_signs || 'None'}

DETERMINISTIC CLINICAL BASELINE:
- Computed Risk Level: ${deterministicResult.riskLevel}
- Computed Urgency: ${deterministicResult.urgency}
- Flagged Factors: ${JSON.stringify(deterministicResult.flaggedFactors)}

Return a JSON object:
{
  "riskLevel": "LOW | MODERATE | HIGH | CRITICAL",
  "urgency": "ROUTINE | PRIORITY | EMERGENCY",
  "clinical_summary": "Concise summary of vital signs without disease diagnosis",
  "action_recommendation": "Action-oriented recommendation for next clinical step",
  "key_concerns": ["concise list of observations"]
}`;

        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("AI triage request timed out")), AI_TIMEOUT_MS);
            if (timer && timer.unref) timer.unref();
        });

        const aiPromise = (async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        })();

        const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
        if (timer) clearTimeout(timer);
        circuitBreaker.recordSuccess();

        // Enforce deterministic floor clamp
        return clampAgainstDeterministicFloor(aiResponse, deterministicResult);
    } catch (aiErr) {
        circuitBreaker.recordFailure();
        console.warn("[AI_TRIAGE_FALLBACK] AI error. Falling back to deterministic clinical rules:", aiErr.message);
        return {
            ...deterministicResult,
            source: 'DETERMINISTIC_FALLBACK',
            disclaimer: CLINICAL_SAFETY_DISCLAIMER
        };
    }
};

/**
 * Summarize Lab Report with zero-prescription guarantee and safety disclaimer
 */
exports.summarizeLabReport = async (reportText, metadata = {}) => {
    if (!reportText || typeof reportText !== 'string') {
        throw new Error("Invalid lab report text provided");
    }

    if (reportText.length > 10000) {
        throw new Error("Lab report text exceeds maximum allowed length of 10,000 characters");
    }

    // Try MedGemma python service first if circuit breaker allows
    if (circuitBreaker.canExecute()) {
        try {
            const response = await axios.post(`${MEDGEMMA_URL}/analyze-report`, {
                report_text: reportText
            }, { timeout: AI_TIMEOUT_MS });

            circuitBreaker.recordSuccess();
            return {
                summary_text: response.data.analysis,
                structured_data: response.data.structured_data || {},
                patient_name: metadata.patient_name || "Patient",
                disclaimer: CLINICAL_SAFETY_DISCLAIMER,
                prescribing_authority: "NONE",
                source: "MEDGEMMA"
            };
        } catch (err) {
            circuitBreaker.recordFailure();
            console.warn("[MEDGEMMA_FALLBACK] Python microservice failed, falling back to Gemini / rule extractor:", err.message);
        }
    }

    // Try NVIDIA Nemotron API if configured
    try {
        const nemotronResult = await callNemotronAI(
            `Interpret the following medical lab report. 
Do not prescribe medications. Highlight key abnormal indicators and state that clinical evaluation by a medical doctor is required.

REPORT CONTENT:
${reportText}

Provide a structured summary:
- Key Findings
- Out-of-Range Indicators
- Suggested Clinical Discussion Points`,
            "You are a clinical decision support AI assistant. Provide structured, accurate analysis of medical lab reports with zero prescription directives."
        );

        if (nemotronResult) {
            return {
                summary_text: nemotronResult,
                structured_data: {},
                patient_name: metadata.patient_name || "Patient",
                disclaimer: CLINICAL_SAFETY_DISCLAIMER,
                prescribing_authority: "NONE",
                source: "NEMOTRON_AI"
            };
        }
    } catch (nemoErr) {
        console.warn("[NEMOTRON_REPORT_NOTICE] Nemotron call failed, checking next fallback:", nemoErr.message);
    }

    // Fallback to Gemini if configured
    const genAI = getGeminiClient();
    if (genAI && circuitBreaker.canExecute()) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const prompt = `Interpret the following medical lab report. 
Do not prescribe medications. Highlight key abnormal indicators and state that clinical evaluation by a medical doctor is required.

REPORT CONTENT:
${reportText}

Provide a structured summary:
- Key Findings
- Out-of-Range Indicators
- Suggested Clinical Discussion Points`;

            let timer;
            const timeoutPromise = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("Gemini report summarization timed out")), AI_TIMEOUT_MS);
                if (timer && timer.unref) timer.unref();
            });

            const aiPromise = (async () => {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            })();

            const textResult = await Promise.race([aiPromise, timeoutPromise]);
            if (timer) clearTimeout(timer);
            circuitBreaker.recordSuccess();

            return {
                summary_text: textResult,
                structured_data: {},
                patient_name: metadata.patient_name || "Patient",
                disclaimer: CLINICAL_SAFETY_DISCLAIMER,
                prescribing_authority: "NONE",
                source: "GEMINI_FALLBACK"
            };
        } catch (geminiErr) {
            circuitBreaker.recordFailure();
            console.warn("[GEMINI_REPORT_FALLBACK] Gemini summarization failed:", geminiErr.message);
        }
    }

    // Basic heuristic extraction fallback
    return {
        summary_text: `Extracted report of ${reportText.length} characters. Clinical review required.`,
        structured_data: {},
        patient_name: metadata.patient_name || "Patient",
        disclaimer: CLINICAL_SAFETY_DISCLAIMER,
        prescribing_authority: "NONE",
        source: "HEURISTIC_FALLBACK"
    };
};

/**
 * Legacy support for direct text analysis
 */
exports.analyzeTextReport = async (reportText) => {
    return exports.summarizeLabReport(reportText);
};

/**
 * Image-based lab report analysis
 */
exports.analyzeLabReport = async (imageBuffer, mimeType) => {
    const genAI = getGeminiClient();
    if (!genAI) {
        throw new Error("Gemini API key is not configured for image analysis");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const extractionPrompt = `You are a medical data extraction assistant. 
Extract all text from this medical report and organize it into a structured summary for analysis. 
Also, extract structured data like test names, values, units, and reference ranges if present.
Return as a VALID JSON with "text_content", "structured_data", and "patient_name".`;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: mimeType
            },
        };

        const extractionResult = await model.generateContent([extractionPrompt, imagePart]);
        const extractionResponse = await extractionResult.response;
        let extractionText = extractionResponse.text();
        extractionText = extractionText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedJson = JSON.parse(extractionText);

        const summary = await exports.summarizeLabReport(extractedJson.text_content, {
            patient_name: extractedJson.patient_name
        });

        return {
            ...summary,
            structured_data: extractedJson.structured_data || summary.structured_data,
            patient_name: extractedJson.patient_name || summary.patient_name
        };
    } catch (error) {
        console.error("[ERROR] AI Vision/Analysis Error:", error.message);
        throw new Error("Failed to analyze report: " + error.message);
    }
};

/**
 * Check Drug Interactions
 */
/**
 * Check Drug Interactions
 */
exports.checkDrugInteractions = async (newMed, patientHistory) => {
    const prompt = `You are a medical AI checking drug safety.

PATIENT MEDICAL HISTORY:
${JSON.stringify(patientHistory, null, 2)}

NEW MEDICATION TO PRESCRIBE: ${newMed}

ANALYZE FOR:
1. Drug-Allergy Interactions
2. Drug-Disease Contraindications  
3. Drug-Drug Interactions with current medications

RESPONSE FORMAT:

If SAFE:
[SUCCESS] **SAFE TO PRESCRIBE**
No contraindications detected for ${newMed}.

If UNSAFE:
[WARNING] **RED ALERT - DO NOT PRESCRIBE**

**Interaction Type:** [Allergy/Disease/Drug-Drug]
**Risk Level:** [Mild/Moderate/Severe]
**Explanation:** [Clear medical explanation of the risk]
**Alternative:** [Suggest safer alternative if possible]

Be specific, cite the exact interaction, and be concise.`;

    // Try Nemotron AI first if key exists
    try {
        const nemotronResult = await callNemotronAI(prompt, "You are a clinical pharmacology safety AI.");
        if (nemotronResult) return nemotronResult;
    } catch (e) {
        console.warn("[NEMOTRON_DRUG_CHECK_NOTICE] Nemotron call failed, falling back to Gemini:", e.message);
    }

    const genAI = getGeminiClient();
    if (!genAI) {
        return `[INFO] AI drug interaction check unavailable. Please check pharmacology reference manually for ${newMed}.`;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Safety Error:", error);
        throw new Error("Failed to check drug interactions: " + error.message);
    }
};

/**
 * Medical Scribe
 */
exports.scribeConsultation = async (audioTranscript) => {
    const prompt = `You are a medical scribe AI. Create a structured consultation note.

TRANSCRIPT:
"${audioTranscript}"

FORMAT YOUR NOTE AS:

👤 **CHIEF COMPLAINT**
[Patient's main concern in their words]

🔍 **DIAGNOSIS**
[Preliminary or confirmed diagnosis]

💊 **PRESCRIPTION**
1. [Medicine Name] - [Dosage] - [Frequency] - [Duration]
   [Brief indication/purpose]
2. [Continue for all medications]

🧪 **TESTS ORDERED**
• [Test Name] - [Reason for ordering]
• [Continue for all tests]

📅 **FOLLOW-UP**
• [Next appointment date/timeline]
• [Any specific instructions or warnings]

Keep it professional, concise, and medically accurate.`;

    // Try Nemotron AI first
    try {
        const nemotronResult = await callNemotronAI(prompt, "You are an expert clinical medical scribe AI.");
        if (nemotronResult) return nemotronResult;
    } catch (e) {
        console.warn("[NEMOTRON_SCRIBE_NOTICE] Nemotron scribe failed, trying Gemini:", e.message);
    }

    const genAI = getGeminiClient();
    if (!genAI) {
        return `TRANSCRIPT SUMMARY:\n${audioTranscript}\n\n[Note: Clinical scribe AI model unavailable]`;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Scribe Error:", error);
        throw new Error("Failed to transcribe consultation: " + error.message);
    }
};

/**
 * Local Storyboard Generator Helper
 */
function generateLocalExplainerStoryboard(medicineName, patientProfile) {
    const medLower = (medicineName || '').toLowerCase();
    let desc = "essential medical treatment";
    let icon = "tablet";
    let dosageNote = "Follow the exact timing and frequency indicated by your medical practitioner.";

    if (medLower.includes('paracetamol') || medLower.includes('crocin') || medLower.includes('dolo') || medLower.includes('calpol')) {
        desc = "antipyretic and pain-relieving medicine used to reduce fever and alleviate body pain";
        dosageNote = "Take after food with water. Maintain a minimum 4-6 hour gap between doses.";
    } else if (medLower.includes('amoxicillin') || medLower.includes('azithromycin') || medLower.includes('cipro') || medLower.includes('augmentin') || medLower.includes('antibiotic')) {
        desc = "broad-spectrum antibiotic prescribed to eradicate bacterial infections";
        dosageNote = "Take at evenly spaced intervals and finish the entire prescribed duration without skipping.";
    } else if (medLower.includes('metformin') || medLower.includes('glim') || medLower.includes('insulin')) {
        desc = "antidiabetic medication designed to maintain balanced blood glucose levels";
        icon = "blood_vessel";
        dosageNote = "Take with or immediately after meals to avoid gastrointestinal discomfort.";
    } else if (medLower.includes('amlodipine') || medLower.includes('telmisartan') || medLower.includes('atenolol') || medLower.includes('losartan')) {
        desc = "cardiovascular medication to manage and stabilize arterial blood pressure";
        icon = "heart";
        dosageNote = "Take once daily at the same time every morning. Do not stop abruptly.";
    } else if (medLower.includes('omeprazole') || medLower.includes('pantoprazole') || medLower.includes('rabeprazole')) {
        desc = "gastro-protective acid reducer for acidity, reflux, and gastric ulcer healing";
        icon = "stomach";
        dosageNote = "Take on an empty stomach in the morning 30 minutes before breakfast.";
    } else if (medLower.includes('cetirizine') || medLower.includes('levocet') || medLower.includes('allegra') || medLower.includes('montair')) {
        desc = "antihistamine to relieve allergic rhinitis, skin itching, and seasonal allergy symptoms";
        dosageNote = "Preferably take at night as it may induce mild drowsiness.";
    }

    return [
        {
            scene_number: 1,
            title: `Introduction to ${medicineName}`,
            narration: `${medicineName} is an ${desc}. It acts directly inside your body to alleviate symptoms and restore wellness.`,
            visual_description: `3D visual animation of ${medicineName} entering the system and interacting with target tissues.`,
            animation_type: "fade_in",
            main_icon: icon,
            duration_seconds: 6
        },
        {
            scene_number: 2,
            title: "Proper Dosage & Schedule",
            narration: `${dosageNote} Always swallow tablets whole with a full glass of clean water.`,
            visual_description: "Step-by-step dosage clock animation showing water intake and daily reminder schedule.",
            animation_type: "slide_right",
            main_icon: "shield",
            duration_seconds: 6
        },
        {
            scene_number: 3,
            title: "Important Safety Guidelines",
            narration: "Store in a dry location below 25°C away from heat and moisture. Inform your doctor if you have liver or kidney conditions.",
            visual_description: "Medical safety seal animation highlighting safe storage and hydration.",
            animation_type: "pulse",
            main_icon: "shield",
            duration_seconds: 6
        },
        {
            scene_number: 4,
            title: "Clinical Safety Disclaimer",
            narration: CLINICAL_SAFETY_DISCLAIMER,
            visual_description: "Ayushman Bharat certified medical verification shield and consultation advisory.",
            animation_type: "zoom_in",
            main_icon: "check",
            duration_seconds: 5
        }
    ];
}

/**
 * Explainer Video Storyboard Generation
 */
exports.generateMedicalExplainer = async (medicineName, patientProfile, reportContext) => {
    let audienceStyle = "general";
    const age = patientProfile?.age || 70;
    if (age > 60) audienceStyle = "elderly";
    else if (age < 12) audienceStyle = "child";

    const contextStr = typeof reportContext === 'string' ? reportContext : JSON.stringify(reportContext || {});
    const safeContext = contextStr.length > 5000 ? contextStr.substring(0, 5000) + "..." : contextStr;

    let prompt = `You are a medical animation generator.
Context:
Medicine: ${medicineName}
Patient Age: ${age}
Report Context: ${safeContext}

Task: Generate a script and visual storyboard for a 2-3 minute explainer video.

Audience Adaptation:
${audienceStyle === 'elderly' ? "- Use slower pacing, larger text, repetition." : ""}
${audienceStyle === 'child' ? "- Use friendly characters, playful visuals." : ""}
- For Indian patients: Use culturally neutral visuals.

End the video with a mandatory safety disclaimer: "${CLINICAL_SAFETY_DISCLAIMER}"

Return ONLY A VALID JSON ARRAY of scene objects (no markdown, no other text):
[
  {
    "scene_number": 1,
    "title": "Introduction to Medicine",
    "narration": "Narration text explaining how medicine works",
    "visual_description": "3D visual animation description",
    "animation_type": "fade_in",
    "main_icon": "tablet",
    "duration_seconds": 6
  }
]`;

    // 1. Try Nemotron AI first
    try {
        const nemotronResult = await callNemotronAI(prompt, "You are an expert medical video storyboard animation AI. Always return strict valid JSON arrays only.");
        if (nemotronResult) {
            let cleanJson = nemotronResult.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn("[NEMOTRON_EXPLAINER_NOTICE] Nemotron explainer failed, trying fallback:", e.message);
    }

    // 2. Try Gemini if configured
    const genAI = getGeminiClient();
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { responseMimeType: "application/json" }
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (geminiErr) {
            console.warn("[GEMINI_EXPLAINER_NOTICE] Gemini failed or blocked (e.g. 403 / leaked key):", geminiErr.message);
        }
    }

    // 3. Guaranteed instant local medical storyboard fallback
    return generateLocalExplainerStoryboard(medicineName, patientProfile);
};
