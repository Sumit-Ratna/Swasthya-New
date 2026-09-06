const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

module.exports = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        // 1. First try verifying local application JWT
        if (process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (localJwtErr) {
                // If local verification failed, attempt Supabase token verification
            }
        }

        // 2. Check Supabase Auth Token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: "Session Expired or Invalid Token" });
        }

        req.user = {
            id: user.id,
            phone: user.phone || user.user_metadata?.phone,
            email: user.email,
            role: user.user_metadata?.role || 'patient'
        };
        next();
    } catch (err) {
        console.error('[ERROR] Token Verification Failed:', err.message);
        res.status(401).json({ error: "Authentication failed" });
    }
};
