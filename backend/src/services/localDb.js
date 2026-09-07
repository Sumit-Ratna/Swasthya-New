const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'swasthya_db.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial Seed Data
const INITIAL_DATA = {
    users: [
        {
            id: '11111111-aaaa-1111-aaaa-111111111111',
            phone: '+919876543210',
            name: 'Sunita Patil',
            email: 'sunita.patil@ruralhealth.org',
            role: 'health_worker',
            dob: '1988-04-12',
            gender: 'Female',
            blood_group: 'A+',
            hospital_name: 'Shirwal Catchment Health Post'
        },
        {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            phone: '+917080135660',
            name: 'Aditya Singh',
            email: 'aditya.singh@example.com',
            role: 'patient',
            dob: '2005-07-02',
            gender: 'Male',
            blood_group: 'B+'
        },
        {
            id: '44444444-4444-4444-4444-444444444444',
            phone: '+919123456780',
            name: 'Dr. Anand Deshmukh',
            email: 'dr.anand@civilhospital.in',
            role: 'doctor',
            specialization: 'OBSTETRICS & GYNECOLOGY',
            hospital_name: 'District Hospital Nashik',
            doctor_qr_id: 'DOC-OBGYN-01'
        },
        {
            id: '55555555-5555-5555-5555-555555555555',
            phone: '+919876500001',
            name: 'Dr. Priya Sharma',
            email: 'dr.priya@generalhospital.in',
            role: 'doctor',
            specialization: 'GENERAL MEDICINE',
            hospital_name: 'Government General Hospital Pune',
            doctor_qr_id: 'DOC-GEN-02'
        },
        {
            id: '66666666-6666-6666-6666-666666666666',
            phone: '+919000000001',
            name: 'Ramesh Patil (Caregiver)',
            role: 'caregiver',
            gender: 'Male',
            blood_group: 'O+'
        },
        {
            id: '77777777-7777-7777-7777-777777777777',
            phone: '+919999900000',
            name: 'MSInS Health Authority Admin',
            role: 'admin',
            email: 'admin@msins.maharashtra.gov.in'
        }
    ],
    facilities: [
        {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Primary Health Centre Shirwal',
            tier: 'PRIMARY_HEALTH_CENTRE',
            address: 'Shirwal Catchment, Pune District',
            district: 'Pune',
            latitude: 18.152,
            longitude: 73.985,
            operational_status: 'OPEN',
            current_load: 42,
            emergency_capable: false,
            specialties: ['General Medicine', 'Maternal Health', 'Basic Triage']
        },
        {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'District Hospital Nashik',
            tier: 'DISTRICT_HOSPITAL',
            address: 'Civil Hospital Road, Nashik',
            district: 'Nashik',
            latitude: 19.997,
            longitude: 73.789,
            operational_status: 'OPEN',
            current_load: 68,
            emergency_capable: true,
            specialties: ['OBSTETRICS', 'CARDIOLOGY', 'PEDIATRICS', 'GENERAL_MEDICINE', 'SURGERY']
        },
        {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Government General Hospital Pune',
            tier: 'TERTIARY_HOSPITAL',
            address: 'Station Road, Pune City',
            district: 'Pune',
            latitude: 18.520,
            longitude: 73.856,
            operational_status: 'OPEN',
            current_load: 84,
            emergency_capable: true,
            specialties: ['CARDIOLOGY', 'NEUROLOGY', 'NEONATAL_ICU', 'TRAUMA_SURGERY']
        },
        {
            id: '44444444-1111-1111-1111-444444444444',
            name: 'Community Health Centre Bhor',
            tier: 'COMMUNITY_HEALTH_CENTRE',
            address: 'Bhor Taluka, Pune District',
            district: 'Pune',
            latitude: 18.163,
            longitude: 73.844,
            operational_status: 'OPEN',
            current_load: 35,
            emergency_capable: true,
            specialties: ['General Medicine', 'Maternal & Child Health', 'Dental', 'Emergency Care']
        }
    ],
    doctors: [
        {
            id: '44444444-4444-4444-4444-444444444444',
            user_id: '44444444-4444-4444-4444-444444444444',
            facility_id: '22222222-2222-2222-2222-222222222222',
            name: 'Dr. Anand Deshmukh',
            specialty_name: 'OBSTETRICS',
            qualification: 'MBBS, MS (OBGYN)',
            registration_number: 'MCI-2015-88349',
            available_status: 'AVAILABLE',
            opd_timing: '09:00 AM - 02:00 PM'
        },
        {
            id: '55555555-5555-5555-5555-555555555555',
            user_id: '55555555-5555-5555-5555-555555555555',
            facility_id: '33333333-3333-3333-3333-333333333333',
            name: 'Dr. Priya Sharma',
            specialty_name: 'GENERAL MEDICINE',
            qualification: 'MBBS, MD',
            registration_number: 'MCI-2018-44211',
            available_status: 'AVAILABLE',
            opd_timing: '10:00 AM - 04:00 PM'
        }
    ],
    referrals: [
        {
            id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            receiving_facility_id: '22222222-2222-2222-2222-222222222222',
            assigned_doctor_id: '44444444-4444-4444-4444-444444444444',
            status: 'APPOINTMENT_BOOKED',
            risk_level: 'HIGH',
            urgency: 'URGENT',
            specialty_required: 'OBSTETRICS',
            primary_complaint: 'Maternal hypertension at 32 weeks ANC',
            clinical_summary: 'BP 150/98, elevated protein, referred for ultrasound and specialist consult.',
            slot_token: 'Token #A-14',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            facilities: {
                name: 'District Hospital Nashik',
                tier: 'DISTRICT_HOSPITAL',
                address: 'Civil Hospital Road, Nashik',
                district: 'Nashik'
            },
            doctors: {
                name: 'Dr. Anand Deshmukh',
                specialty_name: 'OBSTETRICS'
            }
        }
    ],
    referral_events: [
        {
            id: 'ev-1',
            referral_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            from_status: 'INIT',
            to_status: 'TRIAGED',
            actor_role: 'HEALTH_WORKER',
            reason: 'Health Worker vitals check (High Maternal Risk)',
            created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'ev-2',
            referral_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            from_status: 'TRIAGED',
            to_status: 'FACILITY_SELECTED',
            actor_role: 'SYSTEM',
            reason: 'District Hospital Nashik matched by Obstetrics capability',
            created_at: new Date(Date.now() - 2800000).toISOString()
        },
        {
            id: 'ev-3',
            referral_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            from_status: 'FACILITY_SELECTED',
            to_status: 'APPOINTMENT_BOOKED',
            actor_role: 'FACILITY_STAFF',
            reason: 'Appointment confirmed with Slot Token #A-14',
            created_at: new Date(Date.now() - 1500000).toISOString()
        }
    ],
    assessments: [
        {
            id: 'ass-1',
            patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            systolic_bp: 150,
            diastolic_bp: 98,
            spo2: 97,
            pulse_rate: 88,
            temperature_f: 98.6,
            is_pregnant: true,
            risk_level: 'HIGH',
            risk_reasons: ['Stage 2 Hypertension (150/98 mmHg)', 'High-Risk Pregnancy with elevated blood pressure'],
            created_at: new Date(Date.now() - 3600000).toISOString()
        }
    ],
    appointments: [
        {
            id: 'apt-1',
            patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            doctor_id: '44444444-4444-4444-4444-444444444444',
            appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            slot_time: '10:30 AM',
            status: 'CONFIRMED',
            type: 'OPD_CONSULT',
            doctor: {
                id: '44444444-4444-4444-4444-444444444444',
                name: 'Dr. Anand Deshmukh',
                specialization: 'OBSTETRICS',
                hospital_name: 'District Hospital Nashik'
            }
        }
    ],
    documents: [
        {
            id: 'doc-1',
            patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            file_name: 'Complete_Blood_Count_Report.pdf',
            file_type: 'application/pdf',
            document_type: 'LAB_REPORT',
            file_path: '/uploads/demo-cbc.pdf',
            ai_summary: 'Hemoglobin: 12.4 g/dL (Normal). Platelets: 220,000 /mcL (Normal). WBC count slightly elevated at 10,800 /mcL.',
            created_at: new Date(Date.now() - 172800000).toISOString()
        }
    ],
    security_audit_ledger: [
        {
            id: '1',
            block_index: 1,
            event_type: 'REFERRAL_CREATED',
            entity_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            actor_id: '11111111-aaaa-1111-aaaa-111111111111',
            actor_role: 'HEALTH_WORKER',
            action: 'DISPATCH_HIGH_RISK_REFERRAL',
            previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
            hash: crypto.createHash('sha256').update('GENESIS_BLOCK_SWSTHYA_SETU').digest('hex'),
            created_at: new Date(Date.now() - 3600000).toISOString()
        }
    ],
    family_members: [],
    caregiver_relationships: [
        {
            id: 'cg-1',
            caregiver_user_id: '66666666-6666-6666-6666-666666666666',
            caregiver_id: '66666666-6666-6666-6666-666666666666',
            patient_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            relationship_type: 'FATHER',
            relationship: 'FATHER',
            permission_scope: 'FULL_ACCESS',
            status: 'ACTIVE',
            revoked_at: null,
            created_at: new Date(Date.now() - 3600000).toISOString()
        }
    ]
};

