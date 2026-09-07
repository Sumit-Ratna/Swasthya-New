const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const auditService = require('./auditService');
const notificationService = require('./notificationService');

class ProxyAuthorizationError extends Error {
    constructor(message, code = 'PROXY_ERROR', status = 400) {
        super(message);
        this.name = 'ProxyAuthorizationError';
        this.code = code;
        this.status = status;
    }
}

const PROXY_SCOPES = {
    REFERRAL_STATUS: 'REFERRAL_STATUS',
    APPOINTMENTS: 'APPOINTMENTS',
    REMINDERS: 'REMINDERS',
    SELECTED_RECORDS: 'SELECTED_RECORDS',
    FULL_ACCESS: 'FULL_ACCESS'
};

const SCOPE_HIERARCHY = {
    FULL_ACCESS: [
        PROXY_SCOPES.REFERRAL_STATUS,
        PROXY_SCOPES.APPOINTMENTS,
        PROXY_SCOPES.REMINDERS,
        PROXY_SCOPES.SELECTED_RECORDS,
        PROXY_SCOPES.FULL_ACCESS
    ],
    SELECTED_RECORDS: [
        PROXY_SCOPES.SELECTED_RECORDS,
        PROXY_SCOPES.REFERRAL_STATUS,
        PROXY_SCOPES.APPOINTMENTS,
        PROXY_SCOPES.REMINDERS
    ],
    APPOINTMENTS: [
        PROXY_SCOPES.APPOINTMENTS,
        PROXY_SCOPES.REMINDERS
    ],
    REFERRAL_STATUS: [
        PROXY_SCOPES.REFERRAL_STATUS
    ],
    REMINDERS: [
        PROXY_SCOPES.REMINDERS
    ]
};

/**
 * Audit log helper for sensitive proxy operations
 */
async function logProxyAuditEvent({ eventType, patientId, caregiverUserId, actorUserId, scope, details = {} }) {
    try {
        await auditService.logAudit({
            actorId: actorUserId || caregiverUserId,
            actorRole: 'CAREGIVER_PROXY',
            actionType: `PROXY_${eventType}`,
            resourceType: 'CAREGIVER_PROXY',
            resourceId: patientId,
            result: 'SUCCESS',
            metadata: {
                scope: scope || 'DEFAULT',
                caregiver_user_id: caregiverUserId,
                ...details
            }
        });

        // Notify patient when proxy access changes
        if (['GRANT_PROXY', 'REVOKE_PROXY'].includes(eventType) && patientId) {
            await notificationService.dispatchNotification({
                recipientUserId: patientId,
                title: `Caregiver Proxy ${eventType === 'GRANT_PROXY' ? 'Granted' : 'Revoked'}`,
                message: `Caregiver proxy authorization has been ${eventType === 'GRANT_PROXY' ? 'granted' : 'revoked'} with scope: ${scope || 'DEFAULT'}.`,
                type: 'PROXY_AUTH_CHANGE',
                channels: ['IN_APP']
            });
        }
    } catch (err) {
        console.warn('[PROXY_AUDIT] Non-fatal audit log notice:', err.message);
    }
}

/**
 * Grant or create caregiver / family proxy relationship
 */
async function grantProxyAccess({
    patientId,
    caregiverUserId,
    relationshipType = 'FAMILY_MEMBER',
    permissionScope = PROXY_SCOPES.REFERRAL_STATUS,
    requestingUser
}) {
    if (!patientId || !caregiverUserId) {
        throw new ProxyAuthorizationError('patientId and caregiverUserId are required', 'VALIDATION_ERROR', 400);
    }

    if (patientId === caregiverUserId) {
        throw new ProxyAuthorizationError('Patient cannot establish proxy access with themselves', 'INVALID_OPERATION', 400);
    }

    const validScopes = Object.values(PROXY_SCOPES);
    const normalizedScope = (permissionScope || PROXY_SCOPES.REFERRAL_STATUS).toUpperCase();
    if (!validScopes.includes(normalizedScope)) {
        throw new ProxyAuthorizationError(`Invalid permission scope: ${permissionScope}. Valid scopes: ${validScopes.join(', ')}`, 'INVALID_SCOPE', 400);
    }

    // Authorization: Only the patient themselves, an authorized health worker or an admin can grant proxy access
    const actorId = requestingUser?.id;
    const actorRole = (requestingUser?.role || '').toUpperCase();
    const isPatientSelf = actorId === patientId;
    const isAdmin = actorRole === 'ADMIN';
    const isHealthWorker = actorRole === 'HEALTH_WORKER';

    if (!isPatientSelf && !isAdmin && !isHealthWorker) {
        throw new ProxyAuthorizationError('Only the patient, an assigned health worker, or an administrator can grant proxy authorization', 'UNAUTHORIZED_GRANT', 403);
    }

    // Check for existing relationship
    let existing = null;
    try {
        const { data } = await supabase
            .from('caregiver_relationships')
            .select('id')
            .eq('patient_id', patientId)
            .eq('caregiver_user_id', caregiverUserId)
            .maybeSingle();
        if (data) existing = data;
    } catch (e) {}

    if (!existing) {
        existing = localDb.findOne('caregiver_relationships', r =>
            r.patient_id === patientId && (r.caregiver_user_id === caregiverUserId || r.caregiver_id === caregiverUserId)
        );
    }

    const recordId = existing ? existing.id : crypto.randomUUID();
    const relationshipRecord = {
        id: recordId,
        patient_id: patientId,
        caregiver_user_id: caregiverUserId,
        relationship_type: relationshipType.toUpperCase(),
        permission_scope: normalizedScope,
        status: 'ACTIVE',
        revoked_at: null,
        created_at: existing?.created_at || new Date().toISOString()
    };

    let created = null;
    try {
        const { data, error } = await supabase
            .from('caregiver_relationships')
            .upsert(relationshipRecord)
            .select()
            .single();

        if (!error && data) {
            created = data;
        } else if (error) {
            console.warn('[PROXY_AUTH] Supabase upsert notice:', error.message);
        }
    } catch (err) {}

    // Always keep localDb in sync
    if (existing) {
        localDb.update('caregiver_relationships', r => r.id === existing.id, relationshipRecord);
    } else {
        localDb.insert('caregiver_relationships', relationshipRecord);
    }

    if (!created) {
        created = relationshipRecord;
    }

    await logProxyAuditEvent({
        eventType: 'PROXY_ACCESS_GRANTED',
        patientId,
        caregiverUserId,
        actorUserId: actorId,
        scope: normalizedScope,
        details: { relationshipType, scope: normalizedScope }
    });

    return created;
}

