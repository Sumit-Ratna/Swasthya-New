const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ error: "User unauthorized" });
        }
        const { unreadOnly, limit } = req.query;
        const notifs = await notificationService.getUserNotifications(userId, {
            unreadOnly: unreadOnly === 'true' || unreadOnly === true,
            limit: parseInt(limit, 10) || 50
        });
        const unreadCount = notifs.filter(n => !n.is_read && !n.read).length;

        // If client expects direct array or object format
        if (req.headers['x-client-format'] === 'object') {
            return res.json({ notifications: notifs, unreadCount });
        }
        res.json(notifs);
    } catch (err) {
        console.error("[NOTIFICATIONS] Get error:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        await notificationService.markNotificationRead(id, userId);
        res.json({ message: "Marked as read", id });
    } catch (err) {
        console.error("[NOTIFICATIONS] Mark Read Error:", err);
        res.status(500).json({ error: "Failed to mark as read" });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ error: "User unauthorized" });
        }
        await notificationService.markAllRead(userId);
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        console.error("[NOTIFICATIONS] Mark All Read Error:", err);
        res.status(500).json({ error: "Failed to mark all as read" });
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { recipientUserId, recipientPhone, title, message, type, channels } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required" });
        }
        const result = await notificationService.dispatchNotification({
            recipientUserId,
            recipientPhone,
            title,
            message,
            type,
            channels: channels || ['IN_APP']
        });
        res.status(201).json({ success: true, result });
    } catch (err) {
        console.error("[NOTIFICATIONS] Send Error:", err);
        res.status(500).json({ error: err.message });
    }
};
