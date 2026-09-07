const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const smsService = require('./smsService');

class NotificationService {
    /**
     * Store in-app notification reliably
     */
    async storeInAppNotification({ userId, title, message, type = 'GENERAL', metadata = {} }) {
        if (!userId) return null;
        const notification = {
            id: crypto.randomUUID(),
            user_id: userId,
            title,
            message,
            type: type.toUpperCase(),
            is_read: false,
            read: false,
            metadata: metadata || {},
            created_at: new Date().toISOString()
        };

        // Always save to localDb
        localDb.insert('notifications', notification);

        // Attempt Supabase insert if not demo mode
        if (!config.demoMode) {
            try {
                const { error } = await supabase.from('notifications').insert([{
                    id: notification.id,
                    user_id: notification.user_id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    is_read: false,
                    created_at: notification.created_at
                }]);
                if (error) {
                    console.warn('[NOTIFICATION] Supabase insert notice (non-fatal):', error.message);
                }
            } catch (err) {
                console.warn('[NOTIFICATION] DB insert error (non-fatal):', err.message);
            }
        }

        return notification;
    }

    /**
     * Dispatch notification across multiple adapters (IN_APP, SMS, PUSH)
     * Resilient: External adapter failures NEVER throw or abort caller.
     */
    async dispatchNotification({
        recipientUserId,
        recipientPhone,
        title,
        message,
        type = 'REFERRAL_UPDATE',
        channels = ['IN_APP'],
        metadata = {}
    }) {
        const results = {
            inApp: null,
            sms: null,
            delivered: false
        };

        // 1. In-App Notification (Always prioritized)
        if (channels.includes('IN_APP') || channels.includes('ALL')) {
            try {
                results.inApp = await this.storeInAppNotification({
                    userId: recipientUserId,
                    title,
                    message,
                    type,
                    metadata
                });
                results.delivered = true;
            } catch (inAppErr) {
                console.warn('[NOTIFICATION] In-App storage notice:', inAppErr.message);
            }
        }

        // 2. SMS Adapter (Resilient dispatch)
        if ((channels.includes('SMS') || channels.includes('ALL')) && recipientPhone) {
            try {
                // Check if smsService has sendOTP or general SMS
                if (typeof smsService.sendSMS === 'function') {
                    results.sms = await smsService.sendSMS(recipientPhone, `${title}: ${message}`);
                } else if (typeof smsService.sendOTP === 'function') {
                    // Fallback to simulated delivery
                    results.sms = { success: true, phone: recipientPhone, provider: 'SimulatedSMS' };
                }
            } catch (smsErr) {
                console.warn('[NOTIFICATION] External SMS adapter notice (non-fatal):', smsErr.message);
                results.sms = { success: false, error: smsErr.message };
            }
        }

        return results;
    }

    /**
     * Helper to automatically dispatch notifications on core referral state changes
     */
    async notifyReferralStateChange({
        referral,
        previousState,
        newState,
        actorUser = {},
        recipientUserId,
        recipientPhone,
        requestId
    }) {
        if (!referral) return null;

        const targetUserId = recipientUserId || referral.patient_id;
        let title = 'Referral Status Update';
        let message = `Your referral status changed to ${newState}`;
        let channels = ['IN_APP'];

        switch (newState) {
            case 'FACILITY_SELECTED':
                title = 'Facility Confirmed for Referral';
                message = `Your referral has been matched to ${referral.facilities?.name || 'the recommended hospital'}.`;
                break;
            case 'APPOINTMENT_BOOKED':
                title = 'Appointment Slot Confirmed';
                message = `Your appointment is confirmed for ${referral.appointment_date || 'the requested date'}. Slot token: ${referral.slot_token || 'Assigned'}.`;
                channels = ['IN_APP', 'SMS'];
                break;
            case 'PATIENT_REACHED':
                title = 'Patient Arrival Verified';
                message = `Patient check-in recorded at hospital desk.`;
                break;
            case 'DOCTOR_ASSIGNED':
                title = 'Specialist Doctor Assigned';
                message = `You have been assigned to ${referral.doctors?.name || 'the attending specialist'}.`;
                break;
            case 'CONSULTATION_COMPLETED':
                title = 'Clinical Consultation Completed';
                message = `Doctor has completed your consultation and recorded clinical findings.`;
                break;
            case 'TREATMENT_COMPLETED':
                title = 'Treatment Stage Completed';
                message = `Your care cycle treatment is complete. Follow-up plan has been registered.`;
                break;
            case 'FOLLOW_UP_COMPLETED':
                title = 'Closed Loop Care Completed';
                message = `Community health worker completed follow-up verification. Referral closed successfully.`;
                break;
            case 'REROUTING_REQUIRED':
                title = 'Referral Rerouting Initiated';
                message = `Facility requested transfer or specialist unavailable. Rerouting to next capability match.`;
                channels = ['IN_APP', 'SMS'];
                break;
            case 'MISSED_APPOINTMENT':
                title = 'Missed Appointment Notification';
                message = `Scheduled appointment was missed. Please contact your health worker to reschedule.`;
                channels = ['IN_APP', 'SMS'];
                break;
            case 'CANCELLED':
                title = 'Referral Cancelled';
                message = `Referral has been cancelled. Reason: ${referral.cancellation_reason || 'Administrative/Patient request'}.`;
                break;
            default:
                message = `Referral transitioned from ${previousState || 'INIT'} to ${newState}.`;
        }

        return this.dispatchNotification({
            recipientUserId: targetUserId,
            recipientPhone,
            title,
            message,
            type: 'REFERRAL_STATE_CHANGE',
            channels,
            metadata: {
                referral_id: referral.id,
                previous_state: previousState,
                new_state: newState,
                actor_id: actorUser.id,
                actor_role: actorUser.role,
                request_id: requestId
            }
        });
    }

    /**
     * Retrieve notifications for a specific user
     */
    async getUserNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
        if (!userId) return [];
        let notifs = [];

        if (!config.demoMode) {
            try {
                let query = supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (unreadOnly) {
                    query = query.eq('is_read', false);
                }

                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    notifs = data;
                }
            } catch (e) {
                // Fallback to localDb
            }
        }

        if (notifs.length === 0) {
            const allLocal = localDb.getCollection('notifications') || [];
            notifs = allLocal.filter(n => n.user_id === userId);
            if (unreadOnly) {
                notifs = notifs.filter(n => !n.is_read && !n.read);
            }
            notifs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }

        return notifs.slice(0, limit);
    }

    /**
     * Mark a single notification as read
     */
    async markNotificationRead(notificationId, userId = null) {
        if (!notificationId) return false;

        // Update localDb
        localDb.update('notifications', n => n.id === notificationId, { is_read: true, read: true });

        if (!config.demoMode) {
            try {
                let query = supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notificationId);
                if (userId) {
                    query = query.eq('user_id', userId);
                }
                await query;
            } catch (e) {}
        }

        return true;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllRead(userId) {
        if (!userId) return false;

        const all = localDb.getCollection('notifications') || [];
        all.forEach(n => {
            if (n.user_id === userId) {
                n.is_read = true;
                n.read = true;
            }
        });
        localDb.save();

        if (!config.demoMode) {
            try {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', userId);
            } catch (e) {}
        }

        return true;
    }
}

module.exports = new NotificationService();
