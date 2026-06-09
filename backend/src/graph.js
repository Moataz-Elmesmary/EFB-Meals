// Microsoft Graph mail (app-only / client-credentials) — sends automated email
// as a shared mailbox (efb.apps@efb.eg). Mirrors the EFB Fleet approach.
// Requires Azure app permission: Mail.Send (Application) + admin consent,
// and a client secret (AZURE_CLIENT_SECRET).
const fetch = require('node-fetch');

const TENANT = process.env.AZURE_TENANT_ID || '';
const CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

const GRAPH_ENABLED = !!(TENANT && CLIENT_ID && CLIENT_SECRET);

let cachedToken = null;
let tokenExpiry = 0;
let inflight = null;

async function fetchToken() {
  const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default'
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  if (!res.ok) throw new Error(`Token acquisition failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function getAppToken() {
  if (!GRAPH_ENABLED) throw new Error('Graph not configured');
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  if (inflight) return inflight;
  inflight = fetchToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

// Send HTML mail as `from` (the shared mailbox). `to` may be a string or array.
// attachments: [{ name, contentType, content (Buffer|base64) }]
async function graphSendMail(from, to, subject, html, attachments) {
  const token = await getAppToken();
  const toRecipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((addr) => ({ emailAddress: { address: addr } }));
  if (!toRecipients.length) throw new Error('No recipients');

  const message = { subject, body: { contentType: 'HTML', content: html }, toRecipients };
  if (attachments && attachments.length) {
    message.attachments = attachments.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.contentType || 'application/octet-stream',
      contentBytes: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content
    }));
  }
  const body = { message, saveToSentItems: true };

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Graph sendMail ${res.status}: ${await res.text()}`);
  return { sent: true };
}

// Fetch an employee profile from Active Directory via Graph (app-only).
// Requires the User.Read.All Application permission + admin consent.
async function graphGetUser(email) {
  const token = await getAppToken();
  const select = 'displayName,mail,userPrincipalName,department,jobTitle,mobilePhone,businessPhones';
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=${select}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Graph getUser ${res.status}: ${await res.text()}`);
  const g = await res.json();
  return {
    name: g.displayName || null,
    email: g.mail || g.userPrincipalName || email,
    department: g.department || '',
    jobTitle: g.jobTitle || '',
    phone: g.mobilePhone || (g.businessPhones && g.businessPhones[0]) || ''
  };
}

module.exports = { GRAPH_ENABLED, graphSendMail, graphGetUser };
