const express = require('express');
const router = express.Router();
const speakerController = require('../controllers/speaker');


router.post('/create', speakerController.create);
router.get('/', speakerController.list);
router.get('/admin', speakerController.adminList);
router.patch('/:id/status', speakerController.updateStatus);

module.exports = router;

