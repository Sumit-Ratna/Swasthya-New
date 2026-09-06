const dbService = require('../services/supabaseService');

// Submit Feedback (Patient, Doctor, Health Worker, Caregiver, Admin, Guest)
exports.submitFeedback = async (req, res) => {
    try {
        const {
            rating,
            category,
            feedback_text,
            user_role,
            user_name,
            user_phone,
            metadata
        } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5 stars' });
        }

        if (!feedback_text || feedback_text.trim().length === 0) {
            return res.status(400).json({ error: 'Feedback message cannot be empty' });
        }

        // Determine user identity from token if available, or request body
        const userId = req.user ? req.user.id : null;
        const role = req.user ? (req.user.role || 'patient') : (user_role || 'patient');
        const name = req.user ? (req.user.name || user_name || 'Health Seeker') : (user_name || 'Community Member');
        const phone = req.user ? (req.user.phone || user_phone) : (user_phone || null);

        const feedbackRecord = await dbService.createFeedback({
            user_id: userId,
            user_role: role,
            user_name: name,
            user_phone: phone,
            rating: parseInt(rating),
            category: category || 'General',
            feedback_text: feedback_text.trim(),
            satisfaction_score: `${rating}/5 Stars`,
            metadata: metadata || {}
        });

        console.log(`[FEEDBACK] New feedback recorded from [${role}] ${name}: ${rating}★ - "${feedback_text.substring(0, 40)}..."`);

        res.status(201).json({
            success: true,
            message: 'Thank you! Your feedback has been securely synced to Supabase database.',
            data: feedbackRecord
        });
    } catch (error) {
        console.error('[FEEDBACK ERROR]:', error);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
};

// Get Feedbacks (with optional filters: user_role, category, user_id)
exports.getFeedbacks = async (req, res) => {
    try {
        const { user_role, category, user_id } = req.query;
        const filter = {};
        if (user_role) filter.user_role = user_role;
        if (category) filter.category = category;
        if (user_id) filter.user_id = user_id;

        const list = await dbService.getFeedbacks(filter);
        res.json(list);
    } catch (error) {
        console.error('[GET FEEDBACK ERROR]:', error);
        res.status(500).json({ error: 'Failed to retrieve feedback records' });
    }
};

// Get Overall Feedback Analytics & Rating Summary
exports.getFeedbackStats = async (req, res) => {
    try {
        const stats = await dbService.getFeedbackStats();
        res.json(stats);
    } catch (error) {
        console.error('[FEEDBACK STATS ERROR]:', error);
        res.status(500).json({ error: 'Failed to fetch feedback analytics' });
    }
};
