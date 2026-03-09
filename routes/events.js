const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event');
const auth = require('../middleware/auth');

router.get('/admin/summary', auth, eventController.getAdminSummary);
router.get('/admin', auth, eventController.getAdminList);
router.get('/admin/:id', auth, eventController.getAdminById);
router.patch('/admin/:id/status', auth, eventController.updateStatus);
router.get('/active', auth, eventController.getActive);
router.get('/active/:id', auth, eventController.getActiveById);
router.get('/mine', auth, eventController.getMine);
router.get('/:id', auth, eventController.getById);

// All event creation must be authenticated; createdBy is taken from JWT (req.user)
router.post('/create', auth, eventController.create);

module.exports = router;

