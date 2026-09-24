const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Source', required: true, index: true },
  eventType: { type: String, enum: ['metric', 'event'], default: 'metric' },
  name: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Event', eventSchema);
