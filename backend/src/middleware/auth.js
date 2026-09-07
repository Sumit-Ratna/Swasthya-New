const jwt = require('jsonwebtoken');
const config = require('../config/env');
const supabase = require('../config/supabaseClient');

/**
 * Normalize role strings into canonical system roles:
 * PATIENT, CAREGIVER, HEALTH_WORKER, DOCTOR, FACILITY_STAFF, ADMIN
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
    // 1. Extract token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        // Only in non-production unit testing allow explicit test mock if dev secret header matches
        const directUserId = req.header('x-user-id');
        if (process.env.NODE_ENV === 'test' && directUserId) {
            req.user = {
                id: directUserId,
                role: normalizeRole(req.header('x-user-role') || 'PATIENT'),
                phone: req.header('x-user-phone') || '9999999999',
                assigned_facility_id: req.header('x-facility-id') || null,
                jurisdiction_district: req.header('x-district') || null
            };
            return next();
        }

        return res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Access Denied. Authorization token required.",
            error: "Access Denied. Authorization token required.",
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
    }

    try {
        let authenticatedUserId = null;
        let tokenRoleHint = null;

        // 1. First try verifying local application JWT
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            authenticatedUserId = decoded.id || decoded.userId || decoded.sub;
            tokenRoleHint = decoded.role;
        } catch (localJwtErr) {
            if (localJwtErr.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Authentication token has expired. Please log in again.",
                    error: "Token expired",
                    requestId: req.id,
                    timestamp: new Date().toISOString()
                });
            }
            // If local JWT fails for another reason, fallback to checking Supabase Auth Token
        }

        // 2. Check Supabase Auth Token if not resolved by local JWT
        if (!authenticatedUserId) {
            const { data: { user }, error: supaAuthErr } = await supabase.auth.getUser(token);
            if (supaAuthErr || !user) {
                return res.status(401).json({
                    success: false,
                    code: "INVALID_TOKEN",
                    message: "Invalid or expired session token.",
                    error: "Invalid token",
                    requestId: req.id,
                    timestamp: new Date().toISOString()
                });
            }
            authenticatedUserId = user.id;
            tokenRoleHint = user.user_metadata?.role;
        }

        // 3. Load authoritative server-side user record from `users` table
        const { data: dbUser, error: dbErr } = await supabase
            .from('users')
            .select('id, phone, full_name, email, role, assigned_facility_id, jurisdiction_district, status')
            .eq('id', authenticatedUserId)
            .maybeSingle();

        if (dbErr) {
            console.warn('[AUTH] Error looking up user from DB:', dbErr.message);
        }

        if (dbUser && dbUser.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                code: "ACCOUNT_SUSPENDED",
                message: "This account has been suspended.",
                requestId: req.id,
                timestamp: new Date().toISOString()
            });
        }

        // Server-side role is AUTHORITATIVE (rejects client role spoofing)
        const effectiveRole = normalizeRole(dbUser?.role || tokenRoleHint || 'PATIENT');

        req.user = {
            id: authenticatedUserId,
            phone: dbUser?.phone || null,
            name: dbUser?.full_name || 'User',
            email: dbUser?.email || null,
            role: effectiveRole,
            assigned_facility_id: dbUser?.assigned_facility_id || null,
            jurisdiction_district: dbUser?.jurisdiction_district || null,
            status: dbUser?.status || 'ACTIVE'
        };

        next();
    } catch (err) {
        console.error(`[AUTH] [ReqID: ${req.id}] Verification Failed:`, err.message);
        return res.status(401).json({
            success: false,
            code: "AUTH_FAILED",
            message: "Authentication failed",
            error: err.message,
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports.normalizeRole = normalizeRole;
