const supabase = require('./src/config/supabaseClient');

async function listTables() {
    const candidateTables = [
        'users', 'patients', 'documents', 'appointments', 'referrals', 
        'assessments', 'facilities', 'doctors', 'prescriptions', 
        'referral_events', 'family_links', 'notifications', 'feedbacks'
    ];

    for (const tbl of candidateTables) {
        const { data, error } = await supabase.from(tbl).select('*').limit(1);
        if (error) {
            console.log(`❌ Table '${tbl}': ${error.message}`);
        } else {
            console.log(`✅ Table '${tbl}' EXISTS. Columns:`, data.length > 0 ? Object.keys(data[0]) : '(empty table)');
        }
    }
}

listTables();
