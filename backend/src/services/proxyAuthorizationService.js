const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const emailService = require('./emailService');

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

    // Authorization: Only the patient themselves, an authorized health worker, guardian manager, or an admin can grant proxy access
    const actorId = requestingUser?.id;
    const actorRole = (requestingUser?.role || '').toUpperCase();
    const isPatientSelf = actorId === patientId;
    const isAdmin = actorRole === 'ADMIN';
    const isHealthWorker = actorRole === 'HEALTH_WORKER';

    // Check if patient is a managed dependent of the requesting user
    let isManager = false;
    const patientUser = localDb.findOne('users', u => u.id === patientId);
    if (patientUser && (patientUser.managed_by_user_id === actorId || patientUser.is_dependent)) {
        isManager = true;
    }

    if (!isPatientSelf && !isAdmin && !isHealthWorker && !isManager) {
        throw new ProxyAuthorizationError('Only the patient, an assigned health worker, guardian manager, or an administrator can grant proxy authorization', 'UNAUTHORIZED_GRANT', 403);
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

        const rawDocs = data || localDb.find('documents', d => d.patient_id === patientId) || [];
        result = rawDocs.filter(d => {
            const ext = d.extracted_data || {};
            return ext.hidden_from_family !== true && ext.hidden_from_family !== 'true' && ext.hidden_for_patient !== 'true';
        });
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

/**
 * Create a pending family member email invitation
 */
async function createFamilyInvitation({
    patientId,
    caregiverEmail,
    relationshipType = 'FAMILY_MEMBER',
    permissionScope = PROXY_SCOPES.REFERRAL_STATUS,
    requestingUser
}) {
    if (!patientId || !caregiverEmail) {
        throw new ProxyAuthorizationError('patientId and caregiverEmail are required', 'VALIDATION_ERROR', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = caregiverEmail.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
        throw new ProxyAuthorizationError('Invalid email address format', 'INVALID_EMAIL', 400);
    }

    const requesterEmail = (requestingUser?.email || '').trim().toLowerCase();
    if (requesterEmail && requesterEmail === normalizedEmail) {
        throw new ProxyAuthorizationError('You cannot connect your own email as a family member', 'INVALID_OPERATION', 400);
    }

    const validScopes = Object.values(PROXY_SCOPES);
    const normalizedScope = (permissionScope || PROXY_SCOPES.REFERRAL_STATUS).toUpperCase();
    if (!validScopes.includes(normalizedScope)) {
        throw new ProxyAuthorizationError(`Invalid permission scope: ${permissionScope}. Valid scopes: ${validScopes.join(', ')}`, 'INVALID_SCOPE', 400);
    }

    // Check if target user already exists
    let targetUser = null;
    try {
        const { data } = await supabase.from('users').select('id, full_name, email, phone').eq('email', normalizedEmail).maybeSingle();
        if (data) targetUser = data;
    } catch (e) {}

    if (!targetUser) {
        targetUser = localDb.findOne('users', u => u.email && u.email.toLowerCase() === normalizedEmail);
    }

    if (targetUser && targetUser.id === patientId) {
        throw new ProxyAuthorizationError('You cannot connect yourself as a family member', 'INVALID_OPERATION', 400);
    }

    // Check if an active relationship already exists
    if (targetUser) {
        let existingActive = null;
        try {
            const { data } = await supabase
                .from('caregiver_relationships')
                .select('id, status')
                .eq('patient_id', patientId)
                .eq('caregiver_user_id', targetUser.id)
                .eq('status', 'ACTIVE')
                .maybeSingle();
            if (data) existingActive = data;
        } catch (e) {}

        if (!existingActive) {
            existingActive = localDb.findOne('caregiver_relationships', r =>
                r.patient_id === patientId &&
                (r.caregiver_user_id === targetUser.id || r.caregiver_id === targetUser.id) &&
                r.status === 'ACTIVE'
            );
        }

        if (existingActive) {
            throw new ProxyAuthorizationError('This family member is already connected to your account', 'ALREADY_CONNECTED', 409);
        }
    }

    // Check for existing pending invitation for this email from this patient
    const existingPending = localDb.findOne('family_invitations', inv =>
        inv.patient_id === patientId &&
        inv.caregiver_email.toLowerCase() === normalizedEmail &&
        inv.status === 'PENDING'
    );

    const token = crypto.randomBytes(32).toString('hex');
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours validity
    const requesterName = requestingUser?.name || requestingUser?.full_name || 'Family Member';

    let invitationRecord;
    if (existingPending) {
        invitationRecord = {
            ...existingPending,
            invitation_token: token,
            verification_code: verificationCode,
            relationship_type: relationshipType.toUpperCase(),
            permission_scope: normalizedScope,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
        };
        localDb.update('family_invitations', inv => inv.id === existingPending.id, invitationRecord);
    } else {
        invitationRecord = {
            id: crypto.randomUUID(),
            patient_id: patientId,
            requester_name: requesterName,
            requester_email: requesterEmail,
            caregiver_email: normalizedEmail,
            caregiver_user_id: targetUser ? targetUser.id : null,
            relationship_type: relationshipType.toUpperCase(),
            permission_scope: normalizedScope,
            status: 'PENDING',
            invitation_token: token,
            verification_code: verificationCode,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        localDb.insert('family_invitations', invitationRecord);
    }

    // Attempt Supabase sync if table exists
    try {
        await supabase.from('family_invitations').upsert(invitationRecord);
    } catch (supaErr) {
        console.warn('[PROXY_AUTH] Supabase invitation table sync notice:', supaErr.message);
    }

    // Trigger REAL Email Delivery
    const emailResult = await emailService.sendFamilyInvitationEmail({
        to: normalizedEmail,
        requesterName,
        requesterEmail,
        relationshipType: relationshipType,
        permissionScope: normalizedScope,
        token,
        verificationCode,
        expiresAt
    });

    await logProxyAuditEvent({
        eventType: 'INVITATION_SENT',
        patientId,
        caregiverUserId: targetUser?.id,
        actorUserId: requestingUser?.id,
        scope: normalizedScope,
        details: {
            caregiverEmail: normalizedEmail,
            relationshipType,
            expiresAt,
            emailDelivery: emailResult.success
        }
    });

    return {
        id: invitationRecord.id,
        caregiver_email: normalizedEmail,
        relationship_type: relationshipType,
        permission_scope: normalizedScope,
        status: 'PENDING',
        verification_code: verificationCode,
        invitation_token: token,
        expires_at: expiresAt,
        message: `Verification email successfully sent to ${normalizedEmail}. Waiting for family member to accept.`
    };
}

/**
 * Get all pending invitations sent and received by user
 */
async function getPendingInvitations(userId) {
    if (!userId) return { sent: [], received: [] };

    const user = localDb.findOne('users', u => u.id === userId);
    const userEmail = user?.email ? user.email.toLowerCase() : '';

    const allInvitations = localDb.getCollection('family_invitations') || [];
    const now = new Date();

    // Mark expired ones
    allInvitations.forEach(inv => {
        if (inv.status === 'PENDING' && new Date(inv.expires_at) < now) {
            inv.status = 'EXPIRED';
        }
    });
    localDb.save();

    const sent = allInvitations.filter(inv => inv.patient_id === userId && inv.status === 'PENDING');
    const received = allInvitations.filter(inv =>
        (inv.caregiver_user_id === userId || (userEmail && inv.caregiver_email && inv.caregiver_email.toLowerCase() === userEmail)) &&
        inv.status === 'PENDING'
    );

    return { sent, received };
}

/**
 * Get invitation details by secure token
 */
async function getInvitationByToken(token) {
    if (!token) throw new ProxyAuthorizationError('Token is required', 'VALIDATION_ERROR', 400);

    let invitation = localDb.findOne('family_invitations', inv => inv.invitation_token === token);
    if (!invitation) {
        try {
            const { data } = await supabase.from('family_invitations').select('*').eq('invitation_token', token).maybeSingle();
            if (data) invitation = data;
        } catch (e) {}
    }

    if (!invitation) {
        throw new ProxyAuthorizationError('Invitation not found or link is invalid.', 'NOT_FOUND', 404);
    }

    if (new Date(invitation.expires_at) < new Date() && invitation.status === 'PENDING') {
        invitation.status = 'EXPIRED';
        localDb.update('family_invitations', inv => inv.id === invitation.id, { status: 'EXPIRED' });
    }

    return invitation;
}

/**
 * Accept family invitation and activate proxy relationship
 */
async function acceptFamilyInvitation({ token, verificationCode, acceptingUser }) {
    if (!token && !verificationCode) {
        throw new ProxyAuthorizationError('Verification token or code is required', 'VALIDATION_ERROR', 400);
    }

    let invitation = null;
    const allInvitations = localDb.getCollection('family_invitations') || [];

    if (token) {
        invitation = allInvitations.find(inv => inv.invitation_token === token);
    } else if (verificationCode) {
        const acceptingEmail = (acceptingUser?.email || '').trim().toLowerCase();
        invitation = allInvitations.find(inv =>
            inv.verification_code === String(verificationCode).trim() &&
            (!acceptingEmail || inv.caregiver_email.toLowerCase() === acceptingEmail)
        );
        if (!invitation) {
            invitation = allInvitations.find(inv => inv.verification_code === String(verificationCode).trim() && inv.status === 'PENDING');
        }
    }

    if (!invitation) {
        throw new ProxyAuthorizationError('Invalid or non-existent verification request', 'NOT_FOUND', 404);
    }

    if (invitation.status === 'ACCEPTED') {
        throw new ProxyAuthorizationError('This family invitation has already been accepted and activated', 'ALREADY_USED', 400);
    }

    if (invitation.status === 'DECLINED') {
        throw new ProxyAuthorizationError('This family invitation was previously declined', 'DECLINED_REQUEST', 400);
    }

    if (invitation.status === 'CANCELLED') {
        throw new ProxyAuthorizationError('This family invitation was cancelled by the sender', 'CANCELLED_REQUEST', 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
        localDb.update('family_invitations', inv => inv.id === invitation.id, { status: 'EXPIRED' });
        throw new ProxyAuthorizationError('This verification request has expired. Please request a new invitation.', 'EXPIRED_REQUEST', 400);
    }

    const caregiverUserId = acceptingUser?.id;
    if (!caregiverUserId) {
        throw new ProxyAuthorizationError('Accepting user must be authenticated', 'UNAUTHENTICATED', 401);
    }

    if (invitation.patient_id === caregiverUserId) {
        throw new ProxyAuthorizationError('Cannot accept a family invitation sent by yourself', 'INVALID_OPERATION', 400);
    }

    // 1. Establish the active proxy relationship
    const relationship = await grantProxyAccess({
        patientId: invitation.patient_id,
        caregiverUserId: caregiverUserId,
        relationshipType: invitation.relationship_type,
        permissionScope: invitation.permission_scope,
        requestingUser: { id: invitation.patient_id, role: 'PATIENT' }
    });

    // 2. Mark invitation as ACCEPTED
    const updatedInvitation = {
        ...invitation,
        status: 'ACCEPTED',
        caregiver_user_id: caregiverUserId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    localDb.update('family_invitations', inv => inv.id === invitation.id, updatedInvitation);
    try {
        await supabase.from('family_invitations').upsert(updatedInvitation);
    } catch (e) {}

    // 3. Send confirmation email and in-app notifications
    const memberName = acceptingUser.name || acceptingUser.full_name || 'Family Member';
    try {
        await emailService.sendFamilyConnectedConfirmationEmail({
            to: invitation.caregiver_email,
            requesterName: invitation.requester_name || 'Patient',
            memberName,
            relationshipType: invitation.relationship_type
        });

        await notificationService.dispatchNotification({
            recipientUserId: invitation.patient_id,
            title: 'Family Member Connected',
            message: `${memberName} (${invitation.caregiver_email}) accepted your family connection request.`,
            type: 'FAMILY_LINK_ACTIVE',
            channels: ['IN_APP']
        });
    } catch (notifErr) {
        console.warn('[PROXY_AUTH] Post-acceptance notification notice:', notifErr.message);
    }

    await logProxyAuditEvent({
        eventType: 'INVITATION_ACCEPTED',
        patientId: invitation.patient_id,
        caregiverUserId,
        actorUserId: caregiverUserId,
        scope: invitation.permission_scope,
        details: {
            invitationId: invitation.id,
            relationshipType: invitation.relationship_type
        }
    });

    return {
        success: true,
        message: 'Family connection successfully verified and activated.',
        relationship,
        invitation: updatedInvitation
    };
}

/**
 * Decline family invitation
 */
async function declineFamilyInvitation({ token, verificationCode, decliningUser }) {
    let invitation = null;
    const allInvitations = localDb.getCollection('family_invitations') || [];

    if (token) {
        invitation = allInvitations.find(inv => inv.invitation_token === token);
    } else if (verificationCode) {
        invitation = allInvitations.find(inv => inv.verification_code === String(verificationCode).trim());
    }

    if (!invitation) {
        throw new ProxyAuthorizationError('Invitation not found', 'NOT_FOUND', 404);
    }

    const updated = {
        ...invitation,
        status: 'DECLINED',
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    localDb.update('family_invitations', inv => inv.id === invitation.id, updated);
    try {
        await supabase.from('family_invitations').upsert(updated);
    } catch (e) {}

    // Notify requester
    try {
        await notificationService.dispatchNotification({
            recipientUserId: invitation.patient_id,
            title: 'Family Invitation Declined',
            message: `The family connection request to ${invitation.caregiver_email} was declined.`,
            type: 'FAMILY_LINK_DECLINED',
            channels: ['IN_APP']
        });
    } catch (e) {}

    return { success: true, message: 'Family connection request was declined.' };
}

/**
 * Cancel pending invitation by requester
 */
async function cancelFamilyInvitation({ invitationId, userId }) {
    if (!invitationId || !userId) {
        throw new ProxyAuthorizationError('invitationId and userId are required', 'VALIDATION_ERROR', 400);
    }

    const invitation = localDb.findOne('family_invitations', inv => inv.id === invitationId);
    if (!invitation) {
        throw new ProxyAuthorizationError('Invitation not found', 'NOT_FOUND', 404);
    }

    if (invitation.patient_id !== userId) {
        throw new ProxyAuthorizationError('Unauthorized to cancel this invitation', 'FORBIDDEN', 403);
    }

    const updated = {
        ...invitation,
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    localDb.update('family_invitations', inv => inv.id === invitation.id, updated);
    try {
        await supabase.from('family_invitations').upsert(updated);
    } catch (e) {}

    return { success: true, message: 'Pending invitation cancelled successfully.' };
}

module.exports = {
    ProxyAuthorizationError,
    PROXY_SCOPES,
    grantProxyAccess,
    revokeProxyAccess,
    validateCaregiverAccess,
    getCaregiverLinkedPatients,
    getPatientDataProxy,
    logProxyAuditEvent,
    createFamilyInvitation,
    getPendingInvitations,
    getInvitationByToken,
    acceptFamilyInvitation,
    declineFamilyInvitation,
    cancelFamilyInvitation
};
