const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Dashboard
router.get('/dashboard', doctorController.getDashboard);

// Patient Management
router.get('/patients', doctorController.getMyPatients);
router.get('/patients/:patient_id/history', doctorController.getPatientHistory);
router.put('/patients/:patient_id/profile', doctorController.updatePatientProfile);

// Medical Actions
router.post('/prescribe', doctorController.prescribeMedicine);
router.post('/diagnosis', doctorController.addDiagnosisNote);

// Profile
router.put('/profile', doctorController.updateProfile);

module.exports = router;
