const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const auth = require('../middleware/auth');
const { authorize, requirePatientAccess } = require('../middleware/authorize');

/**
 * Search patients (Health Worker / Doctor / Admin)
 */
router.get('/search', auth, authorize('HEALTH_WORKER', 'DOCTOR', 'FACILITY_STAFF', 'ADMIN'), patientController.searchPatients);

/**
 * Assisted Registration (Health Worker / Doctor / Admin)
 */
router.post('/assisted-registration', auth, authorize('HEALTH_WORKER', 'DOCTOR', 'FACILITY_STAFF', 'ADMIN'), patientController.assistedRegistration);

/**
 * Get Patient Details (Resource-authorized)
 */
router.get('/:id', auth, requirePatientAccess, patientController.getPatient);

/**
 * Get Patient Clinical History (Resource-authorized)
 */
router.get('/:id/history', auth, requirePatientAccess, patientController.getPatientHistory);

/**
 * Update Patient Consent (Resource-authorized or Admin/Worker)
 */
router.put('/:id/consent', auth, requirePatientAccess, patientController.updateConsent);

module.exports = router;
