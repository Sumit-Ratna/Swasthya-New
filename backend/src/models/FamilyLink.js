const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FamilyLink = sequelize.define('FamilyLink', {
    id: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        defaultValue: () => require('crypto').randomUUID()
    },
    user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'The user who added the family member'
    },
    family_member_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: ' The family member user account'
    },
    relation: {
        type: DataTypes.STRING, // e.g., 'Mother', 'Son', 'Spouse'
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'active'),
        defaultValue: 'active' // For backward compatibility with existing seeds, but new logic will set 'pending'
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    otp_expires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    access_granted: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the family member has approved access (auto-approve for now)'
    },
    linked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = FamilyLink;
