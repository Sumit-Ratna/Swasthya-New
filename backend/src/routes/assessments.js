const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const auth = require('../middleware/auth');
const { requirePatientAccess } = require('../middleware/authorize');

router.post('/', auth, assessmentController.recordAssessment);
router.get('/patient/:patient_id', auth, requirePatientAccess, assessmentController.getPatientAssessments);

module.exports = router;
