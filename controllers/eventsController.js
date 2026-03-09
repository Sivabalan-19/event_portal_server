let events = [];
let nextId = 1;

exports.list = (req, res) => {
  res.json(events);
};

exports.create = (req, res) => {
  const { title, date, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const ev = { id: nextId++, title, date: date || null, description: description || '' };
  events.push(ev);
  res.status(201).json(ev);
};

exports.get = (req, res) => {
  const id = Number(req.params.id);
  const ev = events.find((e) => e.id === id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  res.json(ev);
};

exports.update = (req, res) => {
  const id = Number(req.params.id);
  const ev = events.find((e) => e.id === id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  const { title, date, description } = req.body;
  if (title !== undefined) ev.title = title;
  if (date !== undefined) ev.date = date;
  if (description !== undefined) ev.description = description;
  res.json(ev);
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const removed = events.splice(idx, 1)[0];
  res.json(removed);
};
