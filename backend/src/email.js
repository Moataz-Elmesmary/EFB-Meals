const nodemailer = require('nodemailer');
const { GRAPH_ENABLED, graphSendMail } = require('./graph');

// The shared mailbox that sends all automated mail.
const MAIL_FROM = process.env.MAIL_FROM || 'efb.apps@efb.eg';

// Test mode: when MAIL_REDIRECT is set, EVERY email is rerouted to that single
// address, with the original recipient shown in the subject.
const REDIRECT = (process.env.MAIL_REDIRECT || '').trim();

const smtpTransporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

// Routing order: Microsoft Graph (preferred) → SMTP → simulate/log.
async function sendNotification(to, subject, html) {
  const finalTo = REDIRECT || to;
  const finalSubject = REDIRECT ? `[TEST → ${to}] ${subject}` : subject;

  if (GRAPH_ENABLED) {
    return graphSendMail(MAIL_FROM, finalTo, finalSubject, html);
  }
  if (smtpTransporter) {
    return smtpTransporter.sendMail({ from: MAIL_FROM, to: finalTo, subject: finalSubject, html });
  }
  console.log(`[MAIL:simulated] from ${MAIL_FROM} → ${finalTo} | ${finalSubject}`);
  return Promise.resolve({ simulated: true });
}

module.exports = { sendNotification };
