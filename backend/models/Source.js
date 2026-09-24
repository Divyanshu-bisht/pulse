const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sourceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['agent', 'webhook'], default: 'agent' },
  sourceKey: { type: String, required: true, unique: true, default: () => uuidv4() },
  lastSeen: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Source', sourceSchema);
