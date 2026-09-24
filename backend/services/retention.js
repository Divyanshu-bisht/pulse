const cron = require('node-cron');
const Event = require('../models/Event');

// Nightly cleanup: without this, the events collection grows forever and
// eventually slows down every query and inflates storage costs. This deletes
// raw events older than RETENTION_DAYS (default 30), keeping the DB lean.
function startRetentionJob() {
  const retentionDays = Number(process.env.RETENTION_DAYS || 30);

  // Runs every day at 3:00 AM server time.
  cron.schedule('0 3 * * *', async () => {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    try {
      const result = await Event.deleteMany({ timestamp: { $lt: cutoff } });
      console.log(`[retention] Deleted ${result.deletedCount} events older than ${retentionDays} days`);
    } catch (err) {
      console.error('[retention] Cleanup failed:', err.message);
    }
  });

  console.log(`[retention] Scheduled nightly cleanup (keeping last ${retentionDays} days)`);
}

module.exports = { startRetentionJob };
