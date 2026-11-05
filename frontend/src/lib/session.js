export const SESSION_EXPIRED_EVENT = "lifeai:session-expired";

const TOKEN_KEY = "lifeai_token";

export function getSessionToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function endSession() {
  clearSessionToken();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
