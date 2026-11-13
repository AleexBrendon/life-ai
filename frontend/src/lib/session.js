export const SESSION_EXPIRED_EVENT = "lifeai:session-expired";
import { accountId, purgeOffline } from './offlineStore';
import { disablePush } from './deviceNotifications';

const TOKEN_KEY = "lifeai_token";

export function getSessionToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  const id = accountId();
  purgeOffline(id).catch(() => {});
  disablePush().catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('lifeai_account');
}

export function endSession() {
  clearSessionToken();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
