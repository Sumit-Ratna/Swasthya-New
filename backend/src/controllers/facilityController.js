const dbService = require('../services/supabaseService');

const DEMO_FACILITIES = [
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
        specialties: ["General Medicine", "Maternal Health", "Basic Triage"]
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
        specialties: ["OBSTETRICS", "CARDIOLOGY", "PEDIATRICS", "GENERAL_MEDICINE", "TRAUMA_SURGERY"]
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
        specialties: ["CARDIOLOGY", "NEUROLOGY", "NEONATAL_ICU", "TRAUMA_SURGERY"]
    }
];

// Get all facilities with real-time operational status and load
exports.getFacilities = async (req, res) => {
    try {
        const { district, tier, emergency_capable } = req.query;
        let facilities = [];
        try {
            facilities = await dbService.getFacilities({
                district,
                tier,
                emergency_capable: emergency_capable ? emergency_capable === 'true' : undefined
            });
        } catch (dbErr) {
            console.warn("[FACILITY] Supabase notice (using demo fallback):", dbErr.message);
            facilities = DEMO_FACILITIES;
        }

        if (!facilities || facilities.length === 0) {
            facilities = DEMO_FACILITIES;
        }

        const enriched = facilities.map(f => {
            let specialties = f.specialties || [];
            if (!specialties || specialties.length === 0) {
                try {
                    specialties = typeof f.specialties_json === 'string' ? JSON.parse(f.specialties_json) : (f.specialties_json || []);
                } catch (e) {
                    specialties = [];
                }
            }
            return {
                ...f,
                specialties
            };
        });

        res.json(enriched);
    } catch (err) {
        console.error("[FACILITY] Fetch error:", err);
        res.json(DEMO_FACILITIES);
    }
};

// Get single facility
exports.getFacility = async (req, res) => {
    try {
        const { id } = req.params;
        let facility = null;
        try {
            facility = await dbService.getFacilityById(id);
        } catch (e) {}

        if (!facility) {
            facility = DEMO_FACILITIES.find(f => f.id === id) || DEMO_FACILITIES[0];
        }

        let doctors = [];
        try {
            doctors = await dbService.getDoctorsByFacility(id);
        } catch (e) {}

        res.json({ ...facility, doctors });
    } catch (err) {
        console.error("[FACILITY] Fetch detail error:", err);
        res.json(DEMO_FACILITIES[0]);
    }
};

// Update facility load / operational status
exports.updateOperationalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { operational_status, current_load } = req.body;
        const updated = await dbService.updateFacilityStatus(id, {
            operational_status,
            current_load,
            last_verified_at: new Date().toISOString()
        });

        res.json({
            message: "Facility operational status updated",
            facility: updated
        });
    } catch (err) {
        console.error("[FACILITY] Update error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get doctors at a facility
exports.getFacilityDoctors = async (req, res) => {
    try {
        const { id } = req.params;
        const { specialty } = req.query;
        let doctors = [];
        try {
            doctors = await dbService.getDoctorsByFacility(id, specialty);
        } catch (e) {}
        res.json(doctors);
    } catch (err) {
        console.error("[FACILITY] Doctors error:", err);
        res.json([]);
    }
};
