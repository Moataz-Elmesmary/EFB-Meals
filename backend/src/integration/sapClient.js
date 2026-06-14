// ───────────────────────────────────────────────────────────
// SAP API client (user/password). Built for the SAP Business One Service Layer
// shape (Login → session cookie → POST a document), but the endpoints are
// config-driven so it adapts to whatever the org exposes.
//
// Auth is user/password (NOT email) — set in .env:
//   SAP_API_URL=https://host:50000/b1s/v1
//   SAP_API_USER=...        SAP_API_PASS=...        SAP_COMPANY_DB=...
//   SAP_DOC_TYPE=Orders            (Orders | ProductionOrders | ...)
//   SAP_DRY_RUN=true        ← simulate SAP (no network) to test the middleware
// ───────────────────────────────────────────────────────────
const fetch = require('node-fetch');
const https = require('https');

const URL = (process.env.SAP_API_URL || '').replace(/\/$/, '');
const USER = process.env.SAP_API_USER || '';
const PASS = process.env.SAP_API_PASS || '';
const COMPANY = process.env.SAP_COMPANY_DB || '';
const DRY_RUN = process.env.SAP_DRY_RUN === 'true';
const ENABLED = DRY_RUN || !!URL;

// Service Layer uses a self-signed cert on most installs.
const agent = new https.Agent({ rejectUnauthorized: process.env.SAP_TLS_STRICT === 'true' });

let cookie = null;

async function login() {
  if (DRY_RUN) { cookie = 'DRY'; return; }
  const r = await fetch(`${URL}/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CompanyDB: COMPANY, UserName: USER, Password: PASS }),
    agent
  });
  if (!r.ok) throw new Error(`SAP login failed (${r.status}): ${await r.text()}`);
  cookie = (r.headers.raw()['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
}

// One request with a single auto re-login on 401 (expired session).
async function call(method, path, body, _retried) {
  if (!cookie) await login();
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
    agent
  });
  if (r.status === 401 && !_retried) { cookie = null; return call(method, path, body, true); }
  const text = await r.text();
  if (!r.ok) throw new Error(`SAP ${method} ${path} → ${r.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

// Create a document (Sales Order / Production Order / ...). Returns the SAP
// document number so the middleware can store it.
async function createDocument(doc) {
  const type = process.env.SAP_DOC_TYPE || 'Orders';
  if (DRY_RUN) {
    // deterministic fake number so reruns are stable
    const n = 900000 + (doc.U_RequestId || doc.RequestId || 0);
    return { docNum: n, docEntry: n, raw: { simulated: true } };
  }
  const res = await call('POST', `/${type}`, doc);
  return { docNum: res.DocNum != null ? res.DocNum : res.DocEntry, docEntry: res.DocEntry, raw: res };
}

// Create/update an item on SAP by code (used for off-menu special items).
// Looks the code up first → POST if new, PATCH if it exists.
async function upsertItem(item) {
  if (DRY_RUN) return { ok: true, simulated: true };
  try {
    await call('GET', `/Items('${encodeURIComponent(item.ItemCode)}')`);
    await call('PATCH', `/Items('${encodeURIComponent(item.ItemCode)}')`, item); // exists → update
    return { ok: true, created: false };
  } catch (e) {
    if (/→ 404/.test(e.message)) { await call('POST', '/Items', item); return { ok: true, created: true }; }
    throw e;
  }
}

module.exports = { ENABLED, DRY_RUN, createDocument, upsertItem, login };
