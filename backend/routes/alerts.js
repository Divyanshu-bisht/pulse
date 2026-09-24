const express = require('express');
const Alert = require('../models/Alert');
const Rule = require('../models/Rule');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const alerts = await Alert.find({ userId: req.userId }).sort({ triggeredAt: -1 }).limit(200);
  res.json(alerts);
});

router.patch('/:id/acknowledge', async (req, res) => {
  const alert = await Alert.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { acknowledged: true },
    { new: true }
  );
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json(alert);
});

router.delete('/:id', async (req, res) => {
  await Alert.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

// Clears every stored alert for one rule entirely (used by the "reset"
// action on the grouped alert card), un-pauses it, and starts a brand new
// session -- so if the condition is still true (or crosses again later), a
// fresh card appears with its own counter and sends one new email on its
// first fire, exactly like a brand new alert.
router.delete('/rule/:ruleId', async (req, res) => {
  await Alert.deleteMany({ ruleId: req.params.ruleId, userId: req.userId });
  await Rule.findOneAndUpdate(
    { _id: req.params.ruleId, userId: req.userId },
    { $set: { alertsPaused: false }, $inc: { currentAlertSession: 1 } }
  );
  res.json({ success: true });
});

// Acknowledging marks the current card's alerts as acknowledged (with a
// timestamp) and PAUSES this rule entirely -- no new alerts, no new emails --
// until the card is reset/deleted. This is the actual meaning of
// "acknowledge": you've seen it, so stop bothering me about it until I clear it.
router.patch('/rule/:ruleId/acknowledge', async (req, res) => {
  const now = new Date();
  await Alert.updateMany(
    { ruleId: req.params.ruleId, userId: req.userId, acknowledged: false },
    { $set: { acknowledged: true, acknowledgedAt: now } }
  );
  await Rule.findOneAndUpdate(
    { _id: req.params.ruleId, userId: req.userId },
    { $set: { alertsPaused: true } }
  );
  res.json({ success: true });
});

// Clear every alert for this user in one action (e.g. "clear all" on the Alerts page).
router.delete('/', async (req, res) => {
  const result = await Alert.deleteMany({ userId: req.userId });
  res.json({ success: true, deletedCount: result.deletedCount });
});

module.exports = router;
