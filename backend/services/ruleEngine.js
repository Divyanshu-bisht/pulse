const Rule = require('../models/Rule');
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { sendEmail } = require('./mailer');

async function sendWebhookWithRetry(url, payload, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { sent: true };
      throw new Error(`Webhook responded with status ${res.status}`);
    } catch (err) {
      const isLastAttempt = i === attempts - 1;
      if (isLastAttempt) {
        console.error(`[webhook] Failed after ${attempts} attempts:`, err.message);
        return { sent: false, reason: err.message };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}

// Checks a newly-saved event against every active rule for that source+metric.
// No cooldown here on purpose -- every single crossing fires its own alert,
// and the frontend groups/counts them into "sessions" for display instead of
// the backend silently throttling them.
async function evaluateEvent(event, io) {
  const rules = await Rule.find({
    sourceId: event.sourceId,
    metricName: event.name,
    active: true,
  });

  const newAlerts = [];

  for (const rule of rules) {
    // A rule that's been acknowledged stays fully paused -- no new alerts,
    // no new emails -- until its card is reset/deleted on the Alerts page.
    if (rule.alertsPaused) continue;

    let triggered = false;
    let message = '';

    if (rule.condition === 'gt' && typeof event.value === 'number') {
      if (event.value > rule.threshold) {
        triggered = true;
        message = `${event.name} (${event.value}) went above ${rule.threshold}`;
      }
    } else if (rule.condition === 'lt' && typeof event.value === 'number') {
      if (event.value < rule.threshold) {
        triggered = true;
        message = `${event.name} (${event.value}) dropped below ${rule.threshold}`;
      }
    } else if (rule.condition === 'count_gt') {
      const windowStart = new Date(Date.now() - rule.windowMinutes * 60 * 1000);
      const count = await Event.countDocuments({
        sourceId: event.sourceId,
        name: event.name,
        timestamp: { $gte: windowStart },
      });
      if (count > rule.threshold) {
        triggered = true;
        message = `${event.name} occurred ${count} times in the last ${rule.windowMinutes} min (limit ${rule.threshold})`;
      }
    }

    if (triggered) {
      // Is this the first alert in the current session (i.e. the card is
      // just starting)? If so, we email. Every later trigger within the
      // same session still counts toward the card's counter, but doesn't
      // send another email -- exactly one email per card, on its start.
      const existingInSession = await Alert.countDocuments({
        ruleId: rule._id,
        sessionId: rule.currentAlertSession,
      });
      const isFirstInSession = existingInSession === 0;

      const alert = await Alert.create({
        userId: rule.userId,
        ruleId: rule._id,
        sourceId: rule.sourceId,
        message,
        sessionId: rule.currentAlertSession,
      });
      newAlerts.push(alert);

      if (io) {
        io.to(`user:${rule.userId}`).emit('new_alert', alert);
      }

      if (isFirstInSession) {
        const user = await User.findById(rule.userId);
        if (user?.notifyEmail) {
          console.log(`[mailer] Attempting to email alert to ${user.notifyEmail}...`);
          const result = await sendEmail({
            to: user.notifyEmail,
            subject: `Pulse alert: ${rule.name}`,
            text: message,
          });
          console.log(`[mailer] Result:`, result);
        } else {
          console.log('[mailer] No notifyEmail set for this user -- skipping email. Set one on the Settings page.');
        }

        if (rule.webhookUrl) {
          await sendWebhookWithRetry(rule.webhookUrl, {
            rule: rule.name,
            message,
            triggeredAt: alert.triggeredAt,
          });
        }
      }

      console.log(`[ALERT] user:${rule.userId} -> ${message}${isFirstInSession ? ' (new card)' : ' (counted, no new email)'}`);
    }
  }

  return newAlerts;
}

module.exports = { evaluateEvent };
