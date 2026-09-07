const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const { normalizeRole } = require('../middleware/auth');

const REFERRAL_STATES = {
    TRIAGED: 'TRIAGED',
    FACILITY_RECOMMENDED: 'FACILITY_RECOMMENDED',
    FACILITY_SELECTED: 'FACILITY_SELECTED',
    FACILITY_CONFIRMATION_PENDING: 'FACILITY_CONFIRMATION_PENDING',
    ACCEPTED: 'ACCEPTED',
    APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
    MISSED_APPOINTMENT: 'MISSED_APPOINTMENT',
    URGENT_ESCALATION: 'URGENT_ESCALATION',
    FACILITY_ALERTED: 'FACILITY_ALERTED',
    PATIENT_IN_TRANSIT: 'PATIENT_IN_TRANSIT',
    PATIENT_REACHED: 'PATIENT_REACHED',
    DOCTOR_ASSIGNED: 'DOCTOR_ASSIGNED',
    CONSULTATION_COMPLETED: 'CONSULTATION_COMPLETED',
    DIAGNOSTICS_PENDING: 'DIAGNOSTICS_PENDING',
    DIAGNOSTICS_COMPLETED: 'DIAGNOSTICS_COMPLETED',
    TREATMENT_COMPLETED: 'TREATMENT_COMPLETED',
    FOLLOW_UP_PENDING: 'FOLLOW_UP_PENDING',
    FOLLOW_UP_COMPLETED: 'FOLLOW_UP_COMPLETED',
    REROUTING_REQUIRED: 'REROUTING_REQUIRED',
    FAILED_REFERRAL: 'FAILED_REFERRAL',
    CANCELLED: 'CANCELLED'
};

const VALID_TRANSITIONS = {
    [REFERRAL_STATES.TRIAGED]: [
        REFERRAL_STATES.FACILITY_RECOMMENDED,
        REFERRAL_STATES.FACILITY_SELECTED,
        REFERRAL_STATES.URGENT_ESCALATION,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.FACILITY_RECOMMENDED]: [
        REFERRAL_STATES.FACILITY_SELECTED,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.FACILITY_SELECTED]: [
        REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING,
        REFERRAL_STATES.ACCEPTED,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.FACILITY_CONFIRMATION_PENDING]: [
        REFERRAL_STATES.ACCEPTED,
        REFERRAL_STATES.REROUTING_REQUIRED,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.ACCEPTED]: [
        REFERRAL_STATES.APPOINTMENT_BOOKED,
        REFERRAL_STATES.PATIENT_IN_TRANSIT,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.APPOINTMENT_BOOKED]: [
        REFERRAL_STATES.PATIENT_IN_TRANSIT,
        REFERRAL_STATES.MISSED_APPOINTMENT,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.MISSED_APPOINTMENT]: [
        REFERRAL_STATES.APPOINTMENT_BOOKED,
        REFERRAL_STATES.FAILED_REFERRAL,
        REFERRAL_STATES.CANCELLED
    ],
    [REFERRAL_STATES.URGENT_ESCALATION]: [
        REFERRAL_STATES.FACILITY_ALERTED,
        REFERRAL_STATES.REROUTING_REQUIRED,
        REFERRAL_STATES.PATIENT_IN_TRANSIT
    ],
    [REFERRAL_STATES.FACILITY_ALERTED]: [
        REFERRAL_STATES.PATIENT_IN_TRANSIT,
        REFERRAL_STATES.REROUTING_REQUIRED
    ],
    [REFERRAL_STATES.PATIENT_IN_TRANSIT]: [
        REFERRAL_STATES.PATIENT_REACHED,
        REFERRAL_STATES.FAILED_REFERRAL
    ],
    [REFERRAL_STATES.PATIENT_REACHED]: [
        REFERRAL_STATES.DOCTOR_ASSIGNED
    ],
    [REFERRAL_STATES.DOCTOR_ASSIGNED]: [
        REFERRAL_STATES.CONSULTATION_COMPLETED
    ],
    [REFERRAL_STATES.CONSULTATION_COMPLETED]: [
        REFERRAL_STATES.DIAGNOSTICS_PENDING,
        REFERRAL_STATES.TREATMENT_COMPLETED
    ],
    [REFERRAL_STATES.DIAGNOSTICS_PENDING]: [
        REFERRAL_STATES.DIAGNOSTICS_COMPLETED,
        REFERRAL_STATES.TREATMENT_COMPLETED
    ],
    [REFERRAL_STATES.DIAGNOSTICS_COMPLETED]: [
        REFERRAL_STATES.TREATMENT_COMPLETED
    ],
    [REFERRAL_STATES.TREATMENT_COMPLETED]: [
        REFERRAL_STATES.FOLLOW_UP_PENDING,
        REFERRAL_STATES.FOLLOW_UP_COMPLETED
    ],
    [REFERRAL_STATES.FOLLOW_UP_PENDING]: [
        REFERRAL_STATES.FOLLOW_UP_COMPLETED,
        REFERRAL_STATES.FAILED_REFERRAL
    ],
    [REFERRAL_STATES.REROUTING_REQUIRED]: [
        REFERRAL_STATES.FACILITY_RECOMMENDED,
        REFERRAL_STATES.FACILITY_SELECTED,
        REFERRAL_STATES.FAILED_REFERRAL
    ],
    [REFERRAL_STATES.FOLLOW_UP_COMPLETED]: [],
    [REFERRAL_STATES.FAILED_REFERRAL]: [],
    [REFERRAL_STATES.CANCELLED]: []
};

