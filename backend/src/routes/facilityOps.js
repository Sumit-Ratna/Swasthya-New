const express = require('express');
const router = express.Router();
const facilityOpsController = require('../controllers/facilityOpsController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/overview', auth, (req, res, next) => facilityOpsController.getOverview(req, res, next));
router.get('/overview/:facilityId', auth, (req, res, next) => facilityOpsController.getOverview(req, res, next));
router.post('/beds', auth, requireRole(['FACILITY_STAFF', 'ADMIN']), (req, res, next) => facilityOpsController.updateBeds(req, res, next));
router.post('/admit', auth, requireRole(['FACILITY_STAFF', 'ADMIN']), (req, res, next) => facilityOpsController.admitPatient(req, res, next));
router.post('/assign-doctor', auth, requireRole(['FACILITY_STAFF', 'ADMIN', 'DOCTOR']), (req, res, next) => facilityOpsController.assignDoctor(req, res, next));

module.exports = router;
