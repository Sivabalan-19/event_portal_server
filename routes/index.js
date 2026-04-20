const express = require('express');
const router = express.Router();

const auth = require('./auth');
const email = require('./email');
const speakers = require('./speakers');
const events = require('./events');
const registrations = require('./registrations');

router.get('/hello', (req, res) => {
	res.json({ message: 'Hello from Event Portal API' });
});

router.use('/auth', auth);
router.use('/email', email);
router.use('/speakers', speakers);
router.use('/events', events);
router.use('/registrations', registrations);

module.exports = router;
