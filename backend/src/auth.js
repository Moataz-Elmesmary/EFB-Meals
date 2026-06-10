const { expressjwt: expressJwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// If AZURE_CLIENT_ID (Application ID) and AZURE_TENANT_ID are set, enable JWT validation
const clientId = process.env.AZURE_CLIENT_ID;
const tenantId = process.env.AZURE_TENANT_ID;

if (!clientId || !tenantId) {
  module.exports = function optionalAuth(req, res, next){
    // no auth configured: attach dummy user and continue
    req.user = { sub: 'anonymous' };
    next();
  };
} else {
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const checkJwt = expressJwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      // Correct v2.0 JWKS endpoint: /{tenant}/discovery/v2.0/keys (no extra /v2.0)
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
    }),
    audience: clientId,
    issuer,
    algorithms: ['RS256'],
    // express-jwt v7 puts the decoded token on req.auth by default — keep it on
    // req.user so /me reads the claims correctly.
    requestProperty: 'user'
  });
  module.exports = checkJwt;
}
