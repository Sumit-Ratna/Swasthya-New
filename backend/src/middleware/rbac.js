const { normalizeRole } = require('./auth');
const supabase = require('../config/supabaseClient');

/**
 * Middleware factory for Role-Based Access Control
 * @param {string[]|string} roles - Array of allowed roles (e.g. ['HEALTH_WORKER', 'DOCTOR', 'ADMIN'])
 */
const requireRole = (roles) => {
    const allowed = Array.isArray(roles) ? roles.map(r => normalizeRole(r)) : [normalizeRole(roles)];

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required before role authorization",
                code: "UNAUTHORIZED",
                timestamp: new Date().toISOString()
            });
        }

        const userRole = normalizeRole(req.user.role);

        // ADMIN has bypass privileges
        if (userRole === 'ADMIN' || allowed.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: `Access Denied. Required role: [${allowed.join(', ')}], Current role: ${userRole}`,
            code: "FORBIDDEN",
            timestamp: new Date().toISOString()
        });
    };
};

/**
 * Middleware verifying patient ownership or linked caregiver access
 */
const requirePatientOrCaregiver = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: "Authentication required", code: "UNAUTHORIZED" });
    }

    const patientId = req.params.patientId || req.params.id || req.body.patient_id || req.query.patient_id;
    const userRole = normalizeRole(req.user.role);

    // Staff / Admin / Health Workers have clinical access
    if (['ADMIN', 'DOCTOR', 'HEALTH_WORKER', 'FACILITY_STAFF'].includes(userRole)) {
        return next();
    }

    // Direct Patient match
    if (req.user.id === patientId) {
        return next();
    }

    // Check caregiver relationship if role is CAREGIVER
    try {
        const { data: link, error } = await supabase
            .from('caregiver_relationships')
            .select('id, status, permission_scope')
            .eq('caregiver_user_id', req.user.id)
            .eq('patient_id', patientId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        if (link) {
            req.caregiverPermission = link.permission_scope;
            return next();
        }
    } catch (err) {
        console.warn('[RBAC] Caregiver lookup error:', err.message);
    }

    return res.status(403).json({
        success: false,
        error: "Access denied to patient health records",
        code: "FORBIDDEN",
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    requireRole,
    requirePatientOrCaregiver
};
