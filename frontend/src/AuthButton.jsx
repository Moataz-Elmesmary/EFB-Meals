import React from 'react'
import { PublicClientApplication } from '@azure/msal-browser'
import { useTranslation } from 'react-i18next'

const msalConfig = {
  auth: {
    clientId: process.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.VITE_AZURE_TENANT_ID || 'common'}`
  }
};
const msalInstance = new PublicClientApplication(msalConfig);

export default function AuthButton(){
  const { t } = useTranslation();

  async function login(){
    try{
      const loginResp = await msalInstance.loginPopup({ scopes: [ 'openid', 'profile', 'email' ] });
      console.log('Login result', loginResp);
      alert('Logged in: ' + (loginResp.account && loginResp.account.username));
    } catch(e){
      console.error(e);
      alert('Login failed');
    }
  }

  return <button onClick={login}>{t('login') || 'Login with Microsoft'}</button>
}
