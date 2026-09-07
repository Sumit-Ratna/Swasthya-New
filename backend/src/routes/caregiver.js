const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/overview', auth, (req, res, next) => caregiverController.getOverview(req, res, next));
router.get('/patients', auth, requireRole(['CAREGIVER', 'ADMIN']), (req, res, next) => caregiverController.getLinkedPatients(req, res, next));
router.post('/link', auth, (req, res, next) => caregiverController.linkPatient(req, res, next));
router.delete('/link/:id', auth, (req, res, next) => caregiverController.revokePatientLink(req, res, next));

// Scoped patient data queries
router.get('/patient/:patientId/referrals', auth, (req, res, next) => caregiverController.getPatientReferrals(req, res, next));
router.get('/patient/:patientId/appointments', auth, (req, res, next) => caregiverController.getPatientAppointments(req, res, next));
router.get('/patient/:patientId/documents', auth, (req, res, next) => caregiverController.getPatientDocuments(req, res, next));

router.post('/sos', auth, (req, res, next) => caregiverController.triggerSOS(req, res, next));

module.exports = router;
