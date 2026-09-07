const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        defaultValue: () => require('crypto').randomUUID()
    },
    actor_id: { type: DataTypes.STRING(100), allowNull: false }, // Who performed action
    action_type: { type: DataTypes.STRING }, // e.g., 'VIEW_RECORD', 'PRESCRIBE', 'LOGIN'
    target_id: { type: DataTypes.STRING }, // Affected record/user ID
    details: { type: DataTypes.JSON },
    ip_address: { type: DataTypes.STRING },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = AuditLog;
