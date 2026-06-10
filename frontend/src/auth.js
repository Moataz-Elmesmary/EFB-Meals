import axios from 'axios';
import { PublicClientApplication } from '@azure/msal-browser';
import API_BASE from './api';

let msal = null;
let config = null;

function setAuthHeader(headers) {
  delete axios.defaults.headers.common['Authorization'];
  delete axios.defaults.headers.common['X-Demo-Email'];
  if (headers) Object.entries(headers).forEach(([k, v]) => (axios.defaults.headers.common[k] = v));
}

// Force-refresh the cached ID token (e.g. after it expires mid-session).
async function refreshIdToken() {
  if (!msal) return false;
  const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
  if (!account) return false;
  try {
    msal.setActiveAccount(account);
    const res = await msal.acquireTokenSilent({ scopes: ['User.Read'], account, forceRefresh: true });
    axios.defaults.headers.common.Authorization = `Bearer ${res.idToken}`;
    return res.idToken;
  } catch (_) {
    return false;
  }
}

// On a 401 (expired token), refresh once and retry — so protected calls like
// /my-requests don't silently fail after the token expires.
axios.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    if (error.response && error.response.status === 401 && !original._retried && msal) {
      original._retried = true;
      const token = await refreshIdToken();
      if (token) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return axios(original);
      }
    }
    return Promise.reject(error);
  }
);

export async function loadConfig() {
  if (config) return config;
  const { data } = await axios.get(`${API_BASE}/api/config`);
  config = data;
  return config;
}

async function initMsal(cfg) {
  if (msal) return msal;
  msal = new PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: window.location.origin
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false }
  });
  await msal.initialize();
  const result = await msal.handleRedirectPromise();
  if (result) msal.setActiveAccount(result.account);
  return msal;
}

async function acquireAndLoadUser() {
  const result = await msal.acquireTokenSilent({ scopes: ['User.Read'], account: msal.getActiveAccount() });
  setAuthHeader({ Authorization: `Bearer ${result.idToken}` });
  const { data } = await axios.get(`${API_BASE}/api/me`);
  return data;
}

// Restore an existing session on boot. Returns the user or null.
export async function restoreSession() {
  const cfg = await loadConfig();
  if (cfg.azureEnabled) {
    await initMsal(cfg);
    const accounts = msal.getAllAccounts();
    if (accounts.length) {
      msal.setActiveAccount(accounts[0]);
      try {
        return await acquireAndLoadUser();
      } catch (_) {
        setAuthHeader(null);
        return null;
      }
    }
    return null;
  }
  const email = sessionStorage.getItem('demo-email');
  if (email) {
    setAuthHeader({ 'X-Demo-Email': email });
    try {
      return (await axios.get(`${API_BASE}/api/me`)).data;
    } catch (_) {
      sessionStorage.removeItem('demo-email');
      setAuthHeader(null);
    }
  }
  return null;
}

export async function loginMicrosoft() {
  const cfg = await loadConfig();
  await initMsal(cfg);
  await msal.loginRedirect({ scopes: ['User.Read'], prompt: 'select_account' });
  return new Promise(() => {}); // browser navigates away
}

export async function loginDemo(email) {
  setAuthHeader({ 'X-Demo-Email': email });
  const { data } = await axios.get(`${API_BASE}/api/me`);
  sessionStorage.setItem('demo-email', email);
  return data;
}

export async function logout() {
  sessionStorage.removeItem('demo-email');
  setAuthHeader(null);
  if (msal) {
    try {
      await msal.logoutRedirect({ account: msal.getActiveAccount() });
    } catch (_) {}
  }
}
