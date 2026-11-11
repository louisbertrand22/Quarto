import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { exchangeCodeForTokens, getUserInfo } from '../services/ssoService.js';

/**
 * Jeton refusé par le SSO (expiré, révoqué, invalide) ?
 * Le front s'appuie sur une 401 pour déclencher le rafraîchissement ou la déconnexion :
 * ces cas ne doivent pas remonter en 500.
 */
const isRejectedToken = (error: unknown): boolean =>
  axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0);

export async function handleAuthRequest(req: VercelRequest, res: VercelResponse) {
  // On récupère le chemin après /api/auth/ pour simuler le routage
  const path = req.url?.split('?')[0].replace('/api/auth', '');

  try {
    switch (path) {
      case '/login':
        return handleLogin(req, res);
      case '/callback':
        return handleCallback(req, res);
      case '/userinfo':
        return handleUserInfo(req, res);
      case '/refresh':
        if (req.method !== 'POST') return res.status(405).end();
        return handleRefresh(req, res);
      default:
        return res.status(404).json({ error: 'Route non trouvée' });
    }
  } catch (error: any) {
    console.error(`Erreur sur ${path}:`, error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// 1. Démarrage de la connexion
async function handleLogin(_req: VercelRequest, res: VercelResponse) {
  const ssoBaseUrl = process.env.SSO_BASE_URL || '';
  const clientId = process.env.SSO_CLIENT_ID || '';
  const redirectUri = process.env.SSO_REDIRECT_URI || '';

  const authUrl = `${ssoBaseUrl}/authorize?client_id=${clientId}&response_type=code&scope=openid email profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return res.redirect(authUrl);
}

// 2. Callback (Retour du SSO)
async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Code d'autorisation manquant");

  const tokens = await exchangeCodeForTokens(code, "verifier_si_utilise");
  const frontendUrl = process.env.FRONTEND_URL || '';

  // Jetons dans le fragment (#) : le navigateur ne l'envoie jamais au serveur,
  // ils n'apparaissent donc ni dans les logs de requêtes ni dans les en-têtes Referer
  const fragment = new URLSearchParams({ token: tokens.access_token, refresh_token: tokens.refresh_token ?? '' });
  return res.redirect(`${frontendUrl}/#${fragment.toString()}`);
}

// 3. Informations utilisateur
async function handleUserInfo(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const accessToken = authHeader.substring(7).trim();
  try {
    const userInfo = await getUserInfo(accessToken);
    return res.json(userInfo);
  } catch (error) {
    if (isRejectedToken(error)) return res.status(401).json({ error: 'Token expiré ou invalide' });
    throw error;
  }
}

// 4. Rafraîchissement du token
async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Token manquant' });

  const ssoBaseUrl = process.env.SSO_BASE_URL || '';
  const clientId = process.env.SSO_CLIENT_ID || '';
  const clientSecret = process.env.SSO_CLIENT_SECRET;

  let response;
  try {
    response = await axios.post(`${ssoBaseUrl}/token`, {
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId,
      client_secret: clientSecret
    });
  } catch (error) {
    if (isRejectedToken(error)) return res.status(401).json({ error: 'Refresh token expiré ou invalide' });
    throw error;
  }

  return res.json({
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token || refresh_token
  });
}