require('dotenv').config();
const axios = require('axios');
const si = require('systeminformation');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL;
const SOURCE_KEY = process.env.SOURCE_KEY;
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 5000);

if (!SOURCE_KEY) {
  console.error('Missing SOURCE_KEY in .env -- create a source on the dashboard first and paste its key here.');
  process.exit(1);
}

async function sendMetric(name, value, metadata = {}) {
  try {
    await axios.post(BACKEND_URL, {
      sourceKey: SOURCE_KEY,
      eventType: 'metric',
      name,
      value,
      metadata,
    });
  } catch (err) {
    console.error(`Failed to send ${name}:`, err.message);
  }
}

// "Disk usage" here means live disk *activity* (like Task Manager's Disk %),
// not how full the drive is. OS-level activity counters aren't reliably
// readable cross-platform in Node (they depend on machine/locale-specific
// WMI data), so we measure it ourselves: a real timed write + fsync each
// cycle, converted to a percentage of a realistic max HDD speed.
const BENCHMARK_FILE = path.join(os.tmpdir(), 'pulse_disk_benchmark.tmp');
const BENCHMARK_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

// A busier disk makes OUR test write slower (it has to queue behind other
// real disk activity) -- so "activity" is really about how much SLOWER our
// write is compared to the fastest ("idle") speed we've seen so far, not
// about the raw speed itself. We track that fastest-seen speed as a rolling
// baseline and measure the current write's slowdown relative to it.
let fastestSeenKbps = null;

function benchmarkDiskUsagePct() {
  const buffer = Buffer.alloc(BENCHMARK_SIZE_BYTES, 'x');
  const start = process.hrtime.bigint();
  const fd = fs.openSync(BENCHMARK_FILE, 'w');
  fs.writeSync(fd, buffer);
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  const end = process.hrtime.bigint();
  const seconds = Number(end - start) / 1e9;
  try { fs.unlinkSync(BENCHMARK_FILE); } catch (e) { /* ignore cleanup errors */ }

  const kbps = seconds > 0 ? (BENCHMARK_SIZE_BYTES / 1024) / seconds : 0;

  // Recalibrate the "idle" baseline upward whenever we see a faster write --
  // that represents the least-contended condition we've observed so far.
  if (fastestSeenKbps === null || kbps > fastestSeenKbps) {
    fastestSeenKbps = kbps;
    return 0; // this cycle IS our new fastest/idle baseline, so activity is ~0
  }

  const slowdownRatio = 1 - (kbps / fastestSeenKbps);
  return Math.max(0, Math.min(100, Math.round(slowdownRatio * 100)));
}

async function collectAndSend() {
  try {
    const [cpu, mem, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.time(),
    ]);

    const cpuLoad = Math.round(cpu.currentLoad * 10) / 10;
    const ramUsedPct = Math.round((mem.active / mem.total) * 1000) / 10;
    const diskUsagePct = benchmarkDiskUsagePct();

    await sendMetric('cpu_usage', cpuLoad);
    await sendMetric('ram_usage', ramUsedPct);
    await sendMetric('disk_usage', diskUsagePct);
    await sendMetric('uptime_seconds', Math.round(time.uptime));

    console.log(`[agent] sent metrics -- cpu:${cpuLoad}% ram:${ramUsedPct}% disk:${diskUsagePct}%`);
  } catch (err) {
    console.error('Metric collection failed:', err.message);
  }
}

console.log(`Pulse agent started. Sending metrics every ${INTERVAL_MS / 1000}s to ${BACKEND_URL}`);
collectAndSend();
setInterval(collectAndSend, INTERVAL_MS);
