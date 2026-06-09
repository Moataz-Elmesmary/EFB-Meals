// Diagnostic: verify Graph app token, profile read and mail send.
// Run: node scripts/test-graph.js
require('dotenv').config();
const { GRAPH_ENABLED, graphSendMail, graphGetUser } = require('../src/graph');

(async () => {
  console.log('GRAPH_ENABLED:', GRAPH_ENABLED);
  const me = 'Moataz.Mahdy@efb.eg';

  try {
    const u = await graphGetUser(me);
    console.log('✓ getUser OK:', JSON.stringify(u));
  } catch (e) {
    console.log('✗ getUser FAILED:', e.message);
    console.log('  → needs User.Read.All (Application) + admin consent');
  }

  try {
    await graphSendMail('efb.apps@efb.eg', me, 'EFB Meals — test ✅', '<h2 style="color:#085648">EFB Meals</h2><p>Graph mail is working 🎉</p>');
    console.log('✓ sendMail OK — check your inbox:', me);
  } catch (e) {
    console.log('✗ sendMail FAILED:', e.message);
    console.log('  → needs Mail.Send (Application) + admin consent, and efb.apps@efb.eg mailbox');
  }
})();
