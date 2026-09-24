const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule', required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Source', required: true },
  message: { type: String, required: true },
  triggeredAt: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date, default: null },
  sessionId: { type: Number, default: 0 }, // ties this alert to a rule's "currentAlertSession" batch
});

module.exports = mongoose.model('Alert', alertSchema);
