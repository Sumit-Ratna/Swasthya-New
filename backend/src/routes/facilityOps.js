const express = require('express');
const router = express.Router();
const facilityOpsController = require('../controllers/facilityOpsController');

router.get('/overview', (req, res) => facilityOpsController.getOverview(req, res));
router.get('/overview/:facilityId', (req, res) => facilityOpsController.getOverview(req, res));
router.post('/beds', (req, res) => facilityOpsController.updateBeds(req, res));
router.post('/admit', (req, res) => facilityOpsController.admitPatient(req, res));

module.exports = router;
