const supabase = require('../../src/config/supabaseClient');
const { REFERRAL_STATES, transitionReferral } = require('../../src/domain/referralStateMachine');

async function runE2EWorkflow() {
    console.log('====================================================');
    console.log('RUNNING E2E PERSISTENT SUPABASE WORKFLOW VALIDATION');
    console.log('====================================================\n');

    try {
        // 1. Verify Supabase Connection & Get a Facility
        console.log('[1/7] Fetching facilities from Supabase...');
        const { data: facilities, error: facErr } = await supabase
            .from('facilities')
            .select('id, name, district, tier')
            .limit(1);

        if (facErr || !facilities || facilities.length === 0) {
            throw new Error(`Failed to load facility: ${facErr?.message || 'No facilities found'}`);
        }

        const facility = facilities[0];
        console.log(`  ✓ Facility Active: ${facility.name} (${facility.tier}, ${facility.district}) [${facility.id}]`);

        // 2. Fetch or Create Test Patient & Doctor
        console.log('[2/7] Resolving test Patient & Doctor in Supabase...');
        let { data: patient } = await supabase
            .from('patients')
            .select('id, full_name, phone, gender')
            .limit(1)
            .maybeSingle();

        if (!patient) {
            const { data: createdPatient, error: pErr } = await supabase
                .from('patients')
                .insert([{
                    full_name: 'Pooja Patil',
                    phone: '9876543210',
                    gender: 'Female',
                    date_of_birth: '1996-04-12',
                    district: 'Pune',
                    consent_status: 'GRANTED'
                }])
                .select()
                .single();
            if (pErr) throw pErr;
            patient = createdPatient;
        }
        console.log(`  ✓ Patient: ${patient.full_name} (${patient.gender}) [${patient.id}]`);

        // Resolve Doctor
        let { data: doctor } = await supabase
            .from('doctors')
            .select('id, name, specialty_name, facility_id')
            .limit(1)
            .maybeSingle();

        if (!doctor) {
            const { data: createdDoctor, error: docErr } = await supabase
                .from('doctors')
                .insert([{
                    name: 'Dr. Anand Deshmukh',
                    specialty_name: 'OBSTETRICS',
                    facility_id: facility.id,
                    availability_status: 'AVAILABLE',
                    daily_capacity: 30,
                    current_active_assignments: 0,
                    status: 'ACTIVE'
                }])
                .select()
                .single();
            if (docErr) throw docErr;
            doctor = createdDoctor;
        }
        console.log(`  ✓ Doctor: ${doctor.name} (${doctor.specialty_name}) [${doctor.id}]`);

        // 3. Create Referral at TRIAGED -> FACILITY_SELECTED
        console.log('[3/7] Creating referral record in Supabase...');
        const { data: referral, error: refCreateErr } = await supabase
            .from('referrals')
            .insert([{
                patient_id: patient.id,
                receiving_facility_id: facility.id,
                status: REFERRAL_STATES.FACILITY_SELECTED,
                risk_level: 'HIGH',
                urgency: 'ROUTINE',
                specialty_required: 'OBSTETRICS',
                primary_complaint: 'Maternal severe hypertension & edema at 32 weeks',
                clinical_summary: 'BP 155/100, proteinuria +2, requires specialist ultrasound and management.'
            }])
            .select()
            .single();

        if (refCreateErr) throw refCreateErr;
        console.log(`  ✓ Referral Created with ID: ${referral.id} | Initial State: ${referral.status}`);

        // 4. Facility Accepts & Books Appointment (FACILITY_SELECTED -> ACCEPTED -> APPOINTMENT_BOOKED)
        console.log('[4/7] Facility Staff accepts & books appointment slot...');
        await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.ACCEPTED,
            actorRole: 'FACILITY_STAFF',
            reason: 'Facility confirmed specialty & bed availability'
        });

        const slotTime = new Date(Date.now() + 86400000).toISOString();
        const booked = await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorRole: 'FACILITY_STAFF',
            reason: 'Slot confirmed for tomorrow 10:00 AM',
            payload: {
                appointment_slot_time: slotTime,
                slot_token: 'TOKEN-NASHIK-42'
            }
        });
        console.log(`  ✓ Referral Moved to: ${booked.toStatus} | Slot: ${booked.referral.slot_token}`);

        // 5. Patient in Transit -> Reached -> Doctor Assigned
        console.log('[5/7] Patient in transit, arrives at facility & internal doctor assignment...');
        await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.PATIENT_IN_TRANSIT,
            actorRole: 'PATIENT',
            reason: 'Patient departed towards facility'
        });

        await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.PATIENT_REACHED,
            actorRole: 'FACILITY_STAFF',
            reason: 'Patient arrived at hospital triage desk'
        });

        const assigned = await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED,
            actorRole: 'FACILITY_STAFF',
            reason: `Assigned to ${doctor.name}`,
            payload: {
                assigned_doctor_id: doctor.id
            }
        });
        console.log(`  ✓ Referral Moved to: ${assigned.toStatus} | Assigned Doctor: ${doctor.name}`);

        // 6. Doctor Consultation -> Treatment -> Follow-up
        console.log('[6/7] Doctor conducts consult, completes treatment and initiates follow-up...');
        await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED,
            actorRole: 'DOCTOR',
            reason: 'Administered labetalol, ultrasound normal, continuous fetal monitoring'
        });

        await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.TREATMENT_COMPLETED,
            actorRole: 'DOCTOR',
            reason: 'Patient stabilized, oral antihypertensives prescribed'
        });

        await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.FOLLOW_UP_PENDING,
            actorRole: 'DOCTOR',
            reason: '7-day BP check scheduled with local ASHA'
        });

        // 7. ASHA completes follow-up and closes referral loop
        console.log('[7/7] Local ASHA verifies patient follow-up and completes closed loop...');
        const closed = await transitionReferral({
            referralId: referral.id,
            toStatus: REFERRAL_STATES.FOLLOW_UP_COMPLETED,
            actorRole: 'HEALTH_WORKER',
            reason: 'Day 7 home visit completed. BP 120/80, no danger signs.'
        });
        console.log(`  ✓ Closed Loop Achieved: Status is ${closed.toStatus}`);

        // Verify Timeline Audit Events
        const { data: events } = await supabase
            .from('referral_events')
            .select('*')
            .eq('referral_id', referral.id)
            .order('created_at', { ascending: true });

        console.log(`\n====================================================`);
        console.log(`SUCCESS! Immutable Timeline recorded ${events?.length || 0} transitions in Supabase:`);
        events?.forEach((evt, idx) => {
            console.log(`  ${idx + 1}. [${evt.from_status} -> ${evt.to_status}] by ${evt.actor_role}: ${evt.reason}`);
        });
        console.log(`====================================================\n`);

        process.exit(0);
    } catch (err) {
        console.error('\n[FATAL ERROR] E2E Workflow Failed:', err);
        process.exit(1);
    }
}

runE2EWorkflow();
