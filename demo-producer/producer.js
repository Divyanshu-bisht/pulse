// Simulates a small e-commerce backend firing business events.
// This exists to prove the platform is generic -- same pipeline, different domain.
require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL;
const SOURCE_KEY = process.env.SOURCE_KEY;
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 4000);

if (!SOURCE_KEY) {
  console.error('Missing SOURCE_KEY in .env -- create a source on the dashboard first and paste its key here.');
  process.exit(1);
}

const EVENT_POOL = [
  { name: 'order_placed', weight: 6, valueRange: [500, 5000] },
  { name: 'payment_failed', weight: 1, valueRange: [1, 1] },
  { name: 'low_stock', weight: 1, valueRange: [1, 5] },
  { name: 'delivery_delayed', weight: 1, valueRange: [1, 1] },
];

function pickWeighted() {
  const total = EVENT_POOL.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EVENT_POOL) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return EVENT_POOL[0];
}

function randomInRange([min, max]) {
  return Math.round(min + Math.random() * (max - min));
}

async function fireEvent() {
  const picked = pickWeighted();
  const value = randomInRange(picked.valueRange);

  try {
    await axios.post(BACKEND_URL, {
      sourceKey: SOURCE_KEY,
      eventType: 'event',
      name: picked.name,
      value,
      metadata: { simulated: true },
    });
    console.log(`[producer] fired ${picked.name} = ${value}`);
  } catch (err) {
    console.error('Failed to send event:', err.message);
  }
}

console.log(`Pulse demo producer started. Firing events every ${INTERVAL_MS / 1000}s to ${BACKEND_URL}`);
setInterval(fireEvent, INTERVAL_MS);
