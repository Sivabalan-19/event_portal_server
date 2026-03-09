const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Speaker = require('../models/Speaker');
const User = require('../models/User');

function parseEventDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

async function getRegistrationCountsByEvent(eventIds) {
  if (!eventIds.length) {
    return {};
  }

  const registrationCounts = await Registration.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
      },
    },
  ]);

  return registrationCounts.reduce((accumulator, item) => {
    accumulator[String(item._id)] = item.count;
    return accumulator;
  }, {});
}

function buildDefaultReviewNote(status) {
  if (status === 'Approved') {
    return 'Approved by admin review team.';
  }

  if (status === 'Rejected') {
    return 'Rejected by admin review team.';
  }

  if (status === 'Needs Changes') {
    return 'Changes requested by admin review team.';
  }

  return 'Waiting for admin review.';
}

function decorateEvent(event, registrationCounts) {
  return {
    ...event,
    registrationCount: registrationCounts[String(event._id)] || 0,
  };
}

exports.getAdminSummary = async (req, res, next) => {
  try {
    const [events, totalStudents, totalSpeakers] = await Promise.all([
      Event.find()
        .populate('createdBy', 'name email department')
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments({ role: 'student' }),
      Speaker.countDocuments(),
    ]);

    const registrationCounts = await getRegistrationCountsByEvent(
      events.map((event) => event._id),
    );

    const summary = {
      totalEvents: events.length,
      activeStudents: totalStudents,
      pendingApprovals: events.filter(
        (event) => event.status === 'Pending' || event.status === 'Needs Changes',
      ).length,
      totalSpeakers,
    };

    const recentEvents = events.slice(0, 5).map((event) => ({
      ...event,
      registrationCount: registrationCounts[String(event._id)] || 0,
    }));

    res.json({ summary, recentEvents });
  } catch (err) {
    next(err);
  }
};

exports.getAdminList = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('speakers', 'name')
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    const registrationCounts = await getRegistrationCountsByEvent(
      events.map((event) => event._id),
    );

    res.json({
      events: events.map((event) => decorateEvent(event, registrationCounts)),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('speakers', 'name email expertise organization location')
      .populate('createdBy', 'name email department year')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'event not found' });
    }

    const registrationCounts = await getRegistrationCountsByEvent([event._id]);

    res.json({ event: decorateEvent(event, registrationCounts) });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['Pending', 'Approved', 'Needs Changes', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNote: reviewNote?.trim() || buildDefaultReviewNote(status),
      },
      { new: true },
    )
      .populate('speakers', 'name')
      .populate('createdBy', 'name email department');

    if (!event) {
      return res.status(404).json({ error: 'event not found' });
    }

    res.json({ message: 'event status updated', event });
  } catch (err) {
    next(err);
  }
};

exports.getActive = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await Event.find({ status: 'Approved' })
      .populate('speakers', 'name')
      .sort({ createdAt: -1 });

    const activeEvents = events.filter((event) => {
      const parsedDate = parseEventDate(event.date);

      if (!parsedDate) {
        return true;
      }

      return parsedDate >= today;
    });

    res.json({ events: activeEvents });
  } catch (err) {
    next(err);
  }
};

exports.getActiveById = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const event = await Event.findOne({
      _id: req.params.id,
      status: 'Approved',
    })
      .populate('speakers', 'name email expertise organization location')
      .populate('createdBy', 'name email department year')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'event not found' });
    }

    const parsedDate = parseEventDate(event.date);
    if (parsedDate && parsedDate < today) {
      return res.status(404).json({ error: 'event not found' });
    }

    const registrationCounts = await getRegistrationCountsByEvent([event._id]);

    res.json({ event: decorateEvent(event, registrationCounts) });
  } catch (err) {
    next(err);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    const events = await Event.find({ createdBy: req.user?.id })
      .populate('speakers', 'name')
      .sort({ createdAt: -1 });

    res.json({ events });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      createdBy: req.user?.id,
    }).populate('speakers', 'name email expertise');

    if (!event) {
      return res.status(404).json({ error: 'event not found' });
    }

    res.json({ event });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      title,
      category,
      maxAttendees,
      description,
      date,
      time,
      venue,
      mode,
      speakers,
      coverImageName,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const event = new Event({
      title,
      category,
      maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      description,
      date,
      time,
      venue,
      mode,
      speakers,
      coverImageName,
      reviewNote: buildDefaultReviewNote('Pending'),
      createdBy: req.user?.id || undefined,
    });

    await event.save();

    res.status(201).json({ message: 'event created', event });
  } catch (err) {
    next(err);
  }
};

