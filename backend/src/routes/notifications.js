const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get user notifications
router.get('/', auth, notificationController.getNotifications);

// Mark all notifications as read for current user
router.put('/read-all', auth, notificationController.markAllRead);

// Mark individual notification as read
router.put('/:id/read', auth, notificationController.markRead);

// Manual notification dispatch (internal/staff/admin)
router.post('/send', auth, notificationController.sendNotification);

module.exports = router;
