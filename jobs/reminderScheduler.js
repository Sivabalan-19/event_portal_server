const cron = require('node-cron');
const Registration = require('../models/Registration');
const { sendEmail } = require('../utils/email');

function parseEventStartAt(event) {
  if (!event?.date) {
    return null;
  }

  const parsedDate = new Date(event.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (event.time) {
    const match = String(event.time).trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      parsedDate.setHours(hours, minutes, 0, 0);
    }
  }

  return parsedDate;
}

function isInReminderWindow(startAt, now) {
  const windowStart = new Date(now.getTime() + 20 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + 60 * 1000);
  return startAt >= windowStart && startAt < windowEnd;
}

async function processReminderQueue() {
  const now = new Date();

  const registrations = await Registration.find({
    status: 'registered',
    $or: [{ reminderSentAt: { $exists: false } }, { reminderSentAt: null }],
  })
    .populate('event')
    .populate('student', 'name email')
    .lean();

  for (const registration of registrations) {
    const event = registration.event;
    const student = registration.student;

    if (!event || !student?.email || event.status !== 'Approved') {
      continue;
    }

    const startAt = parseEventStartAt(event);
    if (!startAt || startAt <= now) {
      continue;
    }

    if (!isInReminderWindow(startAt, now)) {
      continue;
    }

    const subject = `Reminder: ${event.title} starts in 20 minutes`;
    const dateLabel = event.date || 'TBA';
    const timeLabel = event.time || 'TBA';
    const venueLabel = event.venue || 'TBA';
    const modeLabel = event.mode || 'TBA';
    const text =
      `Hi ${student.name || 'Student'},\n\n` +
      `Your event starts in 20 minutes: ${event.title}\n\n` +
      `Event details\n` +
      `- Date: ${dateLabel}\n` +
      `- Time: ${timeLabel}\n` +
      `- Venue: ${venueLabel}\n` +
      `- Mode: ${modeLabel}\n\n` +
      `Please be ready a few minutes early.\n` +
      `See you there!\n`;

    const html = `
      <div style="font-family: 'Trebuchet MS', Arial, sans-serif; background: #f3fbff; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 51, 102, 0.18);">
          <div style="background: linear-gradient(135deg, #00b4db, #0083b0); padding: 20px 24px; color: #fff;">
            <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85;">Event Portal</div>
            <div style="font-size: 22px; font-weight: 700; margin-top: 6px;">Starts In 20 Minutes</div>
          </div>
          <div style="padding: 24px; color: #111; line-height: 1.6;">
            <p style="margin: 0 0 12px;">Hi ${student.name || 'Student'},</p>
            <p style="margin: 0 0 16px;">Your event starts in <strong style="color: #0083b0;">20 minutes</strong>.</p>
            <h2 style="margin: 0 0 12px; font-size: 20px;">${event.title}</h2>
            <div style="background: #eefaff; border: 1px solid #cdeeff; border-radius: 12px; padding: 12px 16px;">
              <table style="border-collapse: collapse; width: 100%;">
                <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #006088;">Date</td><td>${dateLabel}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #006088;">Time</td><td>${timeLabel}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #006088;">Venue</td><td>${venueLabel}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #006088;">Mode</td><td>${modeLabel}</td></tr>
              </table>
            </div>
            <p style="margin: 16px 0 0;">Please be ready a few minutes early.</p>
            <p style="margin: 4px 0 0; color: #555;">See you there!</p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: student.email,
        subject,
        text,
        html,
      });

      await Registration.updateOne(
        { _id: registration._id },
        { $set: { reminderSentAt: new Date() } },
      );
    } catch (err) {
      console.error('Failed to send reminder email', err);
    }
  }
}

function startReminderScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      await processReminderQueue();
    } catch (err) {
      console.error('Reminder scheduler error', err);
    }
  });
}

module.exports = {
  startReminderScheduler,
};
