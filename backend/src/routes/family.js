const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const verifyToken = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Add a family member (Step 1: Send OTP)
router.post('/add', familyController.initiateFamilyLink);

// Verify family member (Step 2: Check OTP and Confirm)
router.post('/verify', familyController.verifyFamilyLink);

// Get list of all linked family members
router.get('/list', familyController.getFamilyMembers);

// Get specific member details and documents
router.get('/:memberId', familyController.getMemberDetails);

// Remove a family member
router.delete('/:memberId', familyController.removeFamilyMember);

module.exports = router;
