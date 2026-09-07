const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 1. Referral Listing & Details
router.get('/', auth, referralController.getAllReferrals);
router.post('/', auth, referralController.createReferral);
router.get('/patient/:patient_id', auth, referralController.getPatientReferrals);
router.get('/facility/:facility_id', auth, referralController.getFacilityReferrals);
router.get('/prescriptions/:id', auth, referralController.getPrescription);
router.get('/:id', auth, referralController.getReferralDetails);

// 2. State Machine Transitions & Lifecycle Actions
router.patch('/:id/status', auth, referralController.updateStatus);
router.post('/:id/assign-doctor', auth, requireRole(['FACILITY_STAFF', 'ADMIN', 'DOCTOR']), referralController.assignDoctor);
router.post('/:id/book-slot', auth, requireRole(['FACILITY_STAFF', 'ADMIN', 'HEALTH_WORKER']), referralController.bookAppointmentSlot);
router.post('/:id/reroute', auth, requireRole(['HEALTH_WORKER', 'FACILITY_STAFF', 'ADMIN']), referralController.rerouteReferral);

// 3. Clinical Care & Consultation Actions
router.post('/:id/consultation', auth, requireRole(['DOCTOR', 'ADMIN']), referralController.completeConsultation);
router.post('/:id/diagnostics/complete', auth, requireRole(['FACILITY_STAFF', 'DOCTOR', 'ADMIN']), referralController.completeDiagnostics);
router.post('/:id/follow-up/schedule', auth, requireRole(['DOCTOR', 'ADMIN']), referralController.scheduleFollowUp);
router.post('/:id/follow-up/complete', auth, requireRole(['HEALTH_WORKER', 'DOCTOR', 'ADMIN']), referralController.completeFollowUp);

module.exports = router;
