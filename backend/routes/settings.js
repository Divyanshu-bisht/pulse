const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendEmail } = require('../services/mailer');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const user = await User.findById(req.userId).select('name email notifyEmail');
  res.json(user);
});

router.patch('/', async (req, res) => {
  const { notifyEmail } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { notifyEmail } },
    { new: true }
  ).select('name email notifyEmail');
  res.json(user);
});

// Sends a real test email right now, independent of any alert rule --
// isolates whether the problem is SMTP config vs. the alert-firing logic.
router.post('/test-email', async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user?.notifyEmail) {
    return res.status(400).json({ error: 'No notification email saved yet -- save one first.' });
  }
  const result = await sendEmail({
    to: user.notifyEmail,
    subject: 'Pulse test email',
    text: 'This is a test email from Pulse. If you received this, your SMTP setup is working correctly.',
  });
  res.json(result);
});

module.exports = router;