class LocalDb {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const raw = fs.readFileSync(DB_FILE, 'utf8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[LOCAL DB] File read error, resetting to initial seed:', e.message);
        }
        this.save(INITIAL_DATA);
        return { ...INITIAL_DATA };
    }

    save(data = this.data) {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.error('[LOCAL DB] Save error:', e.message);
        }
    }

    getCollection(name) {
        if (!this.data[name]) {
            this.data[name] = [];
            this.save();
        }
        return this.data[name];
    }

    insert(collectionName, item) {
        const list = this.getCollection(collectionName);
        list.push(item);
        this.save();
        return item;
    }

    update(collectionName, filterFn, updateData) {
        const list = this.getCollection(collectionName);
        let updatedItem = null;
        for (let i = 0; i < list.length; i++) {
            if (filterFn(list[i])) {
                list[i] = { ...list[i], ...updateData };
                updatedItem = list[i];
                break;
            }
        }
        this.save();
        return updatedItem;
    }

    find(collectionName, filterFn = () => true) {
        const list = this.getCollection(collectionName);
        return list.filter(filterFn);
    }

    findOne(collectionName, filterFn) {
        const list = this.getCollection(collectionName);
        return list.find(filterFn) || null;
    }

    findById(collectionName, id) {
        return this.findOne(collectionName, item => item.id === id);
    }

    delete(collectionName, filterFn) {
        const list = this.getCollection(collectionName);
        const nextList = list.filter(item => !filterFn(item));
        this.data[collectionName] = nextList;
        this.save();
        return true;
    }
}

module.exports = new LocalDb();
