/**
 * Referral Request Payload Validators
 */
function validateCreateReferral(req, res, next) {
    const { patient_id, primary_complaint } = req.body;

    if (!patient_id) {
        return res.status(400).json({
            success: false,
            error: "patient_id is required",
            code: "VALIDATION_ERROR"
        });
    }

    if (!primary_complaint || String(primary_complaint).trim() === '') {
        return res.status(400).json({
            success: false,
            error: "primary_complaint is required",
            code: "VALIDATION_ERROR"
        });
    }

    next();
}

function validateTransition(req, res, next) {
    const { to_status } = req.body;

    if (!to_status) {
        return res.status(400).json({
            success: false,
            error: "to_status is required for state transition",
            code: "VALIDATION_ERROR"
        });
    }

    next();
}

module.exports = {
    validateCreateReferral,
    validateTransition
};
