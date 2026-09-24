const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Source = require('../models/Source');
const Event = require('../models/Event');
const Rule = require('../models/Rule');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const sources = await Source.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(sources);
});

router.post('/', async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ error: 'Source name is required' });
  const source = await Source.create({ userId: req.userId, name, type: type || 'agent' });
  res.status(201).json(source);
});

router.get('/:id', async (req, res) => {
  const source = await Source.findOne({ _id: req.params.id, userId: req.userId });
  if (!source) return res.status(404).json({ error: 'Source not found' });
  res.json(source);
});

// If a sourceKey ever leaks (e.g. accidentally committed to a public repo),
// this lets you invalidate the old one and issue a fresh one without having
// to delete and recreate the whole source (which would also lose its history).
router.post('/:id/rotate-key', async (req, res) => {
  const source = await Source.findOne({ _id: req.params.id, userId: req.userId });
  if (!source) return res.status(404).json({ error: 'Source not found' });

  source.sourceKey = uuidv4();
  await source.save();
  res.json(source);
});

router.delete('/:id', async (req, res) => {
  const source = await Source.findOne({ _id: req.params.id, userId: req.userId });
  if (!source) return res.status(404).json({ error: 'Source not found' });

  await Promise.all([
    Event.deleteMany({ sourceId: source._id, userId: req.userId }),
    Rule.deleteMany({ sourceId: source._id, userId: req.userId }),
    Alert.deleteMany({ sourceId: source._id, userId: req.userId }),
    Source.deleteOne({ _id: source._id, userId: req.userId }),
  ]);

  res.json({ success: true });
});

module.exports = router;
