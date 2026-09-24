const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Source', required: true },
  name: { type: String, required: true },
  metricName: { type: String, required: true },
  condition: { type: String, enum: ['gt', 'lt', 'count_gt'], required: true },
  threshold: { type: Number, required: true },
  windowMinutes: { type: Number, default: 10 },
  active: { type: Boolean, default: true },
  webhookUrl: { type: String, default: null },
  // When true, this rule is fully suppressed -- no new alerts, no new
  // emails -- until the acknowledged alert card is explicitly reset/deleted.
  alertsPaused: { type: Boolean, default: false },
  // "currentAlertSession" groups alerts into counted batches on the frontend --
  // it increments on reset, so the next trigger after that starts a fresh
  // counter (and sends a fresh email) instead of continuing the old one.
  currentAlertSession: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Rule', ruleSchema);
