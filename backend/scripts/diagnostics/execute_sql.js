const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSql() {
    const sqlPath = path.join(__dirname, '../../migrations/002_create_asha_workers.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Attempting to execute SQL on Supabase project:', supabaseUrl);

    // Method 1: Try Supabase SQL Query API endpoint
    try {
        const res = await axios.post(
            `${supabaseUrl}/rest/v1/rpc/exec_sql`,
            { query: sqlContent },
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ SQL Executed via RPC exec_sql:', res.data);
        return;
    } catch (err) {
        console.log('ℹ️ RPC exec_sql endpoint returned:', err.response?.status, err.response?.data || err.message);
    }

    // Method 2: Try pg-meta API endpoint
    try {
        const res = await axios.post(
            `${supabaseUrl}/pg/query`,
            { query: sqlContent },
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ SQL Executed via pg/query:', res.data);
        return;
    } catch (err) {
        console.log('ℹ️ pg/query endpoint returned:', err.response?.status, err.response?.data || err.message);
    }
}

runSql().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
