const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const supabaseService = require('./supabaseService');
const { REFERRAL_STATES, transitionReferral } = require('../domain/referralStateMachine');

class OfflineSyncError extends Error {
    constructor(message, code = 'SYNC_ERROR', status = 400) {
        super(message);
        this.name = 'OfflineSyncError';
        this.code = code;
        this.status = status;
    }
}

/**
 * Check if operation was already processed
 */
function findIdempotentRecord(idempotencyKey, clientOperationId) {
    if (!idempotencyKey && !clientOperationId) return null;
    return localDb.findOne('idempotency_records', r =>
        (idempotencyKey && r.idempotency_key === idempotencyKey) ||
        (clientOperationId && r.client_operation_id === clientOperationId)
    );
}

/**
 * Save processed operation for idempotency
 */
function saveIdempotentRecord(record) {
    localDb.insert('idempotency_records', {
        id: crypto.randomUUID(),
        ...record,
        processed_at: new Date().toISOString()
    });
}

/**
 * Process single operation within a sync batch
 */
async function processSingleOperation({ operation, deviceId, workerUser }) {
    const {
        client_operation_id,
        idempotency_key,
        operation_type,
        local_created_at,
        client_base_state = null,
        payload = {}
    } = operation;

    if (!operation_type) {
        return {
            client_operation_id,
            idempotency_key,
            status: 'REJECTED',
            error: 'operation_type is required',
            code: 'VALIDATION_ERROR'
        };
    }

    // 1. Idempotency Check
    const existingRecord = findIdempotentRecord(idempotency_key, client_operation_id);
    if (existingRecord) {
        return {
            client_operation_id,
            idempotency_key: existingRecord.idempotency_key,
            operation_type,
            status: 'IDEMPOTENT_REPLAY',
            server_id: existingRecord.server_id,
            result: existingRecord.result,
            message: 'Operation was previously processed; replaying cached server response safely'
        };
    }

    const workerId = workerUser?.id || null;
    const workerRole = (workerUser?.role || 'HEALTH_WORKER').toUpperCase();

    try {
        switch (operation_type.toUpperCase()) {
            // A. Patient / Beneficiary Registration
            case 'CREATE_PATIENT':
            case 'BENEFICIARY_REGISTRATION': {
                const ben = await supabaseService.recordAshaBeneficiary(payload, workerId);
                const result = {
                    patient_id: ben.id,
                    name: ben.name,
                    phone: ben.phone,
                    sync_status: 'SYNCED'
                };

                saveIdempotentRecord({
                    client_operation_id,
                    idempotency_key: idempotency_key || `BEN-${ben.id}`,
                    device_id: deviceId,
                    operation_type,
                    server_id: ben.id,
                    result
                });

                return {
                    client_operation_id,
                    idempotency_key,
                    operation_type,
                    status: 'SYNCED',
                    server_id: ben.id,
                    result
                };
            }

            // B. Record Clinical Vitals & Triage Assessment
            case 'RECORD_ASSESSMENT':
            case 'SUBMIT_VITALS': {
                const assessment = await supabaseService.recordAshaVitals({
                    ...payload,
                    conducted_by_worker_id: workerId
                });

                const result = {
                    assessment_id: assessment.id,
                    risk_level: assessment.risk_level,
                    urgency: assessment.urgency || (assessment.risk_level === 'HIGH' ? 'URGENT' : 'ROUTINE'),
                    triage_guidance: assessment.triage_guidance || 'Assessment recorded',
                    sync_status: 'SYNCED'
                };

                saveIdempotentRecord({
                    client_operation_id,
                    idempotency_key: idempotency_key || `ASS-${assessment.id}`,
                    device_id: deviceId,
                    operation_type,
                    server_id: assessment.id,
                    result
                });

                return {
                    client_operation_id,
                    idempotency_key,
                    operation_type,
                    status: 'SYNCED',
                    server_id: assessment.id,
                    result
                };
            }

            // C. Referral Creation / Preparation
            case 'CREATE_REFERRAL':
            case 'REFERRAL_PREPARATION': {
                if (!payload.patient_id || !payload.primary_complaint) {
                    throw new OfflineSyncError('patient_id and primary_complaint are required for referral creation', 'VALIDATION_ERROR', 400);
                }

                const initialStatus = REFERRAL_STATES.TRIAGED;
                const referralPayload = {
                    patient_id: payload.patient_id,
                    assessment_id: payload.assessment_id || null,
                    referring_user_id: workerId,
                    receiving_facility_id: payload.receiving_facility_id || null,
                    status: initialStatus,
                    risk_level: payload.risk_level || 'MODERATE',
                    urgency: payload.urgency || 'ROUTINE',
                    specialty_required: payload.specialty_required || 'GENERAL_MEDICINE',
                    primary_complaint: payload.primary_complaint,
                    clinical_summary: payload.clinical_summary || '',
                    reason_for_referral: payload.reason_for_referral || 'Offline referral created by health worker',
                    created_at: local_created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                let createdReferral = null;
                try {
                    const { data, error } = await supabase
                        .from('referrals')
                        .insert([referralPayload])
                        .select()
                        .single();

                    if (!error && data) createdReferral = data;
                } catch (e) {}

                if (!createdReferral) {
                    createdReferral = { id: crypto.randomUUID(), ...referralPayload };
                    localDb.insert('referrals', createdReferral);
                }

                // If receiving facility was selected offline, transition canonically
                if (payload.receiving_facility_id) {
                    const targetState = (payload.urgency === 'EMERGENCY' || payload.urgency === 'CRITICAL')
                        ? REFERRAL_STATES.URGENT_ESCALATION
                        : REFERRAL_STATES.FACILITY_SELECTED;

                    const trRes = await transitionReferral({
                        referralId: createdReferral.id,
                        toStatus: targetState,
                        actorUserId: workerId,
                        actorRole: workerRole,
                        reason: 'Offline facility selection synchronized',
                        payload: { receiving_facility_id: payload.receiving_facility_id }
                    });
                    createdReferral = trRes.referral;
                }

                const result = {
                    referral_id: createdReferral.id,
                    status: createdReferral.status,
                    facility_id: createdReferral.receiving_facility_id,
                    sync_status: 'SYNCED'
                };

                saveIdempotentRecord({
                    client_operation_id,
                    idempotency_key: idempotency_key || `REF-${createdReferral.id}`,
                    device_id: deviceId,
                    operation_type,
                    server_id: createdReferral.id,
                    result
                });

                return {
                    client_operation_id,
                    idempotency_key,
                    operation_type,
                    status: 'SYNCED',
                    server_id: createdReferral.id,
                    result
                };
            }

            // D. Referral State Mutation (Anti-Last-Write-Wins Strict Enforcement)
            case 'TRANSITION_REFERRAL':
            case 'UPDATE_REFERRAL_STATUS': {
                const { referral_id, to_status, reason } = payload;
                if (!referral_id || !to_status) {
                    throw new OfflineSyncError('referral_id and to_status are required for transition', 'VALIDATION_ERROR', 400);
                }

                // 1. Fetch current live server state
                let liveReferral = null;
                try {
                    const { data } = await supabase.from('referrals').select('*').eq('id', referral_id).single();
                    if (data) liveReferral = data;
                } catch (e) {}
                if (!liveReferral) {
                    liveReferral = localDb.findOne('referrals', r => r.id === referral_id);
                }

                if (!liveReferral) {
                    throw new OfflineSyncError(`Referral not found with ID: ${referral_id}`, 'REFERRAL_NOT_FOUND', 404);
                }

                // 2. Anti-Last-Write-Wins Check: If client specified base state and server moved ahead
                if (client_base_state && liveReferral.status !== client_base_state) {
                    return {
                        client_operation_id,
                        idempotency_key,
                        operation_type,
                        status: 'CONFLICT',
                        conflict_code: 'STATE_DRIFT',
                        server_state: liveReferral.status,
                        client_base_state: client_base_state,
                        attempted_target_state: to_status,
                        message: `Anti-Last-Write-Wins: Live referral has already moved to '${liveReferral.status}'. Offline transition from '${client_base_state}' rejected for human resolution.`,
                        resolution_required: true
                    };
                }

                // 3. Execute Canonical State Machine Transition
                const transitionRes = await transitionReferral({
                    referralId: referral_id,
                    toStatus: to_status,
                    actorUserId: workerId,
                    actorRole: workerRole,
                    reason: reason || 'Queued offline transition synced by health worker'
                });

                const result = {
                    referral_id,
                    new_status: transitionRes.referral.status,
                    sync_status: 'SYNCED'
                };

                saveIdempotentRecord({
                    client_operation_id,
                    idempotency_key: idempotency_key || `TR-${referral_id}-${to_status}`,
                    device_id: deviceId,
                    operation_type,
                    server_id: referral_id,
                    result
                });

                return {
                    client_operation_id,
                    idempotency_key,
                    operation_type,
                    status: 'SYNCED',
                    server_id: referral_id,
                    result
                };
            }

            default:
                return {
                    client_operation_id,
                    idempotency_key,
                    status: 'REJECTED',
                    error: `Unsupported offline operation type: '${operation_type}'`,
                    code: 'UNKNOWN_OPERATION_TYPE'
                };
        }
    } catch (err) {
        return {
            client_operation_id,
            idempotency_key,
            operation_type,
            status: 'FAILED',
            error: err.message,
            code: err.code || 'PROCESSING_ERROR'
        };
    }
}

/**
 * Batch synchronization entry point
 */
async function processSyncBatch({ deviceId, workerUser, operations = [] }) {
    if (!deviceId) {
        throw new OfflineSyncError('device_id is required in sync batch header', 'VALIDATION_ERROR', 400);
    }
    if (!Array.isArray(operations)) {
        throw new OfflineSyncError('operations must be an array of queued writes', 'VALIDATION_ERROR', 400);
    }

    const workerRole = (workerUser?.role || '').toUpperCase();
    if (workerRole !== 'HEALTH_WORKER' && workerRole !== 'ADMIN') {
        throw new OfflineSyncError('Only authorized health workers or administrators can synchronize offline queues', 'UNAUTHORIZED_SYNC', 403);
    }

    const results = [];
    let syncedCount = 0;
    let conflictCount = 0;
    let failedCount = 0;
    let replayedCount = 0;

    for (const op of operations) {
        const res = await processSingleOperation({
            operation: op,
            deviceId,
            workerUser
        });

        results.push(res);
        if (res.status === 'SYNCED') syncedCount++;
        else if (res.status === 'IDEMPOTENT_REPLAY') replayedCount++;
        else if (res.status === 'CONFLICT') conflictCount++;
        else failedCount++;
    }

    return {
        device_id: deviceId,
        total_operations: operations.length,
        synced_count: syncedCount,
        replayed_count: replayedCount,
        conflict_count: conflictCount,
        failed_count: failedCount,
        results,
        server_synced_at: new Date().toISOString()
    };
}

/**
 * Get offline-ready facility directory with freshness telemetry metadata
 */
async function getOfflineFacilityDirectory(district = 'Pune') {
    let facilities = [];
    try {
        const { data } = await supabase
            .from('facilities')
            .select('*')
            .ilike('district', `%${district}%`);
        if (data && data.length > 0) facilities = data;
    } catch (e) {}

    if (facilities.length === 0) {
        facilities = localDb.find('facilities', f => !district || f.district.toLowerCase().includes(district.toLowerCase()));
    }

    return facilities.map(fac => ({
        ...fac,
        cached_at: new Date().toISOString(),
        live_verified: false,
        telemetry_age_note: 'Facility directory downloaded for offline emergency reference. Live bed verification required upon connectivity.'
    }));
}

module.exports = {
    OfflineSyncError,
    processSyncBatch,
    getOfflineFacilityDirectory
};
