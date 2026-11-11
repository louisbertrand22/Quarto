/**
 * Session SSO côté navigateur : jetons, renouvellement, requêtes authentifiées.
 *
 * MySSO délivre des jetons d'accès de 15 min et des refresh tokens à usage unique
 * (rotation : le serveur refuse un refresh token déjà utilisé). Deux renouvellements
 * simultanés avec le même refresh token font donc échouer le second : il ne faut
 * jamais en lancer deux à la fois, ni dans cet onglet ni entre onglets (ou l'app installée).
 */

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';
const LOCK = 'quarto-token-refresh';

const read = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};

export const getAccessToken = () => read(ACCESS);

export const storeTokens = (access: string, refresh?: string | null) => {
  try {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  } catch { /* stockage indisponible */ }
};

export const clearTokens = () => {
  try {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch { /* stockage indisponible */ }
};

/** Résultat d'un renouvellement : nouveau jeton, session terminée, ou panne passagère. */
export type RefreshOutcome = { ok: true; accessToken: string } | { ok: false; expired: boolean };

/** Exécute `fn` en exclusivité entre onglets (Web Locks), sinon directement. */
const withCrossTabLock = <T,>(fn: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks
    ? (navigator.locks.request(LOCK, fn) as Promise<T>)
    : fn();

const doRefresh = async (staleAccess: string | null): Promise<RefreshOutcome> => {
  // Un autre onglet a peut-être déjà renouvelé pendant qu'on attendait le verrou
  const current = getAccessToken();
  if (current && current !== staleAccess) return { ok: true, accessToken: current };

  const refreshToken = read(REFRESH);
  if (!refreshToken) return { ok: false, expired: true };

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (response.ok) {
      const tokens = await response.json();
      storeTokens(tokens.access_token, tokens.refresh_token);
      return { ok: true, accessToken: tokens.access_token };
    }
    if (response.status === 400 || response.status === 401) {
      // Ne déconnecter que si personne n'a remplacé le refresh token entre-temps
      if (read(REFRESH) !== refreshToken) {
        const fresh = getAccessToken();
        return fresh ? { ok: true, accessToken: fresh } : { ok: false, expired: true };
      }
      return { ok: false, expired: true };
    }
    return { ok: false, expired: false }; // SSO indisponible, limite de débit… on réessaiera
  } catch {
    return { ok: false, expired: false }; // Hors ligne
  }
};

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Renouvelle le jeton d'accès, une seule fois même si plusieurs appels arrivent en même temps.
 * @param staleAccess le jeton que l'appelant a vu refusé (pour détecter un renouvellement déjà fait)
 */
export const refreshAccessToken = (staleAccess: string | null = getAccessToken()): Promise<RefreshOutcome> => {
  if (!inFlight) {
    inFlight = withCrossTabLock(() => doRefresh(staleAccess)).finally(() => { inFlight = null; });
  }
  return inFlight;
};

/** Listeners avertis quand la session est définitivement expirée (refresh refusé). */
const expiredListeners = new Set<() => void>();
export const onSessionExpired = (fn: () => void) => {
  expiredListeners.add(fn);
  return () => { expiredListeners.delete(fn); };
};

/**
 * fetch avec le jeton d'accès ; sur 401, renouvelle le jeton une fois et rejoue la requête.
 * Retourne null si l'utilisateur n'est pas connecté.
 */
export const authFetch = async (input: string, init: RequestInit = {}): Promise<Response | null> => {
  const token = getAccessToken();
  if (!token) return null;
  const send = (t: string) =>
    fetch(input, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` } });

  const response = await send(token);
  if (response.status !== 401) return response;

  const outcome = await refreshAccessToken(token);
  if (outcome.ok) return send(outcome.accessToken);
  if (outcome.expired) {
    clearTokens();
    expiredListeners.forEach(fn => fn());
  }
  return response;
};
