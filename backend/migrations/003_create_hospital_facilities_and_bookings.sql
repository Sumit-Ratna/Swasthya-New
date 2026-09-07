-- ==============================================================================
-- Migration: 003_create_hospital_facilities_and_bookings.sql
-- Description: Complete Database Schema for Hospital Facilities, Bed Telemetry,
--              Citizen Bed Bookings, and 5-Stage Live Lifecycle Tracking in Supabase
-- ==============================================================================

-- 1. Create Hospital Facilities Table
CREATE TABLE IF NOT EXISTS public.hospital_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) NOT NULL DEFAULT 'DISTRICT_HOSPITAL', -- DISTRICT_HOSPITAL, SUB_DISTRICT_HOSPITAL, COMMUNITY_HEALTH_CENTRE, PRIMARY_HEALTH_CENTRE, SUB_CENTRE
    district VARCHAR(100) NOT NULL DEFAULT 'Pune',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    pincode VARCHAR(20),
    address TEXT,
    contact_phone VARCHAR(30),
    emergency_hotline VARCHAR(30) DEFAULT '108 / 102',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    operational_status VARCHAR(50) NOT NULL DEFAULT 'OPTIMAL_ACTIVE', -- OPTIMAL_ACTIVE, HIGH_LOAD, EMERGENCY_DIVERT, OPEN, CLOSED
    
    -- Inpatient & Specialized Bed Telemetry
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
    
    -- Specialized Capability Flags
    has_blood_bank BOOLEAN DEFAULT TRUE,
    has_ct_mri BOOLEAN DEFAULT TRUE,
    has_trauma_bay BOOLEAN DEFAULT TRUE,
    oxygen_plant_capacity_lpm INT DEFAULT 1000,
    facilities_catalog JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Hospital Facilities
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_district ON public.hospital_facilities(district);
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_type ON public.hospital_facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_status ON public.hospital_facilities(operational_status);

