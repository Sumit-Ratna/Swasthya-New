const express = require('express');
const router = express.Router();
const hospitalFacilityController = require('../controllers/hospitalFacilityController');

// Public & Citizen Endpoints
router.get('/', (req, res, next) => hospitalFacilityController.getFacilities(req, res, next));
router.get('/bookings/track/:token', (req, res, next) => hospitalFacilityController.trackBooking(req, res, next));
router.post('/book', (req, res, next) => hospitalFacilityController.createBedBooking(req, res, next));
router.get('/:id', (req, res, next) => hospitalFacilityController.getFacilityById(req, res, next));
router.get('/:id/bookings', (req, res, next) => hospitalFacilityController.getFacilityBookings(req, res, next));
router.patch('/bookings/:id/status', (req, res, next) => hospitalFacilityController.updateBookingStatus(req, res, next));

module.exports = router;
