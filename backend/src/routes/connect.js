const express = require('express');
const router = express.Router();
const connectController = require('../controllers/connectController');
const auth = require('../middleware/auth');

// Patient Routes
router.get('/doctor/qr/:qr_id', auth, connectController.getDoctorDetails);
router.post('/doctor/link', auth, connectController.connectToDoctor);
router.get('/patient/doctors', auth, connectController.getPatientDoctors);

// Doctor Routes
router.get('/doctor/patients', auth, connectController.getDoctorPatients);
router.get('/doctor/patient/:patient_id', auth, connectController.getPatientDetails);

module.exports = router;
