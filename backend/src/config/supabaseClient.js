const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.serviceRoleKey;

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.warn('[WARNING] SUPABASE_URL or keys are not properly configured.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = supabase;
