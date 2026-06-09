const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'you@example.com',
    pass: process.env.SMTP_PASS || 'changeme'
  }
});

// Test mode: when MAIL_REDIRECT is set, EVERY email is rerouted to that single
// address, with the original recipient shown in the subject — so one tester can
// see all notifications without spamming real users.
const REDIRECT = process.env.MAIL_REDIRECT;

function sendNotification(to, subject, html) {
  const finalTo = REDIRECT || to;
  const finalSubject = REDIRECT ? `[TEST → ${to}] ${subject}` : subject;

  const msg = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@efb.eg',
    to: finalTo,
    subject: finalSubject,
    html
  };

  // If SMTP isn't configured, log instead of throwing so the app still works.
  if (!process.env.SMTP_HOST) {
    console.log(`[MAIL:simulated] → ${finalTo} | ${finalSubject}`);
    return Promise.resolve({ simulated: true });
  }
  return transporter.sendMail(msg);
}

module.exports = { sendNotification };
