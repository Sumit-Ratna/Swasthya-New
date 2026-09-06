const sequelize = require('./src/config/database');
const { User, Appointment, Document, DoctorPatientLink } = require('./src/models');
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
    try {
        console.log('--- Database Seeding Started ---');
        await sequelize.sync({ force: true }); // Reset DB for clean seed
        console.log('Database synced');

        // Create a Doctor
        const doctor = await User.create({
            id: 'doc-101',
            name: 'Dr. Aditya',
            phone: '+919999999999',
            email: 'aditya@healthnexus.com',
            role: 'doctor',
            specialization: 'Cardiology',
            hospital_name: 'Metro Heart Institute',
            unique_qr: 'QR-DOC-ADITYA-7172',
            dob: '1985-05-20',
            gender: 'Male',
            blood_group: 'B+',
            height: 175.5,
            weight: 70.0,
            lifestyle: {
                diet: 'non-veg',
                smoking: 'no',
                alcohol: 'occasionally',
                physical_activity: 'high',
                occupation: 'Cardiologist'
            }
        });
        console.log('Doctor created');

        // Create a Patient
        const patient = await User.create({
            id: 'pat-201',
            name: 'Sumit Sharma',
            phone: '+918888888888',
            email: 'sumit@example.com',
            role: 'patient',
            dob: '1995-10-15',
            gender: 'Male',
            blood_group: 'O+',
            height: 180.0,
            weight: 75.0,
            unique_qr: 'QR-PAT-SUMIT-2712',
            medical_history: {
                allergies: ['Peanuts'],
                chronic_diseases: ['None'],
                current_meds: ['Multivitamin'],
                past_meds: [],
                injuries: ['Left Ankle Sprain'],
                surgeries: []
            },
            lifestyle: {
                diet: 'veg',
                smoking: 'no',
                alcohol: 'no',
                physical_activity: 'moderate',
                occupation: 'Software Engineer'
            }
        });
        console.log('Patient created');

        // Link Patient to Doctor
        await DoctorPatientLink.create({
            doctor_id: doctor.id,
            patient_id: patient.id,
            status: 'active'
        });
        console.log('Doctor-Patient link created');

        // Create an Appointment
        await Appointment.create({
            id: uuidv4(),
            patient_id: patient.id,
            doctor_id: doctor.id,
            appointment_date: new Date().toISOString().split('T')[0],
            slot_time: '10:30 AM',
            status: 'CONFIRMED',
            type: 'OPD',
            notes: 'Regular heart checkup'
        });
        console.log('Appointment created');

        console.log('--- Seeding Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
};

seed();
