// Background SAP push listener — periodically retries any Sales Orders that
// haven't reached SAP yet (network blip, SAP down, etc.).
const { retryPending, SAP_DB_ENABLED } = require('./sapService');

function start(intervalMs = 15000) {
  if (!SAP_DB_ENABLED && !process.env.SAP_ENDPOINT) {
    console.log('SAP target not configured; push listener disabled');
    return;
  }
  console.log('Starting SAP push listener (every', intervalMs, 'ms)');
  setInterval(() => {
    retryPending().catch((e) => console.error('SAP retry error', e.message));
  }, intervalMs);
}

module.exports = { start };
