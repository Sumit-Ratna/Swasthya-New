const dbService = require('../services/supabaseService');

// Get Doctor Details by QR ID
exports.getDoctorDetails = async (req, res) => {
    try {
        const { qr_id } = req.params;
        const patient_id = req.user.id;

        // Find doctor by QR ID
        const doctor = await dbService.getUserByQrId(qr_id);

        if (!doctor) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        // Check if already connected
        console.log(`[SEARCH] CHECKING CONNECTION: Patient=${patient_id}, Doctor=${doctor.id} (${doctor.name})`);

        const existingLink = await dbService.getDoctorPatientLink(doctor.id, patient_id);
        console.log(`[LINK] CONNECTION RESULT: ${existingLink ? 'FOUND' : 'NOT FOUND'}`);

        const doctorData = {
            id: doctor.id,
            name: doctor.name,
            specialization: doctor.specialization,
            hospital_name: doctor.hospital_name,
            phone: doctor.phone,
            doctor_qr_id: doctor.doctor_qr_id,
            profile_photo: doctor.profile_photo,
            is_connected: !!existingLink
        };

        res.json(doctorData);
    } catch (err) {
        console.error("Fetch Doctor Error:", err);
        res.status(500).json({ error: "Failed to fetch doctor details" });
    }
};

// Connect Patient to Doctor
exports.connectToDoctor = async (req, res) => {
    try {
        const { doctor_qr_id } = req.body;
        const patient_id = req.user.id;

        // Find doctor
        const doctor = await dbService.getUserByQrId(doctor_qr_id);

        if (!doctor) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        // Check if already connected
        const existingLink = await dbService.getDoctorPatientLink(doctor.id, patient_id);

        if (existingLink) {
            return res.status(409).json({
                error: "Already connected to this doctor",
                is_connected: true
            });
        }

        // Create connection
        const link = await dbService.createDoctorPatientLink({
            doctor_id: doctor.id,
            patient_id,
            status: 'active'
        });

        res.json({
            message: "Successfully connected to doctor",
            link,
            doctor: {
                id: doctor.id,
                name: doctor.name,
                specialization: doctor.specialization
            }
        });

    } catch (err) {
        console.error("Connect Error:", err);
        res.status(500).json({ error: "Failed to connect" });
    }
};

// Get Patient's Connected Doctors
exports.getPatientDoctors = async (req, res) => {
    try {
        const patient_id = req.user.id;
        const doctors = await dbService.getDoctorsByPatient(patient_id);

        res.json(doctors.map(doc => ({
            id: doc.id,
            name: doc.name,
            specialization: doc.specialization,
            hospital_name: doc.hospital_name,
            phone: doc.phone,
            profile_photo: doc.profile_photo
        })));

    } catch (err) {
        console.error("Error fetching doctors:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get Doctor's Connected Patients
exports.getDoctorPatients = async (req, res) => {
    try {
        const doctor_id = req.user.id;
        const patients = await dbService.getPatientsByDoctor(doctor_id);

        res.json(patients.map(p => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            gender: p.gender,
            dob: p.dob,
            blood_group: p.blood_group,
            medical_history: p.medical_history,
            lifestyle: p.lifestyle
        })));

    } catch (err) {
        console.error("Error fetching patients:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get Specific Patient Details (for doctor)
exports.getPatientDetails = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const doctor_id = req.user.id;

        // Verify connection
        const link = await dbService.getDoctorPatientLink(doctor_id, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await dbService.getUser(patient_id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Get patient's documents
        const documents = await dbService.getDocumentsByPatient(patient_id);

        // Filter documents visible to doctor
        const visibleDocs = documents.filter(doc => {
            const isCreator = doc.extracted_data?.doctor_id === doctor_id;

            // 1. If doctor created it, they ALWAYS see it (even if patient hid it)
            if (isCreator) return true;

            // 2. If it's hidden for patient (and not created by this doctor), ignore it
            // (This usually means patient deleted a report from another doctor)
            if (doc.extracted_data?.hidden_for_patient === "true") return false;

            // 3. If explicitly shared with this doctor
            if (doc.is_shared && doc.shared_with?.includes(doctor_id)) return true;

            return false;
        });

        // Get appointments
        const appointments = await dbService.getAppointmentsByPatient(patient_id);

        res.json({
            patient: {
                id: patient.id,
                name: patient.name,
                phone: patient.phone,
                email: patient.email,
                gender: patient.gender,
                dob: patient.dob,
                blood_group: patient.blood_group,
                height: patient.height,
                weight: patient.weight,
                medical_history: patient.medical_history,
                lifestyle: patient.lifestyle
            },
            documents: visibleDocs,
            appointments
        });

    } catch (err) {
        console.error("Error fetching patient details:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
