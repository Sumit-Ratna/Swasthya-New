const { requireRole, requirePatientOrCaregiver } = require('./rbac');

/**
 * Authorize middleware aliases and role helpers
 */
module.exports = {
    requireRole,
    requirePatientOrCaregiver,
    authorize: requireRole
};
