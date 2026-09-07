const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const { REFERRAL_STATES, transitionReferral } = require('../domain/referralStateMachine');

class DoctorAssignmentError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', status = 400) {
        super(message);
        this.name = 'DoctorAssignmentError';
        this.code = code;
        this.status = status;
    }
}

/**
 * Checks if a doctor's specialty matches the referral required specialty
 */
function isSpecialtyMatch(doctorSpecialty, requiredSpecialty) {
    if (!requiredSpecialty || requiredSpecialty === 'GENERAL_MEDICINE' || requiredSpecialty === 'GENERAL') {
        return true;
    }
    if (!doctorSpecialty) return false;
    const docSpec = doctorSpecialty.toUpperCase().replace(/[^A-Z]/g, '');
    const reqSpec = requiredSpecialty.toUpperCase().replace(/[^A-Z]/g, '');
    return docSpec.includes(reqSpec) || reqSpec.includes(docSpec) || docSpec === 'MULTISPECIALTY';
}

/**
 * Find active & available eligible doctors in a facility matching specialty
 */
async function findEligibleDoctors({ facility_id, specialty_required = null, exclude_doctor_id = null }) {
    if (!facility_id) return [];

    try {
        let query = supabase
            .from('doctors')
            .select('*')
            .eq('facility_id', facility_id);

        if (exclude_doctor_id) {
            query = query.neq('id', exclude_doctor_id);
        }

        const { data: doctors, error } = await query;
        if (error || !doctors) {
            if (config.demoMode) {
                const localDocs = localDb.find('doctors', d => d.facility_id === facility_id);
                return (localDocs || []).filter(doc => {
                    if (exclude_doctor_id && doc.id === exclude_doctor_id) return false;
                    const isActive = doc.status === 'ACTIVE' || !doc.status;
                    const isAvail = doc.availability_status === 'AVAILABLE' || !doc.availability_status;
                    return isActive && isAvail && isSpecialtyMatch(doc.specialty_name, specialty_required);
                });
            }
            return [];
        }

        return doctors.filter(doc => {
            const isActive = doc.status === 'ACTIVE' || !doc.status;
            const isAvail = doc.availability_status === 'AVAILABLE' || !doc.availability_status;
            return isActive && isAvail && isSpecialtyMatch(doc.specialty_name, specialty_required);
        });
    } catch (err) {
        console.warn('[DOCTOR_SEARCH] Warning:', err.message);
        return [];
    }
}

/**
 * Assign a doctor inside the receiving facility after patient arrival
 */
async function assignDoctorToReferral({
    referralId,
    doctorId = null,
    actorUser = null,
    reason = null
}) {
    if (!referralId) {
        throw new DoctorAssignmentError('referralId is required for doctor assignment', 'VALIDATION_ERROR', 400);
    }

    // 1. Fetch Referral Record
    const { data: referral, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

    if (refErr || !referral) {
        throw new DoctorAssignmentError(`Referral not found with ID: ${referralId}`, 'REFERRAL_NOT_FOUND', 404);
    }

    // 2. Pre-condition: Referral MUST strictly be in PATIENT_REACHED state before doctor assignment
    if (referral.status !== REFERRAL_STATES.PATIENT_REACHED) {
        throw new DoctorAssignmentError(
            `Doctor assignment is only permitted after patient arrival (PATIENT_REACHED). Current referral status is '${referral.status}'.`,
            'PATIENT_NOT_REACHED',
            409
        );
    }

    const facilityId = referral.receiving_facility_id;
    let selectedDoctor = null;

    if (doctorId) {
        // Fetch requested doctor
        let { data: doc, error: docErr } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', doctorId)
            .single();

        if (docErr || !doc) {
            if (config.demoMode) {
                doc = localDb.findById('doctors', doctorId);
            }
        }

        if (!doc) {
            throw new DoctorAssignmentError(`Doctor not found with ID: ${doctorId}`, 'DOCTOR_NOT_FOUND', 404);
        }

        // 3. Verify Doctor belongs to the receiving facility (No cross-facility assignment)
        if (doc.facility_id !== facilityId) {
            throw new DoctorAssignmentError(
                `Cross-facility doctor assignment is strictly rejected. Doctor '${doc.name}' belongs to facility ID ${doc.facility_id}, but referral is at facility ID ${facilityId}.`,
                'CROSS_FACILITY_ASSIGNMENT_DENIED',
                400
            );
        }

        // 4. Verify specialty/capability match and availability
        const isActive = doc.status === 'ACTIVE' || !doc.status;
        const isAvail = doc.availability_status === 'AVAILABLE' || !doc.availability_status;
        const matchesSpecialty = isSpecialtyMatch(doc.specialty_name, referral.specialty_required);

        if (isActive && isAvail && matchesSpecialty) {
            selectedDoctor = doc;
        } else {
            // Preferred doctor is unavailable or specialty mismatch -> search alternative in same facility
            console.warn(`[DOCTOR_ASSIGNMENT] Requested doctor '${doc.name}' is not available or does not match specialty '${referral.specialty_required}'. Searching alternative in facility ${facilityId}...`);
            const alternatives = await findEligibleDoctors({
                facility_id: facilityId,
                specialty_required: referral.specialty_required,
                exclude_doctor_id: doctorId
            });

            if (alternatives && alternatives.length > 0) {
                selectedDoctor = alternatives[0];
            }
        }
    } else {
        // Find best eligible doctor in facility
        const eligible = await findEligibleDoctors({
            facility_id: facilityId,
            specialty_required: referral.specialty_required
        });

        if (eligible && eligible.length > 0) {
            selectedDoctor = eligible[0];
        }
    }

    // 5. If no eligible doctor exists in the receiving facility: Trigger Controlled Rerouting
    if (!selectedDoctor) {
        const rerouteReason = reason || `No eligible, active, or available doctor for specialty '${referral.specialty_required || 'GENERAL'}' found at facility ${facilityId}. Controlled rerouting required.`;

        const rerouteTransition = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.REROUTING_REQUIRED,
            actorUserId: actorUser?.id || null,
            actorRole: actorUser?.role || 'FACILITY_STAFF',
            reason: rerouteReason
        });

        return {
            status: REFERRAL_STATES.REROUTING_REQUIRED,
            message: rerouteReason,
            referral: rerouteTransition.referral,
            doctor: null,
            rerouted: true
        };
    }

    // 6. Transition state machine to DOCTOR_ASSIGNED (and update doctor record assignments)
    const assignmentReason = reason || `Doctor ${selectedDoctor.name} (${selectedDoctor.specialty_name || 'General'}) assigned to arrived patient`;

    const transitionResult = await transitionReferral({
        referralId,
        toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED,
        actorUserId: actorUser?.id || null,
        actorRole: actorUser?.role || 'FACILITY_STAFF',
        reason: assignmentReason,
        payload: {
            assigned_doctor_id: selectedDoctor.id
        }
    });

    // Optionally increment active assignments count for doctor telemetry
    try {
        await supabase
            .from('doctors')
            .update({
                current_active_assignments: (selectedDoctor.current_active_assignments || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedDoctor.id);
    } catch (_) {
        // non-blocking
    }

    return {
        status: REFERRAL_STATES.DOCTOR_ASSIGNED,
        message: `Doctor ${selectedDoctor.name} successfully assigned`,
        referral: transitionResult.referral,
        doctor: selectedDoctor,
        rerouted: false
    };
}

module.exports = {
    DoctorAssignmentError,
    isSpecialtyMatch,
    findEligibleDoctors,
    assignDoctorToReferral
};
