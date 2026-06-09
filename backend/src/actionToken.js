// Signed, expiring tokens for one-click email actions (approve/reject budget
// from Outlook). HMAC over "requestId.decision.expiry" — no DB needed.
const crypto = require('crypto');

const SECRET = process.env.ACTION_SECRET || process.env.AZURE_CLIENT_SECRET || 'efb-meals-dev-secret';
const TTL_MS = 72 * 60 * 60 * 1000; // 72h, like the Fleet

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

// decision: 'approve' | 'reject'
function makeToken(requestId, decision, now) {
  const exp = (now || Date.now()) + TTL_MS;
  const payload = `${requestId}.${decision}.${exp}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

function verifyToken(token, now) {
  try {
    const [b64, sig] = String(token).split('.');
    const payload = Buffer.from(b64, 'base64url').toString();
    if (sign(payload) !== sig) return null;
    const [requestId, decision, exp] = payload.split('.');
    if ((now || Date.now()) > Number(exp)) return null;
    return { requestId: parseInt(requestId, 10), decision };
  } catch (_) {
    return null;
  }
}

module.exports = { makeToken, verifyToken };
