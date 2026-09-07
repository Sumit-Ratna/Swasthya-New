const supabaseService = require('../services/supabaseService');

class HospitalFacilityController {
    // GET /api/hospital-facilities
    async getFacilities(req, res, next) {
        try {
            const { district, status, type } = req.query;
            const facilities = await supabaseService.getAllHospitalFacilities({ district, status, type });
            return res.json({
                success: true,
                count: facilities.length,
                data: facilities
            });
        } catch (err) {
            next(err);
        }
    }

    // GET /api/hospital-facilities/:id
    async getFacilityById(req, res, next) {
        try {
            const { id } = req.params;
            const facility = await supabaseService.getHospitalFacilityById(id);
            if (!facility) {
                return res.status(404).json({ success: false, error: 'Hospital facility not found' });
            }
            return res.json({
                success: true,
                data: facility
            });
        } catch (err) {
            next(err);
        }
    }

    // POST /api/hospital-facilities/book
    async createBedBooking(req, res, next) {
        try {
            const booking = await supabaseService.createHospitalBedBooking(req.body);
            return res.status(201).json({
                success: true,
                message: 'Bed / service reservation successfully created in Supabase',
                data: booking
            });
        } catch (err) {
            next(err);
        }
    }

    // GET /api/hospital-facilities/bookings/track/:token
    async trackBooking(req, res, next) {
        try {
            const { token } = req.params;
            const booking = await supabaseService.getHospitalBookingByToken(token);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: `No hospital booking found with token: ${token}`
                });
            }
            return res.json({
                success: true,
                data: booking
            });
        } catch (err) {
            next(err);
        }
    }

    // GET /api/hospital-facilities/:id/bookings
    async getFacilityBookings(req, res, next) {
        try {
            const { id } = req.params;
            const bookings = await supabaseService.getHospitalBookingsByFacility(id);
            return res.json({
                success: true,
                count: bookings.length,
                data: bookings
            });
        } catch (err) {
            next(err);
        }
    }

    // PATCH /api/hospital-facilities/bookings/:id/status
    async updateBookingStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, updates } = req.body;
            const updated = await supabaseService.updateHospitalBookingStatus(id, status, updates);
            return res.json({
                success: true,
                message: `Booking status updated to ${status}`,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new HospitalFacilityController();
