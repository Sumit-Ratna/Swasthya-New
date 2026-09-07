-- ==============================================================================
-- Migration: 002_create_asha_workers.sql
-- Description: Create ASHA / ANM health workers table & indexes in Supabase
-- ==============================================================================

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asha_workers_worker_id ON public.asha_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_asha_workers_phone ON public.asha_workers(phone);
CREATE INDEX IF NOT EXISTS idx_asha_workers_user_id ON public.asha_workers(user_id);

-- Insert Default Seed ASHA Worker
INSERT INTO public.asha_workers (
    worker_id, full_name, phone, email, password_hash, role, 
    assigned_subcentre, assigned_phc, catchment_area, jurisdiction_district, 
    state, assigned_households, rch_coverage_score, status
) VALUES (
    'ASHA-MAH-4019', 'Sunita Gaikwad (ASHA)', '+919876543210', 'asha@swasthya.gov.in',
    '$2b$10$33VqP6iv1O5VK9.G5NEszuKZ6oT7AWRRhRRfvB7hbvjjzxzYOdeAC', 'health_worker',
    'Shirwal Sub-Centre', 'Shirwal Primary Health Centre (PHC)', 'Shirwal Catchment, Ward 4',
    'Pune', 'Maharashtra', 184, 94.20, 'ACTIVE'
) ON CONFLICT (worker_id) DO NOTHING;
