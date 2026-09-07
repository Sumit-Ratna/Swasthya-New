const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require('dotenv').config();

const genAI = new GoogleGenerativeAI("AIzaSyBUfU9qK2wNsKWWmdo-bNGy_BN7NpJ3C9g");
const MEDGEMMA_URL = process.env.MEDGEMMA_URL || "http://localhost:5000/analyze-report";

exports.analyzeTextReport = async (reportText) => {
    try {
        console.log("[AI] Sending direct text to MedGemma for Deep Medical Analysis...");
        const medGemmaResponse = await axios.post(MEDGEMMA_URL, {
            report_text: reportText
        });

        console.log("[SUCCESS] MedGemma Text Analysis Complete");
        
        return {
            summary_text: medGemmaResponse.data.analysis,
            structured_data: {},
            patient_name: "Patient",
            mentions_medgemma: true,
            is_direct_text: true
        };
    } catch (error) {
        console.error("[ERROR] MedGemma Text Analysis Error:", error.message);
        throw new Error("Failed to analyze text report: " + error.message);
    }
};

exports.analyzeLabReport = async (imageBuffer, mimeType) => {
    try {
        // First step: Use Gemini to extract text from the report (Vision)
        console.log("[AI] Using Gemini 1.5 Flash for Text Extraction");
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

        // Second step: Use MedGemma (local Python service) for medical interpretation
        console.log("[AI] Sending extracted text to MedGemma for Deep Medical Analysis...");
        try {
            const medGemmaResponse = await axios.post(MEDGEMMA_URL, {
                report_text: extractedJson.text_content
            });

            console.log("[SUCCESS] MedGemma Analysis Complete");
            
            return {
                summary_text: medGemmaResponse.data.analysis,
                structured_data: extractedJson.structured_data,
                patient_name: extractedJson.patient_name,
                mentions_medgemma: true
            };
        } catch (medGemmaErr) {
            console.error("[WARNING] MedGemma service failed, falling back to Gemini for analysis:", medGemmaErr.message);
            // Fallback to Gemini for full interpretation if MedGemma isn't running
            return await this.fallbackGeminiAnalysis(extractedJson.text_content);
        }
    } catch (error) {
        console.error("[ERROR] AI Vision/Analysis Error:", error.message);
        throw new Error("Failed to analyze report: " + error.message);
    }
};

exports.fallbackGeminiAnalysis = async (textContent) => {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `Interpret the following medical report text:\n\n${textContent}\n\nProvide a simple summary, key findings, and recommendations.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { summary_text: response.text(), fallback: true };
};

exports.checkDrugInteractions = async (newMed, patientHistory) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Safety Error:", error);
        throw new Error("Failed to check drug interactions: " + error.message);
    }
};

exports.scribeConsultation = async (audioTranscript) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `You are a medical scribe AI. Create a structured consultation note.

TRANSCRIPT:
"${audioTranscript}"

FORMAT YOUR NOTE AS:

👤 **CHIEF COMPLAINT**
[Patient's main concern in their words]

[DEBUG] **DIAGNOSIS**
[Preliminary or confirmed diagnosis]

[PRESCRIPTION] **PRESCRIPTION**
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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Scribe Error:", error);
        throw new Error("Failed to transcribe consultation: " + error.message);
    }
};

exports.generateMedicalExplainer = async (medicineName, patientProfile, reportContext) => {
    try {
        // Using Gemini 1.5 Flash for Video Storyboard (Pro model caused 404)
        console.log("Using Gemini 1.5 Flash for Med Explainer");
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Determine profile specifics
        let audienceStyle = "general";
        const age = patientProfile?.age || 70; // Default to elderly
        if (age > 60) audienceStyle = "elderly";
        else if (age < 12) audienceStyle = "child";

        // Ensure reportContext is a string and not too long to avoid token limits
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

        You are a medical 3D animation generator. A patient has uploaded a medical report that mentions one or more medicines prescribed to them. Your task is to generate a calm, reassuring, and educational 2–3 minute fully 3D animated explainer video that clearly shows how the medicine mentioned in the report works inside the human body, assuming the viewer has no medical background. The animation must use realistic but simplified 3D human anatomy, with clearly labeled organs, smooth camera movements, soft lighting, and a friendly, non-alarming color palette (avoid harsh reds or blacks). The video should begin with a short introduction showing the medicine name and briefly explaining, in simple language, what condition it is commonly used for. Next, show how the medicine enters the body based on the report (tablet, injection, inhaler, etc.), followed by a 3D visualization of absorption into the bloodstream. Then, animate the medicine traveling through blood vessels in a cinematic 3D view and clearly highlight the target organ or system (such as the heart, lungs, brain, liver, or immune system). After that, demonstrate the medicine’s mechanism of action using clear 3D visual metaphors instead of chemical formulas, such as blocking harmful signals, reducing inflammation, killing bacteria, or helping an organ function more smoothly. Continue by showing expected benefits over time through visual improvements inside the body, such as smoother blood flow, relaxed airways, or reduced swelling. End the video with a mandatory safety disclaimer displayed clearly on screen: “This animation is for understanding only. Always take medicines exactly as prescribed by your doctor.” Use short, clear sentences, avoid medical jargon unless unavoidable, and visually explain any technical term if it appears. Do not claim cures, do not show emergency situations, and do not replace professional medical advice. Generate the animation strictly based on the medicine or medicines mentioned in the uploaded medical report. Optionally, adapt pacing and visuals for Indian audiences, elderly patients with slower motion and larger labels, or children with friendlier 3D elements.
        
        IMPORTANT RESPONSE FORMAT:
        You must return a VALID JSON ARRAY of scene objects. Do not wrap in markdown or code blocks.
        
        Structure for each scene object:
        {
          "scene_number": integer,
          "title": "String title of scene",
          "narration": "The exact voiceover text to be spoken",
          "visual_description": "Detailed description of the 3D animation for this scene",
          "animation_type": "One of: fade_in, slide_right, pulse, flow, zoom_in",
          "main_icon": "One of: tablet, injection, lungs, heart, brain, stomach, blood_vessel, liver, kidney, shield, check, warning",
          "duration_seconds": integer (approx 5-10 seconds per scene)
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // In JSON mode, we probably don't need to strip backticks, but good to be safe
        // In JSON mode, we probably don't need to strip backticks, but good to be safe
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("AI Explainer JSON generated (First 100 chars):", cleanText.substring(0, 100));

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error for Explainer:", e);
            console.error("Raw Text:", text);
            throw new Error("AI generated invalid JSON. Please try again.");
        }
    } catch (error) {
        console.error("AI Explainer Error:", error);
        throw new Error("Failed to generate explainer: " + error.message);
    }
};

/**
 * Safe AI-Augmented Triage
 * Evaluates deterministic clinical rules as ground truth.
 * Falls back transparently on any AI timeout or error without failing assessment capture.
 * Never claims autonomous disease diagnosis.
 */
const { evaluateDeterministicTriage } = require('../domain/clinicalTriageEngine');

exports.triageAssessmentWithAI = async (vitals) => {
    // 1. Establish deterministic clinical safety baseline
    const deterministicResult = evaluateDeterministicTriage(vitals);

    // If deterministic evaluation is CRITICAL / EMERGENCY, do not delay for AI
    if (deterministicResult.urgency === 'EMERGENCY') {
        return deterministicResult;
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBUfU9qK2wNsKWWmdo-bNGy_BN7NpJ3C9g";
        if (!apiKey) {
            return deterministicResult;
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
  "clinical_summary": "Concise summary of vital signs without disease diagnosis",
  "action_recommendation": "Action-oriented recommendation for next clinical step",
  "key_concerns": ["concise list of observations"]
}`;

        // Timeout promise after 2 seconds
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI triage request timed out")), 2000)
        );

        const aiPromise = (async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        })();

        const aiResponse = await Promise.race([aiPromise, timeoutPromise]);

        return {
            ...deterministicResult,
            source: 'AI_ASSISTED',
            ai_summary: aiResponse.clinical_summary || deterministicResult.explanation,
            actionRecommendation: aiResponse.action_recommendation || deterministicResult.actionRecommendation,
            ai_concerns: aiResponse.key_concerns || deterministicResult.flaggedFactors
        };
    } catch (aiErr) {
        console.warn("[AI_TRIAGE_FALLBACK] AI unavailable or timed out. Falling back to deterministic clinical rules:", aiErr.message);
        return deterministicResult;
    }
};

