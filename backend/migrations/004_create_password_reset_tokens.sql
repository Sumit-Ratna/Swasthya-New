-- ==============================================================================
-- MIGRATION: 004_create_password_reset_tokens.sql
-- PURPOSE: Production-grade Password Reset & Recovery Token Store
-- SECURITY: Strict Row Level Security (RLS) - Server/Service-Role Access Only
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    reset_token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    used_at TIMESTAMPTZ
);

-- Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON public.password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON public.password_reset_tokens(reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_active ON public.password_reset_tokens(email, used, expires_at);

-- Enable Strict Row Level Security
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Block all direct anonymous or client-side operations
-- Only backend service-role operations (FastAPI/Express via service key) can manage tokens
DROP POLICY IF EXISTS "Deny all public client access to password reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Deny all public client access to password reset tokens"
    ON public.password_reset_tokens
    FOR ALL
    TO public, anon, authenticated
    USING (false)
    WITH CHECK (false);

-- Automated cleanup of expired tokens (helper function)
CREATE OR REPLACE FUNCTION clean_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM public.password_reset_tokens
    WHERE expires_at < (now() - INTERVAL '1 day')
       OR (used = TRUE AND created_at < (now() - INTERVAL '7 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
