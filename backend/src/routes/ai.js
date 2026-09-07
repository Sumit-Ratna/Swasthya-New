const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// AI System Telemetry & Health
router.get('/health', aiController.getHealth);

// AI Triage with Deterministic Floor Clamping
router.post('/triage', aiController.triage);

// Lab Report Summarization with Clinical Disclaimers
router.post('/summarize-report', aiController.summarizeReport);
router.post('/analyze-report', aiController.summarizeReport);
router.post('/analyze-text', aiController.analyzeText);

// Additional Clinical Support Services
router.post('/safety-check', aiController.checkSafety);
router.post('/scribe', aiController.scribe);
router.post('/explainer', aiController.generateExplainer);

// n8n Webhook Online Dispatcher
router.post('/n8n-webhook', aiController.n8nWebhook);

module.exports = router;
