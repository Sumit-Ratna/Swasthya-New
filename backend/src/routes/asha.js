const express = require('express');
const router = express.Router();
const ashaController = require('../controllers/ashaController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/overview', auth, requireRole(['HEALTH_WORKER', 'ADMIN']), (req, res, next) => ashaController.getOverview(req, res, next));
router.post('/beneficiaries', auth, requireRole(['HEALTH_WORKER', 'ADMIN']), (req, res, next) => ashaController.registerBeneficiary(req, res, next));
router.post('/vitals', auth, requireRole(['HEALTH_WORKER', 'ADMIN']), (req, res, next) => ashaController.submitVitals(req, res, next));

// Batch Sync offline operations
router.post('/sync', auth, requireRole(['HEALTH_WORKER', 'ADMIN']), (req, res, next) => ashaController.syncOfflineQueue(req, res, next));
router.post('/sync-offline', auth, requireRole(['HEALTH_WORKER', 'ADMIN']), (req, res, next) => ashaController.syncOfflineQueue(req, res, next));

// Offline cached directory
router.get('/offline-directory', auth, requireRole(['HEALTH_WORKER', 'ADMIN']), (req, res, next) => ashaController.getOfflineDirectory(req, res, next));

module.exports = router;
