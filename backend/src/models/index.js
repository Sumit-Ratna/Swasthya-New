const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const User = require('./User');
const FamilyLink = require('./FamilyLink');
const DoctorPatientLink = require('./DoctorPatientLink');
const Document = require('./Document');
const Appointment = require('./Appointment');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');

// Associations
// Doctor-Patient Link
User.hasMany(DoctorPatientLink, { foreignKey: 'doctor_id', as: 'patientsLinked' });
User.hasMany(DoctorPatientLink, { foreignKey: 'patient_id', as: 'doctorsLinked' });
DoctorPatientLink.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
DoctorPatientLink.belongsTo(User, { foreignKey: 'patient_id', as: 'patient' });

// Family Connections
User.hasMany(FamilyLink, { foreignKey: 'user_id', as: 'myFamily' });
FamilyLink.belongsTo(User, { foreignKey: 'family_member_id', as: 'member' });
FamilyLink.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// Documents
User.hasMany(Document, { foreignKey: 'patient_id', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'patient_id', as: 'patient' });

// Appointments
User.hasMany(Appointment, { foreignKey: 'patient_id', as: 'myAppointments' });
User.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'doctorAppointments' });
Appointment.belongsTo(User, { foreignKey: 'patient_id', as: 'patient' });
Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

const db = {
    User,
    DoctorPatientLink,
    Document,
    Appointment,
    AuditLog,
    FamilyLink,
    Notification,
    sequelize,
    Sequelize
};

module.exports = db;
