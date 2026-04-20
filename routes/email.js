const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const emailController = require('../controllers/email');

router.post('/test', auth, emailController.sendTest);

module.exports = router;
