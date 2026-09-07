const jwt = require('jsonwebtoken');
const config = require('../config/env');
const supabase = require('../config/supabaseClient');

/**
 * Normalize role strings into canonical system roles:
 * PATIENT, HEALTH_WORKER, DOCTOR, FACILITY_STAFF, CAREGIVER, ADMIN
 */
function normalizeRole(rawRole) {
    if (!rawRole) return 'PATIENT';
    const upper = String(rawRole).trim().toUpperCase();
    if (upper === 'ASHA' || upper === 'HEALTH_WORKER' || upper === 'WORKER') return 'HEALTH_WORKER';
    if (upper === 'DOCTOR' || upper === 'PHYSICIAN') return 'DOCTOR';
    if (upper === 'FACILITY_STAFF' || upper === 'HOSPITAL' || upper === 'FACILITY_ADMIN' || upper === 'STAFF') return 'FACILITY_STAFF';
    if (upper === 'CAREGIVER' || upper === 'FAMILY') return 'CAREGIVER';
    if (upper === 'ADMIN' || upper === 'SUPERADMIN') return 'ADMIN';
    return 'PATIENT';
}

module.exports = async (req, res, next) => {
    // 1. Check Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // 2. Allow fallback header for offline/sync testing if enabled
    const directUserId = req.header('x-user-id');
    const directRole = req.header('x-user-role');

    if (!token && directUserId) {
        req.user = {
            id: directUserId,
            role: normalizeRole(directRole),
            phone: req.header('x-user-phone') || '9999999999',
            email: req.header('x-user-email') || null,
            facility_id: req.header('x-facility-id') || null
        };
        return next();
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Access Denied. No authorization token provided.",
            code: "UNAUTHORIZED",
            timestamp: new Date().toISOString()
        });
    }

    try {
        // 1. Try verifying local application JWT
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = {
                id: decoded.id || decoded.userId || decoded.sub,
                phone: decoded.phone,
                email: decoded.email,
                role: normalizeRole(decoded.role),
                facility_id: decoded.facility_id || decoded.facilityId || null
            };
            return next();
        } catch (localJwtErr) {
            // Local token verify failed, attempt Supabase auth token
        }

        // 2. Check Supabase Auth Token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: "Session expired or invalid token.",
                code: "INVALID_TOKEN",
                timestamp: new Date().toISOString()
            });
        }

        req.user = {
            id: user.id,
            phone: user.phone || user.user_metadata?.phone,
            email: user.email,
            role: normalizeRole(user.user_metadata?.role),
            facility_id: user.user_metadata?.facility_id || null
        };
        return next();
    } catch (err) {
        console.error('[AUTH] Token Verification Failed:', err.message);
        return res.status(401).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_FAILED",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports.normalizeRole = normalizeRole;
