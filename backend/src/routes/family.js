const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const verifyToken = require('../middleware/auth');

// Public route to inspect invitation preview token
router.get('/invite-details/:token', familyController.getInvitationDetailsByToken);

// All subsequent routes require authentication
router.use(verifyToken);

// Connect family member via Email (Primary Flow)
router.post('/invite-email', familyController.inviteFamilyMemberByEmail);

// Connect family member via SMS (Mobile Flow)
router.post('/invite-sms', familyController.inviteFamilyMemberByPhone);

// Get pre-formatted WhatsApp share payload
router.get('/whatsapp-payload', familyController.getWhatsAppInvitePayload);

// Family Care Activity Feed
router.get('/activity-feed', familyController.getFamilyActivityFeed);

// Managed Child & Elder Dependent Accounts
router.post('/dependents', familyController.createDependentProfile);
router.get('/dependents/list', familyController.getDependentsList);
router.put('/dependents/:dependentId', familyController.updateDependentProfile);
router.delete('/dependents/:dependentId', familyController.deleteDependentProfile);

// Get pending connection requests (both sent & received)
router.get('/pending', familyController.getPendingInvitations);

// Accept family invitation
router.post('/accept-invite', familyController.acceptFamilyInvitation);

// Decline family invitation
router.post('/decline-invite', familyController.declineFamilyInvitation);

// Cancel a pending invitation sent by user
router.delete('/invite/:invitationId', familyController.cancelFamilyInvitation);

// Legacy backward-compatible endpoints
router.post('/add', familyController.initiateFamilyLink);
router.post('/verify', familyController.verifyFamilyLink);

// Get list of all linked active family members & dependents
router.get('/list', familyController.getFamilyMembers);

// Get specific member details and clinical documents (under authorized scope)
router.get('/:memberId', familyController.getMemberDetails);

// Remove a family member proxy relationship
router.delete('/:memberId', familyController.removeFamilyMember);

module.exports = router;