/**
 * Revoke caregiver / family proxy authorization
 */
async function revokeProxyAccess({
    relationshipId,
    patientId,
    caregiverUserId,
    requestingUser,
    reason = 'Patient revoked proxy access'
}) {
    // 1. Fetch relationship
    let relationship = null;
    try {
        let query = supabase.from('caregiver_relationships').select('*');
        if (relationshipId) {
            query = query.eq('id', relationshipId);
        } else if (patientId && caregiverUserId) {
            query = query.eq('patient_id', patientId).eq('caregiver_user_id', caregiverUserId);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) relationship = data;
    } catch (e) {}

    if (!relationship) {
        relationship = localDb.findOne('caregiver_relationships', r =>
            (relationshipId && r.id === relationshipId) ||
            (patientId && caregiverUserId && r.patient_id === patientId && (r.caregiver_user_id === caregiverUserId || r.caregiver_id === caregiverUserId))
        );
    }

    if (!relationship) {
        throw new ProxyAuthorizationError('Proxy relationship record not found', 'NOT_FOUND', 404);
    }

    // 2. Authorization: Patient, Caregiver themselves, or Admin can revoke
    const actorId = requestingUser?.id;
    const actorRole = (requestingUser?.role || '').toUpperCase();
    const isPatient = relationship.patient_id === actorId;
    const isCaregiver = (relationship.caregiver_user_id === actorId || relationship.caregiver_id === actorId);
    const isAdmin = actorRole === 'ADMIN';

    if (!isPatient && !isCaregiver && !isAdmin) {
        throw new ProxyAuthorizationError('Unauthorized to revoke this proxy relationship', 'FORBIDDEN', 403);
    }

    const updatedData = {
        status: 'REVOKED',
        revoked_at: new Date().toISOString()
    };

    try {
        await supabase
            .from('caregiver_relationships')
            .update(updatedData)
            .eq('id', relationship.id);
    } catch (e) {}

    localDb.update('caregiver_relationships', r => r.id === relationship.id, updatedData);

    await logProxyAuditEvent({
        eventType: 'PROXY_ACCESS_REVOKED',
        patientId: relationship.patient_id,
        caregiverUserId: relationship.caregiver_user_id || relationship.caregiver_id,
        actorUserId: actorId,
        scope: relationship.permission_scope,
        details: { reason, revokedAt: updatedData.revoked_at }
    });

    return {
        success: true,
        message: 'Proxy authorization revoked successfully',
        relationship_id: relationship.id,
        status: 'REVOKED',
        revoked_at: updatedData.revoked_at
    };
}

/**
 * Validate that a caregiver has active, non-revoked authorization for a target patient and specific scope
 */
