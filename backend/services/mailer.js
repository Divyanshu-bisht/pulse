const nodemailer = require('nodemailer');

// Two ways to send email, tried in order:
// 1. Resend's HTTP API (RESEND_API_KEY) -- works over plain HTTPS (port 443),
//    which hosting platforms essentially never block. This is the recommended
//    path once deployed, since many free-tier hosts (Render, Railway, etc.)
//    block or silently hang outbound SMTP ports (587/465) to prevent spam --
//    that showed up as "stuck on Sending..." before switching to this.
// 2. Traditional SMTP (SMTP_HOST/USER/PASS) -- works fine for local dev or
//    hosts that don't block SMTP, kept as a fallback/alternative.
// If neither is configured, we fall back to logging -- same graceful
// degradation as before, so the app keeps working either way.

let smtpTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

async function sendViaResendApi({ to, subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API responded ${res.status}: ${body}`);
  }
  return true;
}

async function sendEmail({ to, subject, text }) {
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResendApi({ to, subject, text });
      return { sent: true, via: 'resend-api' };
    } catch (err) {
      console.error('[mailer] Resend API send failed:', err.message);
      return { sent: false, reason: err.message };
    }
  }

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: process.env.ALERT_FROM_EMAIL || 'alerts@pulse.local',
        to,
        subject,
        text,
      });
      return { sent: true, via: 'smtp' };
    } catch (err) {
      console.error('[mailer] SMTP send failed:', err.message);
      return { sent: false, reason: err.message };
    }
  }

  console.log(`[mailer] No email method configured -- would have sent to ${to}: "${subject}" -- ${text}`);
  return { sent: false, reason: 'No email method configured (set RESEND_API_KEY or SMTP_*)' };
}

module.exports = { sendEmail };
