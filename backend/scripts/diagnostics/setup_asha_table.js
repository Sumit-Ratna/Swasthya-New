const supabase = require('../../src/config/supabaseClient');
const bcrypt = require('bcryptjs');

async function setupAshaTable() {
    console.log('🚀 Setting up ASHA User in Supabase...');

    const defaultAshaPhone = '+919876543210';
    const defaultAshaEmail = 'asha@swasthya.gov.in';
    const passwordHash = bcrypt.hashSync('asha123', 10);

    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone', defaultAshaPhone)
        .maybeSingle();

    if (!existingUser) {
        const { data: newUser, error: insertErr } = await supabase
            .from('users')
            .insert([{
                phone: defaultAshaPhone,
                full_name: 'Sunita Gaikwad (ASHA)',
                email: defaultAshaEmail,
                role: 'health_worker',
                password_hash: passwordHash,
                jurisdiction_district: 'Pune',
                status: 'ACTIVE'
            }])
            .select()
            .single();

        if (insertErr) {
            console.error('❌ Insert error into users:', insertErr);
        } else {
            console.log('✅ ASHA Worker User created successfully in `users` table:', newUser);
        }
    } else {
        console.log('✅ Found existing ASHA user, updating role to health_worker...');
        const { data: updated, error: updateErr } = await supabase
            .from('users')
            .update({ 
                role: 'health_worker',
                full_name: 'Sunita Gaikwad (ASHA)',
                email: defaultAshaEmail,
                password_hash: passwordHash,
                status: 'ACTIVE'
            })
            .eq('id', existingUser.id)
            .select()
            .single();

        if (updateErr) {
            console.error('❌ Update error:', updateErr);
        } else {
            console.log('✅ ASHA User updated successfully:', updated);
        }
    }
}

setupAshaTable().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