async function validateCaregiverAccess({ caregiverUserId, patientId, requiredScope = PROXY_SCOPES.REFERRAL_STATUS }) {
    if (!caregiverUserId || !patientId) {
        throw new ProxyAuthorizationError('caregiverUserId and patientId are required for validation', 'VALIDATION_ERROR', 400);
    }

    // 1. Fetch relationship
    let relationship = null;
    try {
        const { data, error } = await supabase
            .from('caregiver_relationships')
            .select('*')
            .eq('patient_id', patientId)
            .eq('caregiver_user_id', caregiverUserId)
            .maybeSingle();

        if (!error && data) relationship = data;
    } catch (e) {}

    if (!relationship) {
        relationship = localDb.findOne('caregiver_relationships', r =>
            r.patient_id === patientId && (r.caregiver_user_id === caregiverUserId || r.caregiver_id === caregiverUserId)
        );
    }

    // 2. Check existence
    if (!relationship) {
        throw new ProxyAuthorizationError('No proxy authorization exists between caregiver and patient', 'PROXY_NOT_LINKED', 403);
    }

    // 3. Check active / revoked status
    if (relationship.status !== 'ACTIVE' || relationship.revoked_at) {
        throw new ProxyAuthorizationError('Proxy authorization for this patient has been revoked or is inactive', 'PROXY_REVOKED', 403);
    }

    // 4. Check scope permissions
    const grantedScope = relationship.permission_scope || PROXY_SCOPES.REFERRAL_STATUS;
    const allowedScopes = SCOPE_HIERARCHY[grantedScope] || [grantedScope];

    if (!allowedScopes.includes(requiredScope)) {
        throw new ProxyAuthorizationError(
            `Access denied. Required scope '${requiredScope}' is not permitted by active scope '${grantedScope}'.`,
            'SCOPE_UNAUTHORIZED',
            403
        );
    }

    return relationship;
}

/**
 * Get all active patients linked to a caregiver (strict isolation)
 */
async function getCaregiverLinkedPatients(caregiverUserId) {
    if (!caregiverUserId) {
        throw new ProxyAuthorizationError('caregiverUserId is required', 'VALIDATION_ERROR', 400);
    }

    let links = [];
    try {
        const { data, error } = await supabase
            .from('caregiver_relationships')
            .select(`
                id,
                patient_id,
                relationship_type,
                permission_scope,
                status,
                created_at,
                patient:patients!caregiver_relationships_patient_id_fkey(id, full_name, phone, gender, date_of_birth, age)
            `)
            .eq('caregiver_user_id', caregiverUserId)
            .eq('status', 'ACTIVE');

        if (!error && data) {
            links = data;
        }
    } catch (e) {}

    if (!links || links.length === 0) {
        const localLinks = localDb.find('caregiver_relationships', r =>
            (r.caregiver_user_id === caregiverUserId || r.caregiver_id === caregiverUserId) && r.status === 'ACTIVE'
        );

        links = localLinks.map(link => {
            const user = localDb.findOne('users', u => u.id === link.patient_id);
            return {
                ...link,
                patient: user ? {
                    id: user.id,
                    full_name: user.name || user.full_name,
                    phone: user.phone,
                    gender: user.gender,
                    date_of_birth: user.dob || user.date_of_birth
                } : null
            };
        });
    }

    return links;
}

/**
 * Get scoped patient clinical / operational data through proxy
 */
async function getPatientDataProxy({ caregiverUserId, patientId, dataType = 'REFERRALS' }) {
    let requiredScope = PROXY_SCOPES.REFERRAL_STATUS;
    if (dataType === 'APPOINTMENTS') requiredScope = PROXY_SCOPES.APPOINTMENTS;
    if (dataType === 'REMINDERS') requiredScope = PROXY_SCOPES.REMINDERS;
    if (dataType === 'DOCUMENTS' || dataType === 'LAB_REPORTS' || dataType === 'ASSESSMENTS') {
        requiredScope = PROXY_SCOPES.SELECTED_RECORDS;
    }

    // 1. Enforce validation
    const relationship = await validateCaregiverAccess({
        caregiverUserId,
        patientId,
        requiredScope
    });

    // 2. Fetch scoped data
    let result = null;
    if (dataType === 'REFERRALS') {
        const { data } = await supabase
            .from('referrals')
            .select(`
                id,
                status,
                urgency,
                risk_level,
                primary_complaint,
                slot_token,
                created_at,
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        result = data || localDb.find('referrals', r => r.patient_id === patientId);
    } else if (dataType === 'APPOINTMENTS') {
        const { data } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', patientId)
            .order('appointment_date', { ascending: false });

        result = data || localDb.find('appointments', a => a.patient_id === patientId);
    } else if (dataType === 'DOCUMENTS' || dataType === 'LAB_REPORTS') {
        const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        result = data || localDb.find('documents', d => d.patient_id === patientId);
    } else if (dataType === 'ASSESSMENTS') {
        const { data } = await supabase
            .from('assessments')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        result = data || localDb.find('assessments', a => a.patient_id === patientId);
    }

    // 3. Log access audit event for clinical data
    if (requiredScope === PROXY_SCOPES.SELECTED_RECORDS) {
        await logProxyAuditEvent({
            eventType: 'PROXY_CLINICAL_DATA_ACCESSED',
            patientId,
            caregiverUserId,
            scope: relationship.permission_scope,
            details: { dataType, recordCount: Array.isArray(result) ? result.length : 1 }
        });
    }

    return {
        patient_id: patientId,
        data_type: dataType,
        scope_applied: relationship.permission_scope,
        records: result || []
    };
}

module.exports = {
    ProxyAuthorizationError,
    PROXY_SCOPES,
    grantProxyAccess,
    revokeProxyAccess,
    validateCaregiverAccess,
    getCaregiverLinkedPatients,
    getPatientDataProxy,
    logProxyAuditEvent
};
