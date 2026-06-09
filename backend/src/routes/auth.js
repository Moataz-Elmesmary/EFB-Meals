const express = require('express');
const router = express.Router();
const { GRAPH_ENABLED, graphGetUser } = require('../graph');

const clientId = process.env.AZURE_CLIENT_ID;
const tenantId = process.env.AZURE_TENANT_ID;
const azureEnabled = Boolean(clientId && tenantId);

// Frontend reads this on boot to decide real Microsoft SSO vs demo sign-in.
router.get('/config', (req, res) => {
  res.json({ azureEnabled, clientId: clientId || null, tenantId: tenantId || null });
});

function nameFromEmail(email) {
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Enrich a base profile with department/jobTitle/phone from Active Directory.
async function enrich(email, fallbackName) {
  const base = { email, name: fallbackName || nameFromEmail(email || 'user'), department: '', jobTitle: '', phone: '' };
  if (GRAPH_ENABLED && email) {
    try {
      const g = await graphGetUser(email);
      return { ...base, ...g, name: g.name || base.name, email: g.email || base.email };
    } catch (e) {
      console.warn('Graph profile lookup failed:', e.message);
    }
  }
  return base;
}

if (azureEnabled) {
  const auth = require('../auth');
  router.get('/me', auth, async (req, res) => {
    const u = req.user || {};
    const email = u.preferred_username || u.email || u.upn || null;
    res.json(await enrich(email, u.name));
  });
} else {
  router.get('/me', async (req, res) => {
    const email = req.header('X-Demo-Email');
    if (!email) return res.status(401).json({ error: 'Not signed in' });
    res.json({ ...(await enrich(email)), demo: true });
  });
}

module.exports = router;
