const patientRepository = require('../repositories/patientRepository');
const referralRepository = require('../repositories/referralRepository');
const appointmentRepository = require('../repositories/appointmentRepository');
const supabaseService = require('../services/supabaseService');

class PatientController {
    /**
     * Get patient details by ID
     */
    async getPatient(req, res, next) {
        try {
            const { id } = req.params;
            const patient = await patientRepository.findById(id);

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    error: `Patient not found with ID: ${id}`,
                    code: 'PATIENT_NOT_FOUND'
                });
            }

            return res.json({
                success: true,
                data: patient
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get full clinical history for authorized patient
     */
    async getPatientHistory(req, res, next) {
        try {
            const { id } = req.params;
            const patient = await patientRepository.findById(id);

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    error: `Patient not found with ID: ${id}`,
                    code: 'PATIENT_NOT_FOUND'
                });
            }

            // Fetch clinical history entities in parallel
            const [referrals, assessments, documents, appointments] = await Promise.all([
                referralRepository.findByPatient(id).catch(() => []),
                supabaseService.getAssessmentsByPatient(id).catch(() => []),
                supabaseService.getDocumentsByPatient(id).catch(() => []),
                appointmentRepository.findByPatient(id).catch(() => [])
            ]);

            return res.json({
                success: true,
                patient,
                clinicalSummary: {
                    totalReferrals: referrals.length,
                    totalAssessments: assessments.length,
                    totalDocuments: documents.length,
                    totalAppointments: appointments.length
                },
                referrals,
                assessments,
                documents,
                appointments
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update consent status (GRANTED, REVOKED, PENDING)
     */
    async updateConsent(req, res, next) {
        try {
            const { id } = req.params;
            const { consent_status } = req.body;

            if (!consent_status) {
                return res.status(400).json({
                    success: false,
                    error: 'consent_status is required (GRANTED, REVOKED, PENDING)',
                    code: 'VALIDATION_ERROR'
                });
            }

            const updated = await supabaseService.updatePatientConsent(
                id,
                consent_status,
                req.user?.id || null,
                req.user?.role || 'PATIENT'
            );

            return res.json({
                success: true,
                message: `Patient consent updated to ${consent_status}`,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Assisted registration by Health Worker / ASHA / Doctor
     */
    async assistedRegistration(req, res, next) {
        try {
            const workerId = req.user?.id || null;
            const workerRole = req.user?.role || 'HEALTH_WORKER';

            const patient = await supabaseService.registerPatient(req.body, workerId, workerRole);

            return res.status(201).json({
                success: true,
                message: 'Patient registered successfully via assisted onboarding',
                data: patient
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Search patients by name, phone, abha_id
     */
    async searchPatients(req, res, next) {
        try {
            const { q, district } = req.query;

            let results = [];
            if (q) {
                results = await patientRepository.search(q);
            } else if (district) {
                results = await patientRepository.listByDistrict(district);
            } else {
                results = await patientRepository.search('');
            }

            return res.json({
                success: true,
                count: results.length,
                data: results
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new PatientController();
