const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { requirePatientAccess } = require('../middleware/authorize');
const documentController = require('../controllers/documentController');

// Multer setup for Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/upload', auth, upload.single('report'), documentController.uploadReport);
router.get('/patient/:patient_id', auth, requirePatientAccess, documentController.getDocuments);
router.patch('/:id/share', auth, documentController.updateSharing);
router.post('/:id/analyze', auth, documentController.analyzeDocument);
router.delete('/:id', auth, documentController.deleteDocument);

module.exports = router;
