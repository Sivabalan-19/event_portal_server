const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

function parseEventDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

async function createOrRestoreRegistration({
  existingRegistration,
  studentId,
  eventId,
  status,
  waitlistPosition,
}) {
  if (existingRegistration) {
    existingRegistration.status = status;
    existingRegistration.waitlistPosition = waitlistPosition;
    await existingRegistration.save();
    return existingRegistration;
  }

  const registration = new Registration({
    student: studentId,
    event: eventId,
    status,
    waitlistPosition,
  });

  await registration.save();
  return registration;
}

exports.create = async (req, res, next) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ error: 'only students can register for events' });
    }

    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'event id is required' });
    }

    const event = await Event.findOne({
      _id: eventId,
      status: 'Approved',
    });

    if (!event) {
      return res.status(404).json({ error: 'event not found' });
    }

    const eventDate = parseEventDate(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate && eventDate < today) {
      return res.status(400).json({ error: 'registration is closed for this event' });
    }

    const now = new Date();
    if (event.registrationOpenAt && now < event.registrationOpenAt) {
      return res.status(400).json({ error: 'registration has not opened yet' });
    }

    if (event.registrationCloseAt && now > event.registrationCloseAt) {
      return res.status(400).json({ error: 'registration is closed for this event' });
    }

    const existingRegistration = await Registration.findOne({
      student: req.user.id,
      event: event._id,
    });

    if (existingRegistration && existingRegistration.status !== 'cancelled') {
      return res.status(400).json({ error: 'you are already registered for this event' });
    }

    const activeRegistrations = await Registration.countDocuments({
      event: event._id,
      status: { $in: ['registered', 'attended'] },
    });

    const isFull = Boolean(event.maxAttendees) && activeRegistrations >= event.maxAttendees;
    let status = 'registered';
    let waitlistPosition;

    if (isFull) {
      const waitlistCount = await Registration.countDocuments({
        event: event._id,
        status: 'waitlisted',
      });

      status = 'waitlisted';
      waitlistPosition = waitlistCount + 1;
    }

    const wasCancelled = existingRegistration?.status === 'cancelled';

    const registration = await createOrRestoreRegistration({
      existingRegistration,
      studentId: req.user.id,
      eventId: event._id,
      status,
      waitlistPosition,
    });

    await registration.populate({
      path: 'event',
      populate: {
        path: 'speakers',
        select: 'name',
      },
    });

    const shouldSendConfirmation = !existingRegistration || wasCancelled;

    if (shouldSendConfirmation && !registration.confirmationSentAt) {
      try {
        const student = await User.findById(req.user.id).select('name email');

        if (student?.email) {
          const subject =
            status === 'waitlisted'
              ? `Waitlist confirmation: ${event.title}`
              : `Registration confirmation: ${event.title}`;
          const dateLabel = event.date || 'TBA';
          const timeLabel = event.time || 'TBA';
          const venueLabel = event.venue || 'TBA';
          const modeLabel = event.mode || 'TBA';
          const statusLabel = status === 'waitlisted' ? 'waitlisted' : 'registered';

          const text =
            `Hi ${student.name || 'Student'},\n\n` +
            `You are ${statusLabel} for: ${event.title}\n\n` +
            `Event details\n` +
            `- Date: ${dateLabel}\n` +
            `- Time: ${timeLabel}\n` +
            `- Venue: ${venueLabel}\n` +
            `- Mode: ${modeLabel}\n\n` +
            `We look forward to seeing you there.\n` +
            `If you have questions, please contact the organizer.\n`;

          const html = `
            <div style="font-family: 'Trebuchet MS', Arial, sans-serif; background: #f5f7ff; padding: 24px;">
              <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px rgba(20, 24, 82, 0.18);">
                <div style="background: linear-gradient(135deg, #ff6a00, #ee0979); padding: 20px 24px; color: #fff;">
                  <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85;">Event Portal</div>
                  <div style="font-size: 22px; font-weight: 700; margin-top: 6px;">Registration Confirmed</div>
                </div>
                <div style="padding: 24px; color: #111; line-height: 1.6;">
                  <p style="margin: 0 0 12px;">Hi ${student.name || 'Student'},</p>
                  <p style="margin: 0 0 16px;">You are <strong style="color: #ee0979;">${statusLabel}</strong> for:</p>
                  <h2 style="margin: 0 0 12px; font-size: 20px;">${event.title}</h2>
                  <div style="background: #fff6f0; border: 1px solid #ffd7c2; border-radius: 12px; padding: 12px 16px;">
                    <table style="border-collapse: collapse; width: 100%;">
                      <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #d04a00;">Date</td><td>${dateLabel}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #d04a00;">Time</td><td>${timeLabel}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #d04a00;">Venue</td><td>${venueLabel}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; font-weight: 700; color: #d04a00;">Mode</td><td>${modeLabel}</td></tr>
                    </table>
                  </div>
                  <p style="margin: 16px 0 0;">We look forward to seeing you there.</p>
                  <p style="margin: 4px 0 0; color: #555;">If you have questions, please contact the organizer.</p>
                </div>
              </div>
            </div>
          `;

          await sendEmail({
            to: student.email,
            subject,
            text,
            html,
          });

          registration.confirmationSentAt = new Date();
          await registration.save();
        }
      } catch (err) {
        console.error('Failed to send confirmation email', err);
      }
    }

    return res.status(existingRegistration ? 200 : 201).json({
      message:
        status === 'waitlisted'
          ? 'event is full, you were added to the waitlist'
          : 'registered successfully',
      registration: {
        _id: registration._id,
        status: registration.status,
        waitlistPosition: registration.waitlistPosition,
        createdAt: registration.createdAt,
        event: registration.event,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    const registrations = await Registration.find({
      student: req.user?.id,
      status: { $ne: 'cancelled' },
    })
      .populate({
        path: 'event',
        populate: {
          path: 'speakers',
          select: 'name',
        },
      })
      .sort({ createdAt: -1 });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const normalizedRegistrations = registrations
      .filter((registration) => Boolean(registration.event))
      .map((registration) => {
        const parsedDate = parseEventDate(registration.event.date);
        const tab =
          registration.status === 'waitlisted'
            ? 'waitlisted'
            : parsedDate && parsedDate < now
              ? 'past'
              : 'upcoming';

        return {
          _id: registration._id,
          status: registration.status,
          waitlistPosition: registration.waitlistPosition,
          createdAt: registration.createdAt,
          feedback: registration.feedback,
          tab,
          event: registration.event,
        };
      });

    res.json({ registrations: normalizedRegistrations });
  } catch (err) {
    next(err);
  }
};

exports.getForOwnedEvent = async (req, res, next) => {
  try {
    if (req.user?.role !== 'organizer') {
      return res.status(403).json({ error: 'only organizers can view event registrations' });
    }

    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ error: 'event id is required' });
    }

    const event = await Event.findOne({
      _id: eventId,
      createdBy: req.user.id,
    }).select('_id title');

    if (!event) {
      return res.status(404).json({ error: 'event not found' });
    }

    const registrations = await Registration.find({
      event: eventId,
      status: { $ne: 'cancelled' },
    })
      .populate('student', 'name email department year rollNo')
      .sort({ createdAt: -1 })
      .lean();

    const normalizedRegistrations = registrations
      .filter((registration) => Boolean(registration.student))
      .map((registration) => ({
        _id: registration._id,
        status: registration.status,
        waitlistPosition: registration.waitlistPosition,
        registeredAt: registration.createdAt,
        feedback: registration.feedback,
        student: {
          _id: registration.student._id,
          name: registration.student.name,
          email: registration.student.email,
          department: registration.student.department,
          year: registration.student.year,
          rollNo: registration.student.rollNo,
        },
      }));

    res.json({ registrations: normalizedRegistrations });
  } catch (err) {
    next(err);
  }
};

