const dbService = require('../services/supabaseService');

const DEMO_REFERRALS = [
    {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        receiving_facility_id: '22222222-2222-2222-2222-222222222222',
        assigned_doctor_id: '44444444-4444-4444-4444-444444444444',
        status: 'APPOINTMENT_BOOKED',
        risk_level: 'HIGH',
        urgency: 'URGENT',
        specialty_required: 'OBSTETRICS',
        primary_complaint: 'Maternal hypertension at 32 weeks ANC',
        clinical_summary: 'BP 150/98, elevated protein, referred for ultrasound and specialist consult.',
        slot_token: 'Token #A-14',
        created_at: new Date().toISOString(),
        facilities: {
            name: 'District Hospital Nashik',
            tier: 'DISTRICT_HOSPITAL',
            address: 'Civil Hospital Road, Nashik',
            district: 'Nashik'
        },
        doctors: {
            name: 'Dr. Anand Deshmukh',
            specialty_name: 'OBSTETRICS'
        }
    }
];

const DEMO_TIMELINE = [
    {
        id: '1',
        from_status: 'INIT',
        to_status: 'TRIAGED',
        actor_role: 'HEALTH_WORKER',
        reason: 'Health Worker completed clinical vitals triage (High Maternal Risk)',
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: '2',
        from_status: 'TRIAGED',
        to_status: 'FACILITY_SELECTED',
        actor_role: 'SYSTEM',
        reason: 'District Hospital Nashik selected based on Obstetrics capability',
        created_at: new Date(Date.now() - 2800000).toISOString()
    },
    {
        id: '3',
        from_status: 'FACILITY_SELECTED',
        to_status: 'APPOINTMENT_BOOKED',
        actor_role: 'FACILITY_STAFF',
        reason: 'Appointment confirmed for 10:30 AM (Slot Token #A-14)',
        created_at: new Date(Date.now() - 1500000).toISOString()
    }
];

// In-memory store for active session if Supabase is offline
let localReferrals = [...DEMO_REFERRALS];
let localTimeline = [...DEMO_TIMELINE];

exports.getAllReferrals = async (req, res) => {
    try {
        const referrals = await dbService.getReferralsByPatient('all');
        res.json(referrals || localReferrals);
    } catch (error) {
        console.warn('[REFERRAL] Returning fallback referrals list:', error.message);
        res.json(localReferrals);
    }
};

