const { normalizeRole } = require('./auth');
const supabase = require('../config/supabaseClient');

/**
 * 1. Role-Based Access Control Middleware Factory
 * @param {...string} allowedRoles - List of allowed roles (e.g. 'DOCTOR', 'FACILITY_STAFF', 'ADMIN')
 */
function authorize(...allowedRoles) {
    const rolesList = allowedRoles.flat().map(r => normalizeRole(r));

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Authentication required before authorization check",
                requestId: req.id,
                timestamp: new Date().toISOString()
            });
        }

        const userRole = normalizeRole(req.user.role);

        // System ADMIN has global oversight access
        if (userRole === 'ADMIN' || rolesList.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            code: "FORBIDDEN",
            message: `Access Denied. Required role: [${rolesList.join(', ')}], Current role: ${userRole}`,
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
    };
}

/**
 * 2. Resource Authorization Helper: Check if user can access a patient's records
 */
async function canAccessPatient(user, patientId) {
    if (!user || !patientId) return false;
    const role = normalizeRole(user.role);

    // ADMIN has oversight
    if (role === 'ADMIN') return true;

    // Direct Patient match
    if (user.id === patientId) return true;

    // Caregiver relationship check
    if (role === 'CAREGIVER') {
        const { data: link } = await supabase
            .from('caregiver_relationships')
            .select('id, permission_scope, status')
            .eq('caregiver_user_id', user.id)
            .eq('patient_id', patientId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        return !!link;
    }

    // Health Worker in same catchment district
    if (role === 'HEALTH_WORKER') {
        if (!user.jurisdiction_district) return true; // Global worker
        const { data: patient } = await supabase
            .from('patients')
            .select('district')
            .eq('id', patientId)
            .maybeSingle();

        return !patient || !patient.district || patient.district.toLowerCase() === user.jurisdiction_district.toLowerCase();
    }

    // Doctor / Facility Staff: check if patient has active referral to user's facility
    if (role === 'DOCTOR' || role === 'FACILITY_STAFF') {
        if (!user.assigned_facility_id) return true;
        const { data: activeRef } = await supabase
            .from('referrals')
            .select('id')
            .eq('patient_id', patientId)
            .eq('receiving_facility_id', user.assigned_facility_id)
            .limit(1)
            .maybeSingle();

        return !!activeRef;
    }

    return false;
}

/**
 * 3. Resource Authorization Helper: Check if user can access a specific referral
 */
async function canAccessReferral(user, referral) {
    if (!user || !referral) return false;
    const role = normalizeRole(user.role);

    if (role === 'ADMIN') return true;
    if (user.id === referral.patient_id) return true;
    if (user.id === referral.referring_user_id) return true;
    if (user.assigned_facility_id && user.assigned_facility_id === referral.receiving_facility_id) return true;
    if (referral.assigned_doctor_id) {
        const { data: doc } = await supabase
            .from('doctors')
            .select('user_id')
            .eq('id', referral.assigned_doctor_id)
            .maybeSingle();
        if (doc && doc.user_id === user.id) return true;
    }

    // Check caregiver
    if (role === 'CAREGIVER') {
        return canAccessPatient(user, referral.patient_id);
    }

    return false;
}

/**
 * 4. Resource Authorization Helper: Check if user belongs to facility
 */
function belongsToFacility(user, facilityId) {
    if (!user || !facilityId) return false;
    if (normalizeRole(user.role) === 'ADMIN') return true;
    return user.assigned_facility_id === facilityId;
}

/**
 * 5. Resource Authorization Helper: Check caregiver permission scope
 */
async function canManageCaregiverScope(caregiverUserId, patientId, requiredScope = 'FULL_ACCESS') {
    const { data: link } = await supabase
        .from('caregiver_relationships')
        .select('permission_scope, status')
        .eq('caregiver_user_id', caregiverUserId)
        .eq('patient_id', patientId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

    if (!link) return false;
    if (link.permission_scope === 'FULL_ACCESS') return true;
    return link.permission_scope === requiredScope;
}

/**
 * Express Middleware: Validate patient ownership or clinical access
 */
const requirePatientAccess = async (req, res, next) => {
    const patientId = req.params.patient_id || req.params.patientId || req.params.id || req.body.patient_id;
    const allowed = await canAccessPatient(req.user, patientId);

    if (!allowed) {
        return res.status(403).json({
            success: false,
            code: "FORBIDDEN",
            message: "Access Denied: You are not authorized to view or manage this patient record.",
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
    }

    next();
};

module.exports = {
    authorize,
    requireRole: authorize,
    canAccessPatient,
    canAccessReferral,
    belongsToFacility,
    canManageCaregiverScope,
    requirePatientAccess
};
