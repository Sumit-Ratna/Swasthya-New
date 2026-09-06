const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/analytics', adminController.getAnalytics);
router.get('/metrics', adminController.getAnalytics);
router.get('/audit-ledger', adminController.getAuditLedger);

module.exports = router;
