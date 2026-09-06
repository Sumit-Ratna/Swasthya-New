const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');

router.get('/', auth, profileController.getProfile);
router.post('/update', auth, profileController.updateProfile);
router.delete('/delete', auth, profileController.deleteProfile);

module.exports = router;
