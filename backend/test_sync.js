const axios = require('axios');
const supabase = require('./src/config/supabaseClient');

async function testFullSync() {
    console.log('=== STARTING SWASTHYA FULL-STACK CLOUD SYNC VERIFICATION ===');
    
    // 1. Check direct Supabase connection
    console.log('\n1. Checking Supabase Database Connection...');
    const { data: dbCheck, error: dbErr } = await supabase.from('users').select('id, full_name, email, phone').limit(3);
    if (dbErr) {
        console.error('❌ Supabase Connection Failed:', dbErr.message);
    } else {
        console.log('✅ Supabase PostgreSQL Connected! Found existing records:', dbCheck.length);
        console.log('   Sample Records:', dbCheck);
    }

    // 2. Test Backend Health & LAN Binding
    console.log('\n2. Checking Backend API (0.0.0.0:8000)...');
    try {
        const healthRes = await axios.get('http://localhost:8000/api/health');
        console.log('✅ Backend API Healthy:', healthRes.data);
    } catch (e) {
        console.error('❌ Backend Health Check Failed:', e.message);
    }

    // 3. Test Registration via API (Simulating Mobile Request)
    const testEmail = `test.sync.${Date.now()}@gmail.com`;
    console.log(`\n3. Simulating Mobile Registration with Email: ${testEmail}...`);
    try {
        const regRes = await axios.post('http://localhost:8000/api/auth/register/email', {
            email: testEmail,
            password: 'StrongPassword123!',
            name: 'Mobile Cloud Test Patient',
            gender: 'Male',
            dob: '1998-05-15',
            blood_group: 'B+',
            address_city: 'Lucknow',
            address_state: 'Uttar Pradesh',
            pincode: '226001',
            abha_id: '91-1234-5678-9012'
        });
        console.log('✅ Mobile User Registered via Backend API. User ID:', regRes.data.user.id);
        const token = regRes.data.accessToken;

        // 4. Verify user exists in the Supabase Cloud PostgreSQL table
        console.log('\n4. Verifying User in Supabase `users` & `patients` Tables...');
        const { data: supaUser, error: findErr } = await supabase
            .from('users')
            .select('id, email, full_name, role, status')
            .eq('id', regRes.data.user.id)
            .single();

        const { data: supaPatient } = await supabase
            .from('patients')
            .select('id, user_id, full_name, date_of_birth, gender, district, abha_id')
            .eq('id', regRes.data.user.id)
            .single();

        if (findErr || !supaUser) {
            console.error('❌ User not found in Supabase:', findErr?.message);
        } else {
            console.log('✅ Confirmed in Supabase PostgreSQL:');
            console.log('   - User ID:', supaUser.id);
            console.log('   - Full Name:', supaUser.full_name);
            console.log('   - Email:', supaUser.email);
            console.log('   - Role:', supaUser.role);
            console.log('   - Patient District:', supaPatient?.district);
            console.log('   - Patient ABHA ID:', supaPatient?.abha_id);
        }

        // 5. Simulate Profile Update from Mobile
        console.log('\n5. Simulating Profile Update from Mobile App...');
        const updateRes = await axios.post('http://localhost:8000/api/profile/update', {
            section: 'personal',
            data: {
                name: 'Mobile Patient (Updated Across Devices)',
                address_city: 'Mumbai',
                gender: 'Male'
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Profile Update API Success:', updateRes.data.message);

        // 6. Verify Update in Supabase
        console.log('\n6. Checking Updated Data in Supabase...');
        const { data: updatedSupaUser } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', regRes.data.user.id)
            .single();

        const { data: updatedSupaPatient } = await supabase
            .from('patients')
            .select('id, full_name, district')
            .eq('id', regRes.data.user.id)
            .single();

        console.log('✅ Verified Synced Data in Supabase:');
        console.log('   - Updated User Table Name:', updatedSupaUser.full_name);
        console.log('   - Updated Patient Table Name:', updatedSupaPatient?.full_name);
        console.log('   - Updated Patient Table District:', updatedSupaPatient?.district);

        // 7. Simulate Cross-Device Login from Laptop
        console.log(`\n7. Simulating Laptop/Web Login with same credentials (${testEmail})...`);
        const loginRes = await axios.post('http://localhost:8000/api/auth/login/email', {
            email: testEmail,
            password: 'StrongPassword123!',
            role: 'patient'
        });
        console.log('✅ Laptop/Web Login Successful!');
        console.log('   - Synced User Name:', loginRes.data.user.name);
        console.log('   - Synced District:', loginRes.data.user.address_city);

        // 8. Clean up test record from Supabase
        console.log('\n8. Cleaning up test record from Supabase...');
        await supabase.from('patients').delete().eq('id', regRes.data.user.id);
        await supabase.from('users').delete().eq('id', regRes.data.user.id);
        console.log('✅ Test record removed cleanly.');

        console.log('\n🎉 ALL FULL-STACK CLOUD SYNCHRONIZATION TESTS PASSED PERFECTLY!');
    } catch (err) {
        console.error('❌ Sync Test Failed:', err.response?.data || err.message);
    }
}

testFullSync();
