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

function sendNotification(to, subject, html) {
  const msg = {
    from: process.env.SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    html
  };
  return transporter.sendMail(msg);
}

module.exports = { sendNotification };
