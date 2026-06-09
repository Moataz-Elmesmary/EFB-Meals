import React, { useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { useTranslation } from 'react-i18next';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`
  }
};

const msalInstance = new PublicClientApplication(msalConfig);
const loginRequest = { scopes: ['openid', 'profile', 'email'] };

export default function AuthButton({ onSignIn, user }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);

  async function login() {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      onSignIn(response.account);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Login failed.');
    }
  }

  return (
    <>
      <button className="btn btn-ghost" type="button" onClick={login}>🪪 {user ? t('refreshLogin') : t('login')}</button>
      {error && <span style={{ color: 'var(--danger)', marginInlineStart: 10 }}>{error}</span>}
    </>
  );
}
