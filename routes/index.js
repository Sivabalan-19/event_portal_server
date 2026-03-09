const express = require('express');
const router = express.Router();

const health = require('./health');
const events = require('./events');

router.use('/health', health);
router.use('/events', events);

module.exports = router;
