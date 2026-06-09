const express = require('express');
const router = express.Router();

const clientId = process.env.AZURE_CLIENT_ID;
const tenantId = process.env.AZURE_TENANT_ID;
const azureEnabled = Boolean(clientId && tenantId);

// Frontend reads this on boot to decide whether to use real Microsoft SSO
// or the local demo sign-in fallback.
router.get('/config', (req, res) => {
  res.json({ azureEnabled, clientId: clientId || null, tenantId: tenantId || null });
});

function nameFromEmail(email) {
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

if (azureEnabled) {
  // Real SSO: verify the Microsoft ID token (Bearer) then return the profile.
  const auth = require('../auth');
  router.get('/me', auth, (req, res) => {
    const u = req.user || {};
    res.json({
      email: u.preferred_username || u.email || u.upn || null,
      name: u.name || u.preferred_username || 'User'
    });
  });
} else {
  // Demo mode: the browser sends the chosen email in X-Demo-Email.
  router.get('/me', (req, res) => {
    const email = req.header('X-Demo-Email');
    if (!email) return res.status(401).json({ error: 'Not signed in' });
    res.json({ email, name: nameFromEmail(email), demo: true });
  });
}

module.exports = router;
