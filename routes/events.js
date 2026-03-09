const express = require('express');
const router = express.Router();
const events = require('../controllers/eventsController');
const auth = require('../middleware/auth');

// Public list and get
router.get('/', events.list);
router.get('/:id', events.get);

// Protected create/update/delete
router.post('/', auth, events.create);
router.put('/:id', auth, events.update);
router.delete('/:id', auth, events.remove);

module.exports = router;
