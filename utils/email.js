const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort || 587),
    secure: config.smtpSecure,
    auth: config.smtpUser
      ? {
          user: config.smtpUser,
          pass: config.smtpPass,
        }
      : undefined,
  });

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!config.smtpHost) {
    throw new Error('SMTP is not configured');
  }

  const from = config.smtpFrom || config.smtpUser;
  if (!from) {
    throw new Error('SMTP from address is missing');
  }

  return getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendEmail,
};
