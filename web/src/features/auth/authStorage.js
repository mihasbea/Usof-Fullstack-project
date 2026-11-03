const AUTH_STORAGE_KEY = "usof:auth";
const LAST_LOGIN_KEY = "usof:last-login";

function getTokenExpiration(token) {
  const payload = token.split(".")[1];
  if (!payload) return 0;

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );
    const decodedPayload = JSON.parse(window.atob(paddedPayload));
    return Number.isFinite(decodedPayload.exp) ? decodedPayload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function loadPersistedAuth() {
  const serializedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!serializedAuth) return null;

  try {
    const auth = JSON.parse(serializedAuth);
    if (
      !auth.user ||
      typeof auth.token !== "string" ||
      getTokenExpiration(auth.token) <= Date.now()
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return auth;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistAuth(auth) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user: auth.user, token: auth.token }),
  );
}

export function clearPersistedAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getRememberedLogin() {
  return window.localStorage.getItem(LAST_LOGIN_KEY) ?? "";
}

export function rememberLogin(login) {
  window.localStorage.setItem(LAST_LOGIN_KEY, login);
}