exports.updateOwnedEventRegistrationStatus = async (req, res, next) => {
  try {
    if (req.user?.role !== 'organizer') {
      return res.status(403).json({ error: 'only organizers can update attendance' });
    }

    const { registrationId } = req.params;
    const { status } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registration id is required' });
    }

    if (!['registered', 'attended'].includes(status)) {
      return res.status(400).json({ error: 'invalid registration status' });
    }

    const registration = await Registration.findById(registrationId)
      .populate('event', 'createdBy')
      .populate('student', 'name email department year rollNo');

    if (!registration || !registration.event) {
      return res.status(404).json({ error: 'registration not found' });
    }

    if (String(registration.event.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ error: 'you can only update attendance for your own events' });
    }

    // Prevent updating attendance after the event date has passed
    const eventDate = parseEventDate(registration.event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate && eventDate < today) {
      return res.status(400).json({ error: 'attendance can no longer be updated after the event date' });
    }

    if (registration.status === 'waitlisted' || registration.status === 'cancelled') {
      return res.status(400).json({ error: 'attendance can only be updated for confirmed registrations' });
    }

    registration.status = status;
    await registration.save();

    res.json({
      message:
        status === 'attended'
          ? 'student marked as attended'
          : 'attendance status reset to registered',
      registration: {
        _id: registration._id,
        status: registration.status,
        waitlistPosition: registration.waitlistPosition,
        registeredAt: registration.createdAt,
        feedback: registration.feedback,
        student: {
          _id: registration.student?._id,
          name: registration.student?.name,
          email: registration.student?.email,
          department: registration.student?.department,
          year: registration.student?.year,
          rollNo: registration.student?.rollNo,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.submitFeedback = async (req, res, next) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ error: 'only students can submit feedback' });
    }

    const { registrationId } = req.params;
    const { rating, comment } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registration id is required' });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const normalizedComment = typeof comment === 'string' ? comment.trim() : '';

    const registration = await Registration.findById(registrationId).populate('event', 'date');

    if (!registration || !registration.event) {
      return res.status(404).json({ error: 'registration not found' });
    }

    if (String(registration.student) !== String(req.user.id)) {
      return res.status(403).json({ error: 'you can only submit feedback for your registrations' });
    }

    if (registration.status === 'waitlisted' || registration.status === 'cancelled') {
      return res.status(400).json({ error: 'feedback is not allowed for this registration status' });
    }

    const eventDate = parseEventDate(registration.event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCompleted = registration.status === 'attended' || (eventDate && eventDate < today);

    if (!isCompleted) {
      return res.status(400).json({ error: 'feedback can be submitted after event completion only' });
    }

    registration.feedback = {
      rating: numericRating,
      comment: normalizedComment,
      submittedAt: new Date(),
    };

    await registration.save();

    res.json({
      message: 'feedback submitted successfully',
      feedback: registration.feedback,
      registrationId: registration._id,
    });
  } catch (err) {
    next(err);
  }
};
