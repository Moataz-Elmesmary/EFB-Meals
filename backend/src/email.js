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
// attachments: [{ name, contentType, content (Buffer|base64) }]
async function sendNotification(to, subject, html, attachments) {
  const finalTo = REDIRECT || to;
  const finalSubject = REDIRECT ? `[TEST → ${to}] ${subject}` : subject;

  if (GRAPH_ENABLED) {
    return graphSendMail(MAIL_FROM, finalTo, finalSubject, html, attachments);
  }
  if (smtpTransporter) {
    const att = (attachments || []).map((a) => ({
      filename: a.name,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content, 'base64'),
      contentType: a.contentType
    }));
    return smtpTransporter.sendMail({ from: MAIL_FROM, to: finalTo, subject: finalSubject, html, attachments: att });
  }
  console.log(`[MAIL:simulated] from ${MAIL_FROM} → ${finalTo} | ${finalSubject}${attachments && attachments.length ? ` (+${attachments.length} attachment)` : ''}`);
  return Promise.resolve({ simulated: true });
}

module.exports = { sendNotification };
