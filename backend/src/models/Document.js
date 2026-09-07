const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        defaultValue: () => require('crypto').randomUUID()
    },
    patient_id: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    type: {
        type: DataTypes.STRING, // 'lab_report', 'prescription', 'other'
        allowNull: false
    },
    file_url: {
        type: DataTypes.STRING,
        allowNull: true // Allow null for prescriptions/documents created without file upload
    },
    extracted_data: {
        type: DataTypes.JSON, // Stores AI extracted JSON (e.g. cholesterol values)
        allowNull: true
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_shared: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    shared_with: {
        type: DataTypes.JSON, // Array of doctor IDs if shared specifically
        allowNull: true
    },
    uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Document;
