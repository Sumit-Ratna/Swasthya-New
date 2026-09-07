const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Analytics & KPIs
router.get('/analytics', adminController.getAnalytics);
router.get('/metrics', adminController.getAnalytics);

// User & Workforce Directory
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

// Facility Network & Hospital Capacity
router.get('/facilities', adminController.getFacilities);
router.put('/facilities/:id', adminController.updateFacility);

// AI Disease Surveillance & Outbreak Radar
router.get('/disease-surveillance', adminController.getDiseaseSurveillance);

// Cryptographic Security Audit Ledger
router.get('/audit-ledger', adminController.getAuditLedger);

// System Health & Supabase Telemetry
router.get('/system-health', adminController.getSystemHealth);

module.exports = router;
