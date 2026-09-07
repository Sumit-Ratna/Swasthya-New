const express = require('express');
const router = express.Router();
const ashaController = require('../controllers/ashaController');

router.get('/overview', (req, res) => ashaController.getOverview(req, res));
router.post('/beneficiaries', (req, res) => ashaController.registerBeneficiary(req, res));
router.post('/vitals', (req, res) => ashaController.submitVitals(req, res));

module.exports = router;
