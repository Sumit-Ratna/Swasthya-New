const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');

class AuditService {
    /**
     * Sanitizes metadata to ensure sensitive PII / clinical notes / passwords are never stored in raw audit text.
     */
    sanitizeMetadata(metadata = {}) {
        if (!metadata || typeof metadata !== 'object') return {};
        const sanitized = { ...metadata };
        
        // Remove or redact sensitive fields
        const sensitiveKeys = ['password', 'otp', 'token', 'raw_vitals', 'clinical_notes', 'chief_complaint', 'diagnosis_details', 'aadhaar', 'secret'];
        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(s => lowerKey.includes(s))) {
                sanitized[key] = '[REDACTED_PRIVACY_PROTECTED]';
            }
        }
        return sanitized;
    }

    /**
     * Calculates cryptographic block hash for audit trail integrity
     */
    computeBlockHash({ previousHash, actorId, actionType, resourceType, resourceId, timestamp }) {
        const payload = `${previousHash || 'GENESIS'}|${actorId || 'SYSTEM'}|${actionType}|${resourceType}|${resourceId}|${timestamp}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Centralized audit logging method
     */
    async logAudit({
        actorId,
        actorRole = 'SYSTEM',
        actionType,
        resourceType,
        resourceId,
        result = 'SUCCESS',
        requestId,
        metadata = {}
    }) {
        try {
            const timestamp = new Date().toISOString();
            const sanitizedMeta = this.sanitizeMetadata(metadata);
            
            // Get previous record for hash chaining
            const ledger = localDb.getCollection('security_audit_ledger') || [];
            const previousRecord = ledger[ledger.length - 1];
            const previousHash = previousRecord?.hash || '0000000000000000000000000000000000000000000000000000000000000000';
            const blockHash = this.computeBlockHash({
                previousHash,
                actorId,
                actionType,
                resourceType,
                resourceId,
                timestamp
            });

            const auditRecord = {
                id: crypto.randomUUID(),
                event_type: actionType,
                action_type: actionType,
                resource_type: resourceType,
                resource_id: resourceId,
                entity_id: resourceId,
                actor_id: actorId || 'SYSTEM',
                actor_role: (actorRole || 'SYSTEM').toUpperCase(),
                action: `${actionType}:${resourceType || 'UNKNOWN'}`,
                result: (result || 'SUCCESS').toUpperCase(),
                status: (result || 'SUCCESS').toUpperCase(),
                request_id: requestId || null,
                previous_hash: previousHash,
                hash: blockHash,
                metadata: sanitizedMeta,
                details: JSON.stringify(sanitizedMeta),
                created_at: timestamp
            };

            // Always write to localDb for resilience & immediate testing
            localDb.insert('security_audit_ledger', auditRecord);

            // If Supabase is available and not demo mode, persist to Supabase
            if (!config.demoMode) {
                try {
                    await supabase.from('security_audit_ledger').insert([{
                        id: auditRecord.id,
                        event_type: auditRecord.event_type,
                        entity_id: auditRecord.entity_id,
                        actor_id: auditRecord.actor_id,
                        actor_role: auditRecord.actor_role,
                        action: auditRecord.action,
                        created_at: auditRecord.created_at,
                        details: auditRecord.details
                    }]);
                } catch (dbErr) {
                    // Non-fatal, local record already exists
                }
            }

            return auditRecord;
        } catch (err) {
            console.warn('[AUDIT_SERVICE] Non-fatal audit log notice:', err.message);
            return null;
        }
    }

    /**
     * Log Referral State Transitions
     */
    async logStateTransition({ referralId, fromStatus, toStatus, actorId, actorRole, reason, requestId }) {
        return this.logAudit({
            actorId,
            actorRole,
            actionType: 'STATE_TRANSITION',
            resourceType: 'REFERRAL',
            resourceId: referralId,
            result: 'SUCCESS',
            requestId,
            metadata: {
                from_status: fromStatus,
                to_status: toStatus,
                transition_reason: reason || 'Normal clinical progression'
            }
        });
    }

    /**
     * Log Prescription Generated
     */
    async logPrescriptionGenerated({ referralId, doctorId, patientId, prescriptionId, requestId }) {
        return this.logAudit({
            actorId: doctorId,
            actorRole: 'DOCTOR',
            actionType: 'PRESCRIPTION_GENERATED',
            resourceType: 'PRESCRIPTION',
            resourceId: prescriptionId,
            result: 'SUCCESS',
            requestId,
            metadata: {
                referral_id: referralId,
                patient_id: patientId
            }
        });
    }

    /**
     * Log Caregiver Proxy Grants & Revocations
     */
    async logProxyGrantRevoke({ patientId, caregiverUserId, actorId, action, scope, requestId }) {
        return this.logAudit({
            actorId: actorId || patientId,
            actorRole: 'PATIENT',
            actionType: `PROXY_${action.toUpperCase()}`,
            resourceType: 'CAREGIVER_PROXY',
            resourceId: caregiverUserId,
            result: 'SUCCESS',
            requestId,
            metadata: {
                patient_id: patientId,
                permission_scope: scope
            }
        });
    }

    /**
     * Log AI Triage Fallback or Override
     */
    async logTriageOverride({ patientId, actorId, actorRole, originalRisk, finalRisk, reason, isAiFallback = false, requestId }) {
        return this.logAudit({
            actorId,
            actorRole,
            actionType: isAiFallback ? 'AI_TRIAGE_FALLBACK' : 'CLINICAL_TRIAGE_OVERRIDE',
            resourceType: 'ASSESSMENT',
            resourceId: patientId,
            result: 'SUCCESS',
            requestId,
            metadata: {
                is_ai_fallback: isAiFallback,
                original_risk: originalRisk,
                final_risk: finalRisk,
                reason: reason || (isAiFallback ? 'AI timeout or unavailability' : 'Clinician judgment')
            }
        });
    }

    /**
     * Log Sensitive Clinical Access (Document views, ABHA profile queries)
     */
    async logSensitiveAccess({ resourceType, resourceId, actorId, actorRole, accessType = 'READ', requestId }) {
        return this.logAudit({
            actorId,
            actorRole,
            actionType: `SENSITIVE_ACCESS_${accessType.toUpperCase()}`,
            resourceType,
            resourceId,
            result: 'SUCCESS',
            requestId,
            metadata: {
                access_type: accessType
            }
        });
    }

    /**
     * Query audit logs with pagination and filters
     */
    async getAuditLogs({ actorId, resourceType, actionType, result, limit = 50, offset = 0 } = {}) {
        let logs = [];
        
        if (!config.demoMode) {
            try {
                let query = supabase.from('security_audit_ledger').select('*').order('created_at', { ascending: false }).limit(limit);
                if (actorId) query = query.eq('actor_id', actorId);
                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    logs = data;
                }
            } catch (e) {
                // Fallback to localDb
            }
        }

        if (logs.length === 0) {
            logs = localDb.getCollection('security_audit_ledger') || [];
        }

        // Apply filters in-memory
        let filtered = [...logs];
        if (actorId) {
            filtered = filtered.filter(l => l.actor_id === actorId);
        }
        if (resourceType) {
            filtered = filtered.filter(l => (l.resource_type || l.entity_type) === resourceType);
        }
        if (actionType) {
            filtered = filtered.filter(l => (l.event_type || l.action_type) === actionType);
        }
        if (result) {
            filtered = filtered.filter(l => (l.result || l.status) === result.toUpperCase());
        }

        // Sort descending by created_at
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        return filtered.slice(offset, offset + limit);
    }
}

module.exports = new AuditService();
