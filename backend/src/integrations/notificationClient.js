const supabase = require('../config/supabaseClient');
const smsService = require('../services/smsService');

class NotificationClient {
    async sendInAppNotification({ userId, title, message, type = 'general' }) {
        if (!userId) return null;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    title,
                    message,
                    type,
                    is_read: false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.warn('[NOTIFICATION_CLIENT] DB insert notice:', error.message);
            }
            return data;
        } catch (err) {
            console.warn('[NOTIFICATION_CLIENT] Notification dispatch exception:', err.message);
            return null;
        }
    }

    async sendSms({ phone, message }) {
        if (!phone || !message) return null;
        try {
            return await smsService.sendSMS(phone, message);
        } catch (err) {
            console.warn('[NOTIFICATION_CLIENT] SMS dispatch notice:', err.message);
            return null;
        }
    }
}

module.exports = new NotificationClient();
