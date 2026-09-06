const dbService = require('../services/supabaseService');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifs = await dbService.getNotifications(userId);
        res.json(notifs);
    } catch (err) {
        console.error("Get Notifications Error:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.markNotificationRead(id);
        res.json({ message: "Marked as read" });
    } catch (err) {
        console.error("Mark Notification Read Error:", err);
        res.status(500).json({ error: "Failed to mark as read" });
    }
};
