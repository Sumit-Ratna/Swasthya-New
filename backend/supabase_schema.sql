-- ==============================================================================
-- HealthNexus Supabase PostgreSQL Schema Migration
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'New User',
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
    dob DATE,
    gender VARCHAR(20) DEFAULT 'Male',
    blood_group VARCHAR(10) DEFAULT 'O+',
    emergency_contact VARCHAR(30),
    allergies TEXT,
    chronic_conditions TEXT,
    medications TEXT,
    medical_history JSONB DEFAULT '{}'::jsonb,
    lifestyle JSONB DEFAULT '{}'::jsonb,
    specialization VARCHAR(255),
    hospital_name VARCHAR(255),
    doctor_qr_id VARCHAR(50) UNIQUE,
    refresh_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'lab_report',
    file_url TEXT NOT NULL,
    title VARCHAR(255),
    summary TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    department VARCHAR(100),
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DOCTOR-PATIENT LINKS TABLE
CREATE TABLE IF NOT EXISTS public.doctor_patient_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    permissions JSONB DEFAULT '{"view_records": true, "prescribe": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doctor_id, patient_id)
);

-- 5. FAMILY LINKS TABLE
CREATE TABLE IF NOT EXISTS public.family_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_name VARCHAR(255),
    relation VARCHAR(100) NOT NULL,
    member_phone VARCHAR(30),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    access_level VARCHAR(50) NOT NULL DEFAULT 'view_only',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. FACILITIES TABLE (SwasthyaSetu)
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('PRIMARY_HEALTH_CENTRE', 'COMMUNITY_HEALTH_CENTRE', 'SUB_DISTRICT_HOSPITAL', 'DISTRICT_HOSPITAL', 'TERTIARY_HOSPITAL')),
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    operational_status VARCHAR(50) DEFAULT 'OPEN' CHECK (operational_status IN ('OPEN', 'OVERLOADED', 'EMERGENCY_ONLY', 'CLOSED')),
    current_load INT DEFAULT 0 CHECK (current_load >= 0 AND current_load <= 100),
    emergency_capable BOOLEAN DEFAULT FALSE,
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DOCTORS TABLE (SwasthyaSetu Facility Linkage)
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty_name VARCHAR(100) NOT NULL,
    qualification VARCHAR(255),
    registration_number VARCHAR(100),
    available_status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (available_status IN ('AVAILABLE', 'IN_OPD', 'IN_SURGERY', 'ON_LEAVE')),
    current_active_assignments INT DEFAULT 0,
    opd_timing VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CLINICAL ASSESSMENTS TABLE (AI Triage Scoring)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assessor_id UUID REFERENCES public.users(id),
    systolic_bp INT,
    diastolic_bp INT,
    pulse_rate INT,
    spo2 INT,
    respiratory_rate INT,
    temperature NUMERIC(4, 1),
    is_pregnant BOOLEAN DEFAULT FALSE,
    danger_signs TEXT,
    ai_risk_score NUMERIC(3, 2) DEFAULT 0.0,
    computed_risk_level VARCHAR(50) NOT NULL DEFAULT 'LOW' CHECK (computed_risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL_EMERGENCY')),
    ai_triage_explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. REFERRALS TABLE (13-State Closed Loop)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id),
    referring_facility_id UUID REFERENCES public.facilities(id),
    referring_user_id UUID REFERENCES public.users(id),
    receiving_facility_id UUID NOT NULL REFERENCES public.facilities(id),
    assigned_doctor_id UUID REFERENCES public.doctors(id),
    status VARCHAR(50) NOT NULL DEFAULT 'TRIAGED',
    risk_level VARCHAR(50) NOT NULL DEFAULT 'MODERATE',
    urgency VARCHAR(50) NOT NULL DEFAULT 'ROUTINE',
    specialty_required VARCHAR(100) NOT NULL,
    primary_complaint TEXT NOT NULL,
    clinical_summary TEXT,
    destination_facility_id UUID REFERENCES public.facilities(id),
    reason_for_referral TEXT,
    appointment_slot_time TIMESTAMPTZ,
    slot_token VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. REFERRAL EVENTS TABLE (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.referral_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    actor_user_id UUID REFERENCES public.users(id),
    actor_role VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID REFERENCES public.referrals(id),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id),
    facility_id UUID NOT NULL REFERENCES public.facilities(id),
    diagnosis TEXT NOT NULL,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions TEXT,
    digital_signature_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. CAREGIVER RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.caregiver_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    permission_scope VARCHAR(50) NOT NULL DEFAULT 'FULL_ACCESS' CHECK (permission_scope IN ('APPOINTMENTS_ONLY', 'REPORTS_ONLY', 'FULL_ACCESS')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. CRYPTOGRAPHIC SECURITY AUDIT LEDGER (SHA-256 Chaining)
CREATE TABLE IF NOT EXISTS public.security_audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index BIGSERIAL,
    event_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    actor_id VARCHAR(100),
    actor_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. FEEDBACKS TABLE (User satisfaction & service feedback across all roles)
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_role VARCHAR(50) NOT NULL DEFAULT 'patient',
    user_name VARCHAR(255),
    user_phone VARCHAR(30),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    feedback_text TEXT NOT NULL,
    satisfaction_score VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. ASHA / ANM HEALTH WORKERS TABLE
CREATE TABLE IF NOT EXISTS public.asha_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. ASHA-DEL-8902, ASHA-MAH-4019
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'health_worker', -- 'health_worker', 'asha', 'anm'
    assigned_subcentre VARCHAR(255) DEFAULT 'Shirwal Sub-Centre',
    assigned_phc VARCHAR(255) DEFAULT 'Shirwal Primary Health Centre (PHC)',
    catchment_area VARCHAR(255) DEFAULT 'Shirwal Ward 1-4 Catchment',
    jurisdiction_district VARCHAR(100) DEFAULT 'Pune',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    assigned_households INT DEFAULT 184,
    rch_coverage_score NUMERIC(5,2) DEFAULT 94.20,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES for fast querying
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_doctor_qr_id ON public.users(doctor_qr_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON public.referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_facility ON public.referrals(receiving_facility_id);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON public.referrals(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_ref ON public.referral_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON public.feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_role ON public.feedbacks(user_role);
CREATE INDEX IF NOT EXISTS idx_asha_workers_worker_id ON public.asha_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_asha_workers_phone ON public.asha_workers(phone);
CREATE INDEX IF NOT EXISTS idx_asha_workers_user_id ON public.asha_workers(user_id);

-- Storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 17. HOSPITAL FACILITIES TABLE
CREATE TABLE IF NOT EXISTS public.hospital_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) NOT NULL DEFAULT 'DISTRICT_HOSPITAL',
    district VARCHAR(100) NOT NULL DEFAULT 'Pune',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    pincode VARCHAR(20),
    address TEXT,
    contact_phone VARCHAR(30),
    emergency_hotline VARCHAR(30) DEFAULT '108 / 102',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    operational_status VARCHAR(50) NOT NULL DEFAULT 'OPTIMAL_ACTIVE',
    total_beds INT NOT NULL DEFAULT 100,
    occupied_beds INT NOT NULL DEFAULT 50,
    icu_total INT NOT NULL DEFAULT 10,
    icu_available INT NOT NULL DEFAULT 5,
    oxygen_total INT NOT NULL DEFAULT 30,
    oxygen_available INT NOT NULL DEFAULT 15,
    general_total INT NOT NULL DEFAULT 50,
    general_available INT NOT NULL DEFAULT 25,
    nicu_total INT NOT NULL DEFAULT 10,
    nicu_available INT NOT NULL DEFAULT 5,
    dialysis_total INT NOT NULL DEFAULT 6,
    dialysis_available INT NOT NULL DEFAULT 3,
    has_blood_bank BOOLEAN DEFAULT TRUE,
    has_ct_mri BOOLEAN DEFAULT TRUE,
    has_trauma_bay BOOLEAN DEFAULT TRUE,
    oxygen_plant_capacity_lpm INT DEFAULT 1000,
    facilities_catalog JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_facilities_district ON public.hospital_facilities(district);
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_type ON public.hospital_facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_status ON public.hospital_facilities(operational_status);

-- 18. HOSPITAL BED BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.hospital_bed_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_token VARCHAR(50) UNIQUE NOT NULL,
    facility_id UUID REFERENCES public.hospital_facilities(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    abha_id VARCHAR(100),
    age INT,
    gender VARCHAR(20),
    service_type VARCHAR(100) NOT NULL DEFAULT 'ICU_BED',
    clinical_urgency VARCHAR(50) NOT NULL DEFAULT 'URGENT_HIGH',
    symptoms TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'BOOKING_SUBMITTED',
    status_step INT NOT NULL DEFAULT 1,
    assigned_bed_number VARCHAR(100),
    assigned_doctor_name VARCHAR(255),
    assigned_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    timeline JSONB DEFAULT '[]'::jsonb,
    booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admitted_at TIMESTAMPTZ,
    discharged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_bookings_token ON public.hospital_bed_bookings(booking_token);
CREATE INDEX IF NOT EXISTS idx_hospital_bookings_facility ON public.hospital_bed_bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_hospital_bookings_status ON public.hospital_bed_bookings(status);

-- 19. HOSPITAL TELEMETRY LOGS
CREATE TABLE IF NOT EXISTS public.hospital_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.hospital_facilities(id) ON DELETE CASCADE,
    icu_occupancy_pct NUMERIC(5, 2),
    oxygen_pressure_bar NUMERIC(5, 2) DEFAULT 4.20,
    opd_queue_count INT DEFAULT 0,
    emergency_trauma_count INT DEFAULT 0,
    logged_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



