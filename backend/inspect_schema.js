const supabase = require('./src/config/supabaseClient');

async function inspectSchema() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        console.error('Error selecting from users:', error);
    } else {
        console.log('Sample user record from Supabase:', data);
        if (data && data.length > 0) {
            console.log('Existing columns in Supabase users table:', Object.keys(data[0]));
        }
    }
}

inspectSchema();