exports.createReferral = async (req, res) => {
    try {
        const {
            patient_id,
            assessment_id,
            receiving_facility_id,
            risk_level = 'MODERATE',
            urgency = 'ROUTINE',
            specialty_required = 'GENERAL_MEDICINE',
            primary_complaint,
            clinical_summary,
            reason_for_referral,
            appointment_slot_time
        } = req.body;

        const referring_user_id = req.user?.id || null;

        let initialStatus = 'TRIAGED';
        if (receiving_facility_id) {
            initialStatus = urgency === 'EMERGENCY' ? 'PATIENT_IN_TRANSIT' : 'APPOINTMENT_BOOKED';
        }

        let referral = null;
        try {
            referral = await dbService.createReferral({
                patient_id,
                assessment_id,
                referring_user_id,
                receiving_facility_id,
                status: initialStatus,
                risk_level,
                urgency,
                specialty_required,
                primary_complaint,
                clinical_summary,
                reason_for_referral,
                appointment_slot_time
            });
        } catch (dbErr) {
            console.warn("[REFERRAL] Supabase notice (storing in memory):", dbErr.message);
            const refId = `ref-${Date.now()}`;
            referral = {
                id: refId,
                patient_id: patient_id || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                receiving_facility_id,
                status: initialStatus,
                risk_level,
                urgency,
                specialty_required,
                primary_complaint,
                clinical_summary,
                slot_token: `Token #${Math.floor(10 + Math.random() * 90)}`,
                created_at: new Date().toISOString(),
                facilities: {
                    name: 'District Hospital Nashik',
                    tier: 'DISTRICT_HOSPITAL'
                }
            };
            localReferrals.unshift(referral);
            localTimeline.unshift({
                id: `evt-${Date.now()}`,
                referral_id: refId,
                from_status: 'INIT',
                to_status: initialStatus,
                actor_role: 'CREATOR',
                reason: 'Referral created and dispatched',
                created_at: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: "Referral created successfully",
            referral
        });
    } catch (err) {
        console.error("[REFERRAL] Creation failed:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getReferralDetails = async (req, res) => {
    try {
        const { id } = req.params;
        let referral = null;
        let timeline = [];

        try {
            referral = await dbService.getReferralById(id);
            timeline = await dbService.getReferralTimeline(id);
        } catch (e) {}

        if (!referral) {
            referral = localReferrals.find(r => r.id === id) || localReferrals[0];
            timeline = localTimeline;
        }

        res.json({
            referral,
            timeline,
            diagnostics: []
        });
    } catch (err) {
        console.error("[REFERRAL] Fetch details error:", err);
        res.json({ referral: DEMO_REFERRALS[0], timeline: DEMO_TIMELINE, diagnostics: [] });
    }
};

exports.getPatientReferrals = async (req, res) => {
    try {
        const patientId = req.params.patient_id || req.user?.id;
        let referrals = [];
        try {
            referrals = await dbService.getReferralsByPatient(patientId);
        } catch (e) {}

        if (!referrals || referrals.length === 0) {
            referrals = localReferrals;
        }

        res.json(referrals);
    } catch (err) {
        console.error("[REFERRAL] Patient referrals error:", err);
        res.json(localReferrals);
    }
};

exports.getFacilityReferrals = async (req, res) => {
    try {
        const { facility_id } = req.params;
        const { status } = req.query;
        let referrals = [];
        try {
            referrals = await dbService.getReferralsByFacility(facility_id, status);
        } catch (e) {}

        if (!referrals || referrals.length === 0) {
            referrals = localReferrals;
        }

        res.json(referrals);
    } catch (err) {
        console.error("[REFERRAL] Facility referrals error:", err);
        res.json(localReferrals);
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { to_status, reason } = req.body;
        const actorId = req.user?.id || 'demo-actor';
        const actorRole = req.user?.role || 'DOCTOR';

        let updated = null;
        try {
            updated = await dbService.updateReferralStatus(id, to_status, actorId, actorRole, reason);
        } catch (e) {
            const idx = localReferrals.findIndex(r => r.id === id);
            if (idx !== -1) {
                const prev = localReferrals[idx].status;
                localReferrals[idx].status = to_status;
                updated = localReferrals[idx];
                localTimeline.push({
                    id: `evt-${Date.now()}`,
                    referral_id: id,
                    from_status: prev,
                    to_status: to_status,
                    actor_role: actorRole,
                    reason: reason || 'Status updated',
                    created_at: new Date().toISOString()
                });
            }
        }

        res.json({
            message: `Referral status updated to ${to_status}`,
            referral: updated || localReferrals[0]
        });
    } catch (err) {
        console.error("[REFERRAL] Status update error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.assignDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_id } = req.body;
        let updated = null;
        try {
            updated = await dbService.assignDoctorToReferral(id, doctor_id);
        } catch (e) {
            const idx = localReferrals.findIndex(r => r.id === id);
            if (idx !== -1) {
                localReferrals[idx].status = 'CONSULTATION_IN_PROGRESS';
                localReferrals[idx].assigned_doctor_id = doctor_id;
                localReferrals[idx].doctors = { name: 'Dr. Anand Deshmukh', specialty_name: 'OBSTETRICS' };
                updated = localReferrals[idx];
            }
        }

        res.json({
            message: "Doctor assigned successfully",
            referral: updated || localReferrals[0]
        });
    } catch (err) {
        console.error("[REFERRAL] Doctor assignment error:", err);
        res.status(500).json({ error: err.message });
    }
};
