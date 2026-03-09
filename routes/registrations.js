const express = require('express');

const router = express.Router();
const auth = require('../middleware/auth');
const registrationController = require('../controllers/registration');

router.post('/', auth, registrationController.create);
router.get('/event/:eventId', auth, registrationController.getForOwnedEvent);
router.patch('/:registrationId/status', auth, registrationController.updateOwnedEventRegistrationStatus);
router.get('/mine', auth, registrationController.getMine);

module.exports = router;
