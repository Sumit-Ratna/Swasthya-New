const dbService = require('../services/supabaseService');
const aiService = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const os = require('os');
const uuidv4 = () => crypto.randomUUID();

exports.uploadReport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { patient_id, analyze } = req.body;
        const shouldAnalyze = analyze === 'true' || analyze === true;

        console.log(`[STORAGE] Saving document for patient: ${patient_id}${shouldAnalyze ? ' with AI analysis' : ''}`);

        // Generate a clean unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeOriginalName = (req.file.originalname || 'report.png').replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = uniqueSuffix + '-' + safeOriginalName;
        let fileUrl = 'uploads/' + fileName;

        // Resiliently save to disk (supports Vercel serverless /tmp and local uploads directory)
        try {
            const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
            let uploadDir = isServerless 
                ? path.join(os.tmpdir(), 'uploads') 
                : path.join(__dirname, '../../uploads');

            try {
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, req.file.buffer);
            } catch (diskErr) {
                // If standard path failed (e.g. read-only fs), fallback to os.tmpdir()
                uploadDir = path.join(os.tmpdir(), 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const fallbackFilePath = path.join(uploadDir, fileName);
                fs.writeFileSync(fallbackFilePath, req.file.buffer);
            }
        } catch (storageErr) {
            console.warn('[STORAGE] Disk write skipped due to read-only environment:', storageErr.message);
            // In pure serverless without persistent disk, data URL is preserved for small images
            if (req.file.mimetype && req.file.buffer && req.file.buffer.length < 2 * 1024 * 1024) {
                fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            }
        }

        let initialData = {};
        let sharedWith = [];
        let isShared = false;

        console.log("[DEBUG] Upload Request User:", req.user);
        console.log("[DEBUG] Upload Request Body:", req.body);

        // Determine if uploader is doctor
        let isDoctor = false;
        let doctorId = null;

        if (req.user && req.user.role === 'doctor' && req.user.id) {
            isDoctor = true;
            doctorId = req.user.id;
        } else if (req.body.is_doctor_upload === 'true' && req.body.doctor_id) {
            console.log("[WARNING] Using FormData fallback for doctor identification");
            isDoctor = true;
            doctorId = req.body.doctor_id;
        }

        if (isDoctor && doctorId) {
            console.log("[SUCCESS] Doctor detected. Setting ownership and sharing.");
            initialData.doctor_id = doctorId;
            initialData.uploaded_by = 'doctor';
            sharedWith = [doctorId];
            isShared = true;
        }

        const newDoc = await dbService.createDocument({
            patient_id,
            type: 'lab_report',
            file_url: fileUrl,
            extracted_data: initialData,
            summary: "Uploaded Report",
            is_shared: isShared,
            shared_with: sharedWith
        });

        console.log("[SUCCESS] Document created:", newDoc.id);

        if (!shouldAnalyze) {
            return res.json({
                message: "Report Uploaded Successfully",
                document: newDoc
            });
        }

        // AI Analysis
        try {
            const imageBuffer = req.file.buffer;
            console.log("[AI] Analyzing file with Gemini...");
            const aiResponse = await aiService.analyzeLabReport(imageBuffer, req.file.mimetype);

            let extractedData = aiResponse;
            if (typeof extractedData === 'string') {
                try {
                    const jsonStr = extractedData.replace(/```json/g, '').replace(/```/g, '').trim();
                    extractedData = JSON.parse(jsonStr);
                } catch (e) {
                    extractedData = { summary_text: extractedData };
                }
            }

            const safetyData = { ...initialData, ...extractedData };

            await dbService.updateDocument(newDoc.id, {
                extracted_data: safetyData,
                summary: "AI Analyzed Report"
            });

            res.json({
                message: "Report Analyzed & Saved Successfully",
                document: { ...newDoc, extracted_data: safetyData },
                analysis: extractedData
            });
        } catch (aiErr) {
            console.error("[AI] AI Analysis Failed:", aiErr.message);
            res.json({
                message: "Report Uploaded, but AI Analysis Failed (Quota exceeded)",
                document: newDoc,
                error: aiErr.message
            });
        }

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const docs = await dbService.getDocumentsByPatient(patient_id);

        // Filter hidden documents
        const visibleDocs = docs.filter(doc =>
            doc.extracted_data?.hidden_for_patient !== 'true'
        );

        res.json(visibleDocs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSharing = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_ids } = req.body;

        const doc = await dbService.getDocument(id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        let updateData = {};
        if (Array.isArray(doctor_ids)) {
            updateData.shared_with = doctor_ids;
            updateData.is_shared = doctor_ids.length > 0;
        } else {
            updateData.is_shared = !doc.is_shared;
            if (!updateData.is_shared) updateData.shared_with = [];
        }

        await dbService.updateDocument(id, updateData);

        res.json({
            message: "Sharing settings updated",
            is_shared: updateData.is_shared,
            shared_with: updateData.shared_with
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await dbService.getDocument(id);
        const userId = req.user?.id;
        let role = req.user?.role;

        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Get user if role is missing
        if (userId && !role) {
            const userRec = await dbService.getUser(userId);
            if (userRec) {
                role = userRec.role;
                console.log(`[SYNC] Role restored from DB: ${role}`);
            } else {
                return res.status(401).json({ error: "Session invalid. Please log out and log in again." });
            }
        }

        // DOCTOR DELETION LOGIC
        if (role === 'doctor') {
            const data = document.extracted_data || {};
            const isDoctorCreated = data.uploaded_by === 'doctor' ||
                String(data.doctor_id) === String(userId) ||
                document.type === 'prescription' ||
                document.type === 'diagnosis_note';

            // Case: Doctor created this report -> Delete permanently for everyone
            if (isDoctorCreated) {
                console.log(`[DELETE] Doctor ${userId} deleting OWN record ${id}. Permanent delete.`);
                // Delete file if exists
                if (document.file_url) {
                    const filePath = path.join(__dirname, '../../', document.file_url);
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                }
                await dbService.deleteDocument(id);
                return res.json({ message: "Record deleted permanently from all systems." });
            }

            // Case: Patient report shared with doctor -> Only remove sharing (Keep for patient)
            let sharedWith = document.shared_with || [];
            if (sharedWith.includes(userId)) {
                console.log(`[DELETE] Doctor ${userId} removing shared access to patient record ${id}.`);
                sharedWith = sharedWith.filter(dId => dId !== userId);
                await dbService.updateDocument(id, {
                    shared_with: sharedWith,
                    is_shared: sharedWith.length > 0
                });
                return res.json({ message: "Access removed. The report remains in the patient's records." });
            }

            return res.status(403).json({ error: "Permission Denied. You can only delete your own records or remove shared access." });
        }

        // PATIENT DELETION LOGIC
        if (role === 'patient') {
            if (String(document.patient_id) !== String(userId)) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            const data = document.extracted_data || {};
            const isDoctorCreated = data.uploaded_by === 'doctor' ||
                data.doctor_id ||
                document.type === 'prescription' ||
                document.type === 'diagnosis_note';

            // Case: Patient deleting a Doctor-generated report -> Soft delete (Keep for doctor)
            if (isDoctorCreated) {
                console.log(`[DELETE] Patient ${userId} deleting doctor-generated record ${id}. Soft deleting.`);
                const newData = { ...data, hidden_for_patient: "true" };
                await dbService.updateDocument(id, { extracted_data: newData });
                return res.json({ message: "Report removed from your view. It remains in the clinic's records." });
            }

            // Case: Patient deleting their OWN upload -> Permanent delete
            console.log(`[DELETE] Patient ${userId} deleting their OWN upload ${id}. Permanent delete.`);
            if (document.file_url) {
                const filePath = path.join(__dirname, '../../', document.file_url);
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
            }
            await dbService.deleteDocument(id);
            return res.json({ message: "Record deleted permanently." });
        }

        return res.status(403).json({ error: `Unauthorized (Status: ${role || 'No Role'})` });
    } catch (err) {
        console.error("Delete document error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.analyzeDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await dbService.getDocument(id);

        if (!document) return res.status(404).json({ error: "Document not found" });

        const userId = req.user?.id;
        const role = req.user?.role;

        let canAccess = false;
        if (role === 'patient' && String(document.patient_id) === String(userId)) canAccess = true;
        if (role === 'doctor') {
            const sharedWith = document.shared_with || [];
            if (sharedWith.includes(userId)) canAccess = true;
            if (document.extracted_data && document.extracted_data.doctor_id == userId) canAccess = true;
        }

        if (!document.file_url) {
            return res.status(400).json({ error: "No file attached to this document" });
        }

        const filePath = path.join(__dirname, '../../', document.file_url);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found on server" });
        }

        console.log(`[AI] Analyzing existing document ${id} for user ${userId}`);

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.pdf') mimeType = 'application/pdf';

        const aiResponse = await aiService.analyzeLabReport(fileBuffer, mimeType);

        let extractedData = aiResponse;
        if (typeof extractedData === 'string') {
            try {
                const jsonStr = extractedData.replace(/```json/g, '').replace(/```/g, '').trim();
                extractedData = JSON.parse(jsonStr);
            } catch (e) {
                extractedData = { summary_text: extractedData };
            }
        }

        const oldData = document.extracted_data || {};
        const safeData = { ...oldData, ...extractedData };

        await dbService.updateDocument(id, {
            extracted_data: safeData,
            summary: "AI Analyzed Report"
        });

        res.json({
            message: "Analysis Complete",
            document: { ...document, extracted_data: safeData },
            analysis: safeData
        });

    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
