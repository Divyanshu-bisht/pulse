const nodemailer = require('nodemailer');

// If SMTP isn't configured, we fall back to logging -- this keeps the app
// fully working out of the box (matches how alerts already behaved before),
// and upgrades to real email the moment someone fills in SMTP_* in .env.
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmail({ to, subject, text }) {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured -- would have sent to ${to}: "${subject}" -- ${text}`);
    return { sent: false, reason: 'SMTP not configured' };
  }
  try {
    await transporter.sendMail({
      from: process.env.ALERT_FROM_EMAIL || 'alerts@pulse.local',
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendEmail };
