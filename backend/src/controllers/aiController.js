const aiService = require('../services/aiService');
const dbService = require('../services/supabaseService');

exports.checkSafety = async (req, res) => {
    try {
        const { newMed, patientHistory } = req.body;
        const result = await aiService.checkDrugInteractions(newMed, patientHistory);
        res.json({ analysis: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.scribe = async (req, res) => {
    try {
        const { transcript } = req.body;
        const result = await aiService.scribeConsultation(transcript);
        res.json({ notes: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.generateExplainer = async (req, res) => {
    try {
        const { medicine_name, patient_id, report_context } = req.body;

        // Fetch patient profile if ID exists
        let patientProfile = { age: 70 }; // Default as per "default elderly patients" request

        if (patient_id) {
            const patient = await dbService.getUser(patient_id);
            if (patient && patient.dob) {
                // Calculate age
                const ageDifMs = Date.now() - new Date(patient.dob).getTime();
                const ageDate = new Date(ageDifMs);
                patientProfile = {
                    age: Math.abs(ageDate.getUTCFullYear() - 1970),
                    name: patient.name
                };
            }
        }

        const storyboard = await aiService.generateMedicalExplainer(medicine_name, patientProfile, report_context || "");
        res.json({ storyboard });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.analyzeText = async (req, res) => {
    try {
        const { report_text } = req.body;
        if (!report_text) {
            return res.status(400).json({ error: "No report text provided" });
        }

        console.log("[AI] Analyzing direct text input...");
        const result = await aiService.analyzeTextReport(report_text);
        res.json(result);
    } catch (err) {
        console.error("Text Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
};
