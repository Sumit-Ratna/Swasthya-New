const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        defaultValue: () => require('crypto').randomUUID() 
    },
    phone: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    pan_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('patient', 'doctor', 'admin'),
        defaultValue: 'patient'
    },

    // Profile Section A: Personal
    name: { type: DataTypes.STRING },
    profile_photo: { type: DataTypes.STRING }, // URL
    email: { type: DataTypes.STRING, unique: true },
    dob: { type: DataTypes.DATEONLY },
    gender: { type: DataTypes.STRING },
    blood_group: { type: DataTypes.STRING },
    marital_status: { type: DataTypes.STRING },
    height: { type: DataTypes.FLOAT },
    weight: { type: DataTypes.FLOAT },
    address_city: { type: DataTypes.STRING },
    address_state: { type: DataTypes.STRING },
    emergency_contacts: { type: DataTypes.JSON, defaultValue: [] },
    unique_qr: { type: DataTypes.STRING, unique: true },

    // Profile Section B: Medical (JSON for flexibility)
    medical_history: {
        type: DataTypes.JSON,
        defaultValue: {
            allergies: [],
            chronic_diseases: [],
            current_meds: [],
            past_meds: [],
            injuries: [],
            surgeries: []
        }
    },

    // Profile Section C: Lifestyle
    lifestyle: {
        type: DataTypes.JSON,
        defaultValue: {
            diet: 'veg',
            smoking: 'no',
            alcohol: 'no',
            physical_activity: 'moderate',
            occupation: ''
        }
    },

    // Doctor Specifics
    specialization: { type: DataTypes.STRING },
    hospital_name: { type: DataTypes.STRING },
    doctor_qr_id: { type: DataTypes.STRING, unique: true },

    // Auth & Security
    biometric_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    biometric_secret: { type: DataTypes.STRING }, // Simulated key
    refresh_token: { type: DataTypes.STRING(500) } // allow longer tokens
});

module.exports = User;