/**
 * Checks whether a given transition is topologically valid in the state machine
 */
function isValidTransition(fromStatus, toStatus) {
    if (!fromStatus || !toStatus) return false;
    if (fromStatus === toStatus) return true;
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
}

/**
 * Computes SHA-256 hash for ledger chaining
 */
function computeAuditHash(previousHash, record) {
    const payload = JSON.stringify(record) + (previousHash || 'GENESIS_BLOCK_SWSTHYA_2026');
    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Core State Machine Transition Executor
 */
async function transitionReferral({
    referralId,
    toStatus,
    actorUserId,
    actorRole = 'SYSTEM',
    reason = '',
    payload = {}
}) {
    if (!referralId) {
        throw new Error('referralId is required for state transition');
    }

    const normalizedActorRole = normalizeRole(actorRole);

    const { data: referral, error: fetchErr } = await supabase
        .from('referrals')
        .select(`
            *,
            patient:patients!referrals_patient_id_fkey(id, full_name, phone),
            facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district)
        `)
        .eq('id', referralId)
        .single();

    if (fetchErr || !referral) {
        throw new Error(`Referral not found: ${referralId} (${fetchErr?.message || 'Unknown'})`);
    }

    const fromStatus = referral.status;

    if (!isValidTransition(fromStatus, toStatus)) {
        const allowed = VALID_TRANSITIONS[fromStatus] || [];
        throw new Error(`Invalid transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: [${allowed.join(', ')}]`);
    }

    const updateData = {
        status: toStatus,
        updated_at: new Date().toISOString()
    };

    if (payload.receiving_facility_id) updateData.receiving_facility_id = payload.receiving_facility_id;
    if (payload.assigned_doctor_id) updateData.assigned_doctor_id = payload.assigned_doctor_id;
    if (payload.appointment_slot_time) updateData.appointment_slot_time = payload.appointment_slot_time;
    if (payload.slot_token) updateData.slot_token = payload.slot_token;
    if (payload.reason_for_referral) updateData.reason_for_referral = payload.reason_for_referral;
    if (payload.clinical_summary) updateData.clinical_summary = payload.clinical_summary;

    const { data: updatedReferral, error: updateErr } = await supabase
        .from('referrals')
        .update(updateData)
        .eq('id', referralId)
        .select(`
            *,
            patient:patients!referrals_patient_id_fkey(id, full_name, phone),
            facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district),
            doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
        `)
        .single();

    if (updateErr) {
        throw new Error(`Database error updating referral state: ${updateErr.message}`);
    }

    const eventRecord = {
        referral_id: referralId,
        from_status: fromStatus,
        to_status: toStatus,
        actor_user_id: actorUserId || null,
        actor_role: normalizedActorRole,
        reason: reason || `Transitioned to ${toStatus}`,
        created_at: new Date().toISOString()
    };

    const { data: eventLog, error: eventErr } = await supabase
        .from('referral_events')
        .insert([eventRecord])
        .select()
        .single();

    if (eventErr) {
        console.warn(`[REFERRAL_EVENT] Warning appending event log: ${eventErr.message}`);
    }

    if (config.enableAuditChain) {
        try {
            const { data: lastBlock } = await supabase
                .from('security_audit_ledger')
                .select('current_hash')
                .order('block_index', { ascending: false })
                .limit(1)
                .maybeSingle();

            const prevHash = lastBlock?.current_hash || 'GENESIS_BLOCK_SWSTHYA_2026';
            const currHash = computeAuditHash(prevHash, eventRecord);

            await supabase.from('security_audit_ledger').insert([{
                event_type: 'REFERRAL_STATE_TRANSITION',
                entity_id: referralId,
                actor_id: actorUserId || 'SYSTEM',
                actor_role: normalizedActorRole,
                action: `State moved ${fromStatus} -> ${toStatus}`,
                previous_hash: prevHash,
                current_hash: currHash,
                created_at: new Date().toISOString()
            }]);
        } catch (auditErr) {
            console.warn('[AUDIT_LEDGER] Chaining notice:', auditErr.message);
        }
    }

    return {
        referral: updatedReferral || referral,
        event: eventLog || eventRecord,
        fromStatus,
        toStatus
    };
}

module.exports = {
    REFERRAL_STATES,
    VALID_TRANSITIONS,
    isValidTransition,
    transitionReferral,
    computeAuditHash
};
