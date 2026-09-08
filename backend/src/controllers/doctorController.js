const dbService = require('../services/supabaseService');
const supabase = require('../config/supabaseClient');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const { REFERRAL_STATES, transitionReferral } = require('../services/referralStateMachine');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Get Doctor Dashboard Stats
exports.getDashboard = async (req, res, next) => {
    try {
        const patients = await dbService.getPatientsByDoctor(req.user.id);
        const patientCount = patients ? patients.length : 0;

        const appointments = await dbService.getAppointmentsByDoctor(req.user.id);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = (appointments || []).filter(apt =>
            apt.appointment_date?.startsWith(today)
        ).length;

        const recentActivity = await dbService.getRecentDoctorActivity(String(req.user.id));

        res.json({
            success: true,
            patientCount,
            todayAppointments,
            recentActivity: recentActivity || [],
            message: "Dashboard loaded"
        });
    } catch (err) {
        next(err);
    }
};

// Get Doctor's Patients
exports.getMyPatients = async (req, res, next) => {
    try {
        const patients = await dbService.getPatientsByDoctor(req.user.id);
        res.json({
            success: true,
            count: patients ? patients.length : 0,
            data: patients || []
        });
    } catch (err) {
        next(err);
    }
};

// Get Patient History
exports.getPatientHistory = async (req, res, next) => {
    try {
        const { patient_id } = req.params;

        const patient = await dbService.getUser(patient_id);
        const documents = await dbService.getDocumentsByPatient(patient_id);
        const appointments = await dbService.getAppointmentsByPatient(patient_id);

        const { data: referrals } = await supabase
            .from('referrals')
            .select(`
                *,
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier)
            `)
            .eq('patient_id', patient_id)
            .order('created_at', { ascending: false });

        res.json({
            success: true,
            data: {
                patient,
                documents: documents || [],
                appointments: appointments || [],
                referrals: referrals || []
            }
        });
    } catch (err) {
        next(err);
    }
};

// Prescribe Medicine (links to referral lifecycle if referral_id provided)
exports.prescribeMedicine = async (req, res, next) => {
    try {
        const { patient_id, referral_id, medicines, instructions, diagnosis, requires_diagnostics = false } = req.body;
        const doctorId = req.user.id;

        const patient = await dbService.getUser(patient_id);
        if (!patient) return res.status(404).json({ success: false, error: "Patient not found for prescription" });

        const doctor = await dbService.getUser(doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: "Doctor profile not found" });

        // Generate unique filename for PDF
        const fileName = `Prescription-${Date.now()}-${patient_id.substring(0, 6)}.pdf`;
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
            symptoms: '',
            diagnosis: diagnosis || 'General Consultation',
            medicines: medicines || [],
            notes: instructions || ''
        };

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

        // Compute digital signature hash
        const signaturePayload = `${doctorId}:${patient_id}:${diagnosis}:${JSON.stringify(medicines)}:${new Date().toISOString()}`;
        const digitalSig = crypto.createHash('sha256').update(signaturePayload).digest('hex');

        // Persist to prescriptions table
        try {
            await supabase.from('prescriptions').insert([{
                referral_id: referral_id || null,
                patient_id,
                doctor_id: null,
                facility_id: null,
                diagnosis: diagnosis || 'General Consultation',
                items_json: medicines || [],
                instructions: instructions || '',
                digital_signature_hash: digitalSig,
                created_at: new Date().toISOString()
            }]);
        } catch (rxErr) {
            console.warn('[PRESCRIPTION] Table insert notice:', rxErr.message);
        }

        // If referral_id is provided, transition referral state machine
        if (referral_id) {
            try {
                // 1. Move to CONSULTATION_COMPLETED
                await transitionReferral({
                    referralId: referral_id,
                    toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED,
                    actorUserId: doctorId,
                    actorRole: 'DOCTOR',
                    reason: `Prescription issued: ${diagnosis || 'Consultation completed'}`
                });

                // 2. Move to DIAGNOSTICS_PENDING or TREATMENT_COMPLETED
                const nextStatus = requires_diagnostics ? REFERRAL_STATES.DIAGNOSTICS_PENDING : REFERRAL_STATES.TREATMENT_COMPLETED;
                await transitionReferral({
                    referralId: referral_id,
                    toStatus: nextStatus,
                    actorUserId: doctorId,
                    actorRole: 'DOCTOR',
                    reason: requires_diagnostics ? 'Lab tests ordered' : 'Treatment completed, moving to follow-up'
                });
            } catch (tErr) {
                console.warn('[REFERRAL_TRANSITION] State transition notice:', tErr.message);
            }
        }

        res.json({
            success: true,
            message: "Prescription created and linked to referral successfully",
            document: newDoc,
            digital_signature: digitalSig
        });
    } catch (err) {
        next(err);
    }
};

// Add Diagnosis Note
exports.addDiagnosisNote = async (req, res, next) => {
    try {
        const { patient_id, referral_id, diagnosis, symptoms, treatment_plan } = req.body;
        const doctorId = req.user.id;

        const patient = await dbService.getUser(patient_id);
        if (!patient) return res.status(404).json({ success: false, error: "Patient not found" });

        const doctor = await dbService.getUser(doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: "Doctor profile not found" });

        const os = require('os');
        const fileName = `Diagnosis-${Date.now()}-${patient_id.substring(0, 6)}.pdf`;
        const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
        const uploadDir = isServerless ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, '../../uploads');
        try {
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        } catch (dirErr) {
            console.warn('[DOCTOR_DIAGNOSIS] Uploads directory creation notice:', dirErr.message);
        }
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

        if (referral_id) {
            try {
                await transitionReferral({
                    referralId: referral_id,
                    toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED,
                    actorUserId: doctorId,
                    actorRole: 'DOCTOR',
                    reason: `Diagnosis recorded: ${diagnosis || 'Consultation completed'}`
                });
            } catch (tErr) {
                console.warn('[REFERRAL_TRANSITION] State transition notice:', tErr.message);
            }
        }

        res.json({
            success: true,
            message: "Diagnosis note created and attached to record",
            document: newDoc
        });
    } catch (err) {
        next(err);
    }
};

// Update Profile
exports.updateProfile = async (req, res, next) => {
    try {
        const updates = req.body;
        delete updates.id;
        delete updates.phone;
        delete updates.role;

        await dbService.updateUser(req.user.id, updates);
        const updatedUser = await dbService.getUser(req.user.id);

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        next(err);
    }
};

// Update Patient Profile (by Doctor)
exports.updatePatientProfile = async (req, res, next) => {
    try {
        const { patient_id } = req.params;
        const { medical_history, lifestyle } = req.body;

        const updates = {};
        if (medical_history) updates.medical_history = medical_history;
        if (lifestyle) updates.lifestyle = lifestyle;

        await dbService.updateUser(patient_id, updates);
        const updatedPatient = await dbService.getUser(patient_id);

        res.json({
            success: true,
            message: "Patient profile updated successfully",
            patient: updatedPatient
        });
    } catch (err) {
        next(err);
    }
};
