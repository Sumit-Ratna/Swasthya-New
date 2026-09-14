const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middleware/auth');

router.post('/book', auth, appointmentController.bookAppointment);
router.post('/book/opd', auth, appointmentController.bookOpd);
router.post('/sync-batch', auth, appointmentController.syncBatchAppointments);
router.post('/:id/reschedule', auth, appointmentController.rescheduleAppointment);
router.post('/:id/cancel', auth, appointmentController.cancelAppointment);
router.post('/:id/missed', auth, appointmentController.markMissedAppointment);
router.get('/my-list', auth, appointmentController.getMyAppointments);
router.get('/asha/list', auth, appointmentController.getAshaAppointments);

module.exports = router;
