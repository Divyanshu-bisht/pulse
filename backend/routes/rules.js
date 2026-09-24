const express = require('express');
const Rule = require('../models/Rule');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const rules = await Rule.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(rules);
});

router.post('/', async (req, res) => {
  const { sourceId, name, metricName, condition, threshold, windowMinutes } = req.body;
  if (!sourceId || !name || !metricName || !condition || threshold === undefined) {
    return res.status(400).json({ error: 'Missing required rule fields' });
  }
  const rule = await Rule.create({
    userId: req.userId, sourceId, name, metricName, condition, threshold, windowMinutes,
  });
  res.status(201).json(rule);
});

router.patch('/:id', async (req, res) => {
  const updates = { ...req.body };

  // Re-enabling a rule (active: false -> true) should give it a clean slate --
  // without this, a rule that already fired once stays stuck in its old
  // cooldown window even after being toggled off and back on, silently
  // blocking it from alerting again for up to cooldownMinutes.
  if (updates.active === true) {
    updates.lastTriggeredAt = null;
  }

  const rule = await Rule.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: updates },
    { new: true }
  );
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
});

router.delete('/:id', async (req, res) => {
  await Rule.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

module.exports = router;
