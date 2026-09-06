const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const documentController = require('../controllers/documentController');

// Multer setup for Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', auth, upload.single('report'), documentController.uploadReport);
router.get('/patient/:patient_id', auth, documentController.getDocuments);
router.patch('/:id/share', auth, documentController.updateSharing);
router.post('/:id/analyze', auth, documentController.analyzeDocument);
router.delete('/:id', auth, documentController.deleteDocument);

module.exports = router;