-- 2. Create Hospital Bed Bookings Table (Citizen & Patient Direct Booking Engine)
CREATE TABLE IF NOT EXISTS public.hospital_bed_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_token VARCHAR(50) UNIQUE NOT NULL, -- e.g. HOSP-PUN-84920, HOSP-BAR-71204
    facility_id UUID REFERENCES public.hospital_facilities(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    abha_id VARCHAR(100),
    age INT,
    gender VARCHAR(20),
    
    -- Service & Urgency Details
    service_type VARCHAR(100) NOT NULL DEFAULT 'ICU_BED', -- ICU_BED, OXYGEN_BED, GENERAL_WARD, NICU_BED, CT_MRI_SCAN, DIALYSIS, OPD_SPECIALIST
    clinical_urgency VARCHAR(50) NOT NULL DEFAULT 'URGENT_HIGH', -- EMERGENCY_CRITICAL, URGENT_HIGH, ROUTINE
    symptoms TEXT,
    
    -- Real-time 5-Stage Lifecycle State
    status VARCHAR(50) NOT NULL DEFAULT 'BOOKING_SUBMITTED', -- BOOKING_SUBMITTED, TRIAGE_VERIFIED, BED_RESERVED, PATIENT_IN_TRANSIT, ADMITTED_ACTIVE_CARE, DISCHARGED, CANCELLED
    status_step INT NOT NULL DEFAULT 1,
    assigned_bed_number VARCHAR(100),
    assigned_doctor_name VARCHAR(255),
    assigned_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Detailed Timeline Array
    timeline JSONB DEFAULT '[]'::jsonb,
    
    booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admitted_at TIMESTAMPTZ,
    discharged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Hospital Bookings
CREATE INDEX IF NOT EXISTS idx_hospital_bookings_token ON public.hospital_bed_bookings(booking_token);
CREATE INDEX IF NOT EXISTS idx_hospital_bookings_facility ON public.hospital_bed_bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_hospital_bookings_phone ON public.hospital_bed_bookings(patient_phone);
CREATE INDEX IF NOT EXISTS idx_hospital_bookings_status ON public.hospital_bed_bookings(status);

-- 3. Create Hospital Telemetry Logs Table
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

CREATE INDEX IF NOT EXISTS idx_telemetry_facility_id ON public.hospital_telemetry_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.hospital_telemetry_logs(created_at);

-- ==============================================================================
-- 4. Insert Default Seeds for Public Hospitals & Infrastructure
-- ==============================================================================

-- Facility 1: Pune District General Hospital
INSERT INTO public.hospital_facilities (
    id, name, facility_type, district, state, pincode, address, 
    contact_phone, emergency_hotline, latitude, longitude, operational_status,
    total_beds, occupied_beds, icu_total, icu_available, oxygen_total, oxygen_available,
    general_total, general_available, nicu_total, nicu_available, dialysis_total, dialysis_available,
    has_blood_bank, has_ct_mri, has_trauma_bay, oxygen_plant_capacity_lpm, facilities_catalog
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Pune District General Hospital',
    'DISTRICT_HOSPITAL',
    'Pune',
    'Maharashtra',
    '411001',
    'Station Road, Pune Medical Enclave, Pune - 411001',
    '+91 20 2612 3456',
    '108 / 102',
    18.5204303,
    73.8567437,
    'OPTIMAL_ACTIVE',
    450, 368, 40, 6, 150, 32, 200, 28, 20, 6, 12, 3,
    TRUE, TRUE, TRUE, 2000,
    '[
        {"name": "24x7 Level-1 Emergency & Trauma Bay", "desc": "4 Resuscitation bays, cardiac defibrillators, point-of-care ultrasound."},
        {"name": "Intensive Coronary Care Unit (ICCU / ICU)", "desc": "40 Advanced ventilator-supported beds with 24x7 intensivist coverage."},
        {"name": "Neonatal & Pediatric Intensive Care (NICU)", "desc": "20 Warmers, phototherapy units and neonatal CPAP ventilators."},
        {"name": "Advanced Radiology & Imaging Complex", "desc": "128-Slice Multidetector CT, 1.5 Tesla MRI, 3D Ultrasound & Digital X-Ray."},
        {"name": "24x7 In-House Blood Bank & Component Separation", "desc": "Platelets, Fresh Frozen Plasma (FFP), Packed Red Blood Cells (PRBC)."},
        {"name": "Central Pathology & Molecular Diagnostics", "desc": "Automated biochemistry, lipid panels, hematology & viral RT-PCR tests."},
        {"name": "Hemodialysis Unit", "desc": "12 High-flux dialysis stations with dedicated RO water plant."},
        {"name": "Dedicated Liquid Medical Oxygen (LMO) Plant", "desc": "20,000 Liter cryogenic tank delivering 99.5% medical oxygen pipeline."}
    ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    total_beds = EXCLUDED.total_beds,
    occupied_beds = EXCLUDED.occupied_beds,
    icu_available = EXCLUDED.icu_available,
    oxygen_available = EXCLUDED.oxygen_available,
    facilities_catalog = EXCLUDED.facilities_catalog;

-- Facility 2: Rural Hospital Baramati
INSERT INTO public.hospital_facilities (
    id, name, facility_type, district, state, pincode, address, 
    contact_phone, emergency_hotline, latitude, longitude, operational_status,
    total_beds, occupied_beds, icu_total, icu_available, oxygen_total, oxygen_available,
    general_total, general_available, nicu_total, nicu_available, dialysis_total, dialysis_available,
    has_blood_bank, has_ct_mri, has_trauma_bay, oxygen_plant_capacity_lpm, facilities_catalog
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Rural Hospital Baramati',
    'SUB_DISTRICT_HOSPITAL',
    'Pune',
    'Maharashtra',
    '413133',
    'MIDC Health Complex, Baramati - 413133',
    '+91 2112 222100',
    '108',
    18.1517332,
    74.5768524,
    'OPTIMAL_ACTIVE',
    120, 78, 10, 3, 40, 16, 60, 18, 5, 3, 4, 1,
    TRUE, FALSE, TRUE, 500,
    '[
        {"name": "24x7 Emergency Stabilization & Triage", "desc": "Emergency intake with instant tele-triage connection to District Hub."},
        {"name": "Secondary Care ICU & High-Dependency Unit", "desc": "10 Monitor-equipped beds for acute stabilization."},
        {"name": "Maternal & Child Health Care (OB-GYN)", "desc": "Comprehensive obstetric care, normal delivery & emergency C-section suites."},
        {"name": "Digital Diagnostic X-Ray & Ultrasound", "desc": "Emergency X-ray, obstetric sonography & basic pathology."},
        {"name": "Daycare Dialysis Unit", "desc": "4 Hemodialysis beds under weekly nephrologist rounds."},
        {"name": "PSA Oxygen Generator Plant", "desc": "500 LPM on-site oxygen generation with cylinder manifold backup."}
    ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    total_beds = EXCLUDED.total_beds,
    occupied_beds = EXCLUDED.occupied_beds,
    icu_available = EXCLUDED.icu_available,
    oxygen_available = EXCLUDED.oxygen_available,
    facilities_catalog = EXCLUDED.facilities_catalog;

-- Facility 3: Primary Health Centre Shirwal
INSERT INTO public.hospital_facilities (
    id, name, facility_type, district, state, pincode, address, 
    contact_phone, emergency_hotline, latitude, longitude, operational_status,
    total_beds, occupied_beds, icu_total, icu_available, oxygen_total, oxygen_available,
    general_total, general_available, nicu_total, nicu_available, dialysis_total, dialysis_available,
    has_blood_bank, has_ct_mri, has_trauma_bay, oxygen_plant_capacity_lpm, facilities_catalog
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Primary Health Centre Shirwal',
    'PRIMARY_HEALTH_CENTRE',
    'Satara',
    'Maharashtra',
    '412801',
    'National Highway 48, Shirwal - 412801',
    '+91 2169 244222',
    '102 / 108',
    18.1365021,
    73.9788094,
    'OPTIMAL_ACTIVE',
    30, 11, 2, 2, 10, 6, 16, 9, 2, 2, 0, 0,
    FALSE, FALSE, FALSE, 100,
    '[
        {"name": "24x7 Delivery & Postnatal Ward", "desc": "Government institutional delivery center with newborn resuscitation warmers."},
        {"name": "First-Line Emergency Stabilization Room", "desc": "Oxygen concentrators, nebulization & acute wound management."},
        {"name": "eSanjeevani Tele-Consultation Room", "desc": "Daily video-consultation with District Hospital specialists."},
        {"name": "Essential Drug Dispensing Pharmacy", "desc": "Free distribution of 150+ essential NLEM medications."},
        {"name": "Immunization & RCH Cold-Chain Unit", "desc": "Deep freezers & ILR for universal vaccine storage."}
    ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    total_beds = EXCLUDED.total_beds,
    occupied_beds = EXCLUDED.occupied_beds,
    icu_available = EXCLUDED.icu_available,
    oxygen_available = EXCLUDED.oxygen_available,
    facilities_catalog = EXCLUDED.facilities_catalog;

-- 5. Insert Sample Seed Bookings with 5-Stage Live Lifecycle
INSERT INTO public.hospital_bed_bookings (
    booking_token, facility_id, patient_name, patient_phone, abha_id, age, gender,
    service_type, clinical_urgency, symptoms, status, status_step, assigned_bed_number, assigned_doctor_name,
    timeline
) VALUES (
    'HOSP-PUN-84920',
    '11111111-1111-1111-1111-111111111111',
    'Rameshwar Patil',
    '+919876543210',
    '91-8492-4589-7080',
    52,
    'Male',
    'ICU_BED',
    'EMERGENCY_CRITICAL',
    'Severe acute myocardial infarction, ST elevation on field ECG, SpO2 88%',
    'BED_RESERVED',
    3,
    'ICU-Bed #04',
    'Dr. Anita Joshi (Cardiologist)',
    '[
        {"stage": "BOOKING_SUBMITTED", "title": "Booking Received", "time": "10:30 AM", "done": true, "desc": "Request logged via Swasthya Citizen Gateway."},
        {"stage": "TRIAGE_VERIFIED", "title": "Triage Risk Verified", "time": "10:34 AM", "done": true, "desc": "Medical Officer confirmed Emergency Tier 1."},
        {"stage": "BED_RESERVED", "title": "Bed #ICU-04 Reserved", "time": "10:38 AM", "done": true, "desc": "ICU Bed locked under Dr. Anita Joshi."},
        {"stage": "PATIENT_IN_TRANSIT", "title": "Patient In-Transit", "time": "Pending ETA", "done": false, "desc": "108 Ambulance en route to hospital emergency bay."},
        {"stage": "ADMITTED_ACTIVE_CARE", "title": "Admitted & Active Care", "time": "Pending Arrival", "done": false, "desc": "Intake examination & active clinical protocol."}
    ]'::jsonb
) ON CONFLICT (booking_token) DO NOTHING;

INSERT INTO public.hospital_bed_bookings (
    booking_token, facility_id, patient_name, patient_phone, abha_id, age, gender,
    service_type, clinical_urgency, symptoms, status, status_step, assigned_bed_number, assigned_doctor_name,
    timeline
) VALUES (
    'HOSP-BAR-71204',
    '22222222-2222-2222-2222-222222222222',
    'Sunita Deshmukh',
    '+919822334455',
    '91-7120-9944-1122',
    44,
    'Female',
    'OXYGEN_BED',
    'URGENT_HIGH',
    'Post-viral pneumonia, SpO2 91% on room air, respiratory rate 26/min',
    'PATIENT_IN_TRANSIT',
    4,
    'Ward-B, Bed #12',
    'Dr. Rajesh Deshpande',
    '[
        {"stage": "BOOKING_SUBMITTED", "title": "Booking Received", "time": "09:15 AM", "done": true, "desc": "Request logged by ASHA worker Sumitra."},
        {"stage": "TRIAGE_VERIFIED", "title": "Triage Risk Verified", "time": "09:20 AM", "done": true, "desc": "SpO2 91% flagged for high-flow oxygen."},
        {"stage": "BED_RESERVED", "title": "Bed #12 Reserved", "time": "09:25 AM", "done": true, "desc": "Oxygen bed pre-warmed in Ward B."},
        {"stage": "PATIENT_IN_TRANSIT", "title": "Patient In-Transit", "time": "09:40 AM", "done": true, "desc": "Patient in transit via rural transport."},
        {"stage": "ADMITTED_ACTIVE_CARE", "title": "Admitted & Active Care", "time": "Expected 10:15 AM", "done": false, "desc": "Nurse triage check-in ready."}
    ]'::jsonb
) ON CONFLICT (booking_token) DO NOTHING;
