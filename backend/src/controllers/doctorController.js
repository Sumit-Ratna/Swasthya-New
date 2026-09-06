const dbService = require('../services/supabaseService');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const path = require('path');
const fs = require('fs');

// Get Doctor Dashboard Stats
exports.getDashboard = async (req, res) => {
    try {
        console.log(`[DATABASE] Getting dashboard for doctor: ${req.user.id}`);

        const patients = await dbService.getPatientsByDoctor(req.user.id);
        const patientCount = patients.length;

        const appointments = await dbService.getAppointmentsByDoctor(req.user.id);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointments.filter(apt =>
            apt.appointment_date?.startsWith(today)
        ).length;

        const recentActivity = await dbService.getRecentDoctorActivity(String(req.user.id));

        console.log(`[DATABASE] Dashboard for ${req.user.id}: Found ${recentActivity.length} recent activity items`);

        res.json({
            patientCount,
            todayAppointments,
            recentActivity,
            message: "Dashboard loaded"
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get Doctor's Patients
exports.getMyPatients = async (req, res) => {
    try {
        const patients = await dbService.getPatientsByDoctor(req.user.id);
        res.json(patients);
    } catch (err) {
        console.error("Get patients error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get Patient History
exports.getPatientHistory = async (req, res) => {
    try {
        const { patient_id } = req.params;

        // Verify connection
        const link = await dbService.getDoctorPatientLink(req.user.id, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await dbService.getUser(patient_id);
        const documents = await dbService.getDocumentsByPatient(patient_id);
        const appointments = await dbService.getAppointmentsByPatient(patient_id);

        res.json({
            patient,
            documents,
            appointments
        });
    } catch (err) {
        console.error("Get patient history error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Prescribe Medicine
exports.prescribeMedicine = async (req, res) => {
    try {
        const { patient_id, medicines, instructions, diagnosis } = req.body;
        const doctorId = req.user.id;

        console.log(`[PRESCRIPTION] Prescribing for patient: ${patient_id} by doctor: ${doctorId}`);

        // Verify connection
        const link = await dbService.getDoctorPatientLink(doctorId, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await dbService.getUser(patient_id);
        if (!patient) return res.status(404).json({ error: "Patient not found for prescription" });

        // Fetch full doctor profile to ensure we have name/hospital
        const doctor = await dbService.getUser(doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

        // Generate unique filename for PDF
        const fileName = `Prescription-${Date.now()}-${patient_id.substring(0, 6)}.pdf`;
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);

        // Prepare data for PDF
        const pdfData = {
            hospitalName: doctor.hospital_name || 'HealthNexus Clinic',
            doctorName: doctor.name || 'Doctor',
            doctorSpecialization: doctor.specialization || 'General Physician',
            patientName: patient.name || 'Patient',
            patientAge: patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A',
            patientGender: patient.gender || 'N/A',
            patientPhone: patient.phone || 'N/A',
            visitId: Date.now().toString(),
            symptoms: '',
            diagnosis: diagnosis || 'General Consultation',
            medicines: medicines || [],
            notes: instructions || ''
        };

        // Generate PDF
        await pdfService.generatePrescriptionPDF(pdfData, filePath);

        const prescriptionData = {
            medicines: medicines || [],
            instructions: instructions || '',
            diagnosis: diagnosis || '',
            doctor_id: doctorId,
            prescribed_date: new Date().toISOString()
        };

        const newDoc = await dbService.createDocument({
            patient_id,
            type: 'prescription',
            extracted_data: prescriptionData,
            summary: `Prescription by Dr. ${doctor.name || 'Doctor'}`,
            is_shared: true,
            shared_with: [doctorId],
            file_url: 'uploads/' + fileName
        });

        res.json({
            message: "Prescription created successfully",
            document: newDoc,
            safetyChecks: []
        });
    } catch (err) {
        console.error("Prescribe error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Add Diagnosis Note
exports.addDiagnosisNote = async (req, res) => {
    try {
        const { patient_id, diagnosis, symptoms, treatment_plan } = req.body;
        const doctorId = req.user.id;

        console.log(`[UPDATE] Adding diagnosis for patient: ${patient_id} by doctor: ${doctorId}`);

        // Verify connection
        const link = await dbService.getDoctorPatientLink(doctorId, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await dbService.getUser(patient_id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        // Fetch full doctor profile
        const doctor = await dbService.getUser(doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

        // Generate PDF
        const fileName = `Diagnosis-${Date.now()}-${patient_id.substring(0, 6)}.pdf`;
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);

        const pdfData = {
            hospitalName: doctor.hospital_name || 'HealthNexus Clinic',
            doctorName: doctor.name || 'Doctor',
            doctorSpecialization: doctor.specialization || 'General Physician',
            patientName: patient.name || 'Patient',
            patientAge: patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A',
            patientGender: patient.gender || 'N/A',
            patientPhone: patient.phone || 'N/A',
            visitId: Date.now().toString(),
            symptoms: symptoms || '',
            diagnosis: diagnosis || 'General Diagnosis',
            notes: treatment_plan || ''
        };

        await pdfService.generatePrescriptionPDF(pdfData, filePath);

        const diagnosisData = {
            diagnosis: diagnosis || '',
            symptoms: symptoms || '',
            treatment_plan: treatment_plan || '',
            doctor_id: doctorId,
            diagnosis_date: new Date().toISOString()
        };

        const newDoc = await dbService.createDocument({
            patient_id,
            type: 'diagnosis_note',
            extracted_data: diagnosisData,
            summary: `Diagnosis by Dr. ${doctor.name || 'Doctor'}`,
            is_shared: true,
            shared_with: [doctorId],
            file_url: 'uploads/' + fileName
        });

        res.json({
            message: "Diagnosis note created successfully",
            document: newDoc
        });
    } catch (err) {
        console.error("Diagnosis error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const updates = req.body;

        delete updates.id;
        delete updates.phone;
        delete updates.role;

        await dbService.updateUser(req.user.id, updates);
        const updatedUser = await dbService.getUser(req.user.id);

        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Update Patient Profile (by Doctor)
exports.updatePatientProfile = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { medical_history, lifestyle } = req.body;
        const doctorId = req.user.id;

        // Verify connection
        const link = await dbService.getDoctorPatientLink(doctorId, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const updates = {};
        if (medical_history) updates.medical_history = medical_history;
        if (lifestyle) updates.lifestyle = lifestyle;

        await dbService.updateUser(patient_id, updates);
        const updatedPatient = await dbService.getUser(patient_id);

        res.json({
            message: "Patient profile updated successfully",
            patient: updatedPatient
        });
    } catch (err) {
        console.error("Update patient profile error:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
