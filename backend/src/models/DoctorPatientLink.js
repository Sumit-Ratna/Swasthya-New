const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DoctorPatientLink = sequelize.define('DoctorPatientLink', {
    id: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        defaultValue: () => require('uuid').v4()
    },
    doctor_id: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    patient_id: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    linked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = DoctorPatientLink;
