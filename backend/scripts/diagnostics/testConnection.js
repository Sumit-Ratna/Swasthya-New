const supabase = require('../../src/config/supabaseClient');
const dbService = require('../../src/services/supabaseService');
const { v4: uuidv4 } = require('uuid');

async function testSupabaseConnection() {
    try {
        console.log("[TEST] Testing Supabase Connection...");

        // 1. Health Ping
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error("[ERROR] Supabase ping failed:", error.message);
            console.log("[INFO] Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env, and ensure supabase_schema.sql has been executed in the Supabase SQL Editor.");
            return;
        }

        console.log("[SUCCESS] Supabase Connected Successfully! User table accessible.");

        // 2. Test User Creation
        const testPhone = '+919999999999';
        const doctorId = uuidv4();
        console.log(`[TEST] Creating test doctor (${doctorId})...`);
        const doctor = await dbService.createUser(doctorId, {
            phone: testPhone,
            name: 'Dr. Test Supabase',
            role: 'doctor',
            specialization: 'Cardiology',
            hospital_name: 'Supabase Health Center',
            doctor_qr_id: 'DOC-SUPA-TEST'
        });
        console.log("[SUCCESS] Doctor created:", doctor.id);

        // 3. Test Query
        const fetched = await dbService.getUser(doctorId);
        console.log("[SUCCESS] Fetched Doctor:", fetched.name, `(${fetched.specialization})`);

        // 4. Cleanup
        await dbService.deleteUser(doctorId);
        console.log("[SUCCESS] Cleanup completed.");
        console.log("\n>>> ALL SUPABASE TESTS PASSED! <<<");

    } catch (err) {
        console.error("[ERROR] Test failed:", err.message);
    }
}

testSupabaseConnection();
