const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middleware/auth');

router.post('/book/opd', auth, appointmentController.bookOpd);
router.get('/my-list', auth, appointmentController.getMyAppointments);

module.exports = router;
