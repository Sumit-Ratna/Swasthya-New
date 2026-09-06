const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const auth = require('../middleware/auth');

router.get('/', referralController.getAllReferrals);
router.post('/', auth, referralController.createReferral);
router.get('/patient/:patient_id', auth, referralController.getPatientReferrals);
router.get('/facility/:facility_id', auth, referralController.getFacilityReferrals);
router.get('/:id', auth, referralController.getReferralDetails);
router.patch('/:id/status', auth, referralController.updateStatus);
router.patch('/:id/assign-doctor', auth, referralController.assignDoctor);

module.exports = router;
