const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const auth = require('../middleware/auth');

router.get('/', facilityController.getFacilities);
router.get('/:id', facilityController.getFacility);
router.get('/:id/doctors', facilityController.getFacilityDoctors);
router.patch('/:id/status', auth, facilityController.updateOperationalStatus);

module.exports = router;
