const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

// Optional auth helper middleware
const optionalAuth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    try {
        if (process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (e) {}
        }

        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
            req.user = {
                id: user.id,
                phone: user.phone || user.user_metadata?.phone,
                email: user.email,
                role: user.user_metadata?.role || 'patient',
                name: user.user_metadata?.name
            };
        }
    } catch (e) {}

    next();
};

// Routes
router.post('/', optionalAuth, feedbackController.submitFeedback);
router.get('/', feedbackController.getFeedbacks);
router.get('/stats', feedbackController.getFeedbackStats);

module.exports = router;
