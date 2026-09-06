const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/safety-check', aiController.checkSafety);
router.post('/scribe', aiController.scribe);
router.post('/explainer', aiController.generateExplainer);
router.post('/analyze-text', aiController.analyzeText);

module.exports = router;
