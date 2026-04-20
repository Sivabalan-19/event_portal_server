const User = require('../models/User');
const { sendEmail } = require('../utils/email');

exports.sendTest = async (req, res, next) => {
  try {
    const { to } = req.body;

    let recipient = to;
    if (!recipient) {
      const user = await User.findById(req.user?.id).select('email name');
      recipient = user?.email;
    }

    if (!recipient) {
      return res.status(400).json({ error: 'recipient email is required' });
    }

    const subject = 'Event Portal test email';
    const text = 'This is a test email from Event Portal.';

    await sendEmail({
      to: recipient,
      subject,
      text,
    });

    res.json({ message: 'test email sent', to: recipient });
  } catch (err) {
    next(err);
  }
};
