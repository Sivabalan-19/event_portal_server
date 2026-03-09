const Speaker = require('../models/Speaker');

exports.create = async (req, res, next) => {
  try {
    const {
      name,
      title,
      expertise,
      organization,
      email,
      phone,
      location,
      website,
      bio,
      profileImageName,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const speaker = new Speaker({
      name,
      title,
      expertise,
      organization,
      email,
      phone,
      location,
      website,
      bio,
      profileImageName,
      status: 'pending',
    });

    await speaker.save();

    res.status(201).json({ message: 'speaker created', speaker });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const speakers = await Speaker.find(
      { status: 'accepted' },
      { name: 1 }
    )
      .sort({ name: 1 })
      .lean();
    res.json({ speakers });
  } catch (err) {
    next(err);
  }
};

exports.adminList = async (req, res, next) => {
  try {
    const speakers = await Speaker.find().sort({ createdAt: -1 }).lean();
    res.json({ speakers });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    const speaker = await Speaker.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!speaker) {
      return res.status(404).json({ error: 'speaker not found' });
    }

    res.json({ message: 'status updated', speaker });
  } catch (err) {
    next(err);
  }
};

