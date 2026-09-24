const express = require('express');
const Source = require('../models/Source');
const Event = require('../models/Event');
const auth = require('../middleware/auth');
const { evaluateEvent } = require('../services/ruleEngine');

// Basic input validation for incoming ingest payloads -- without this, a
// malformed or malicious payload (huge strings, wrong types, giant metadata
// blobs) could bloat the database or crash downstream logic.
function validateIngestPayload(body) {
  const { sourceKey, name, value, metadata } = body;
  if (typeof sourceKey !== 'string' || sourceKey.length > 100) {
    return 'sourceKey must be a string under 100 characters';
  }
  if (typeof name !== 'string' || name.length === 0 || name.length > 100) {
    return 'name must be a non-empty string under 100 characters';
  }
  if (value !== undefined) {
    const validValueType = typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
    if (!validValueType) return 'value must be a number, string, or boolean';
  }
  if (metadata !== undefined) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) return 'metadata must be an object';
    if (JSON.stringify(metadata).length > 2000) return 'metadata is too large (max ~2KB)';
  }
  return null;
}

module.exports = function (io) {
  const router = express.Router();

  router.post('/ingest', async (req, res) => {
    try {
      const validationError = validateIngestPayload(req.body);
      if (validationError) return res.status(400).json({ error: validationError });

      const { sourceKey, eventType, name, value, metadata } = req.body;

      const source = await Source.findOne({ sourceKey });
      if (!source) return res.status(404).json({ error: 'Unknown sourceKey' });

      source.lastSeen = new Date();
      await source.save();

      const event = await Event.create({
        userId: source.userId,
        sourceId: source._id,
        eventType: eventType || 'metric',
        name,
        value,
        metadata: metadata || {},
      });

      io.to(`user:${source.userId}`).emit('new_event', event);
      await evaluateEvent(event, io);

      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:sourceId', auth, async (req, res) => {
    const { range } = req.query;
    let since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (range === '1h') since = new Date(Date.now() - 60 * 60 * 1000);
    if (range === '7d') since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const events = await Event.find({
      sourceId: req.params.sourceId,
      userId: req.userId,
      timestamp: { $gte: since },
    }).sort({ timestamp: 1 });

    res.json(events);
  });

  router.get('/:sourceId/metric-names', auth, async (req, res) => {
    const names = await Event.distinct('name', {
      sourceId: req.params.sourceId,
      userId: req.userId,
    });
    res.json(names.sort());
  });

  router.delete('/:sourceId', auth, async (req, res) => {
    const result = await Event.deleteMany({
      sourceId: req.params.sourceId,
      userId: req.userId,
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  });

  return router;
};
