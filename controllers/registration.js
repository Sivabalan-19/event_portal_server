const Event = require('../models/Event');
const Registration = require('../models/Registration');

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
