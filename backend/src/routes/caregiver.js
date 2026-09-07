const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');

router.get('/overview', (req, res) => caregiverController.getOverview(req, res));
router.post('/sos', (req, res) => caregiverController.triggerSOS(req, res));

module.exports = router;
