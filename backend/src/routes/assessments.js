const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const auth = require('../middleware/auth');
const { authorize, requirePatientAccess } = require('../middleware/authorize');

// Record a new clinical assessment with deterministic safe triage
router.post('/', auth, assessmentController.recordAssessment);

// Authorized clinical triage override (Doctor, Health Worker, Admin)
router.post(
    '/:id/override',
    auth,
    authorize('DOCTOR', 'HEALTH_WORKER', 'ADMIN', 'FACILITY_STAFF'),
    assessmentController.overrideTriage
);

// Get single assessment by ID
router.get('/:id', auth, assessmentController.getAssessmentById);

// Get assessment history for patient
router.get('/patient/:patient_id', auth, requirePatientAccess, assessmentController.getPatientAssessments);

module.exports = router;
