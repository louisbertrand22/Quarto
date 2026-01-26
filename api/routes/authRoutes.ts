import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCodeForTokens, getUserInfo } from '../services/ssoService.js';

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
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const ssoBaseUrl = process.env.SSO_BASE_URL || '';
  const clientId = process.env.SSO_CLIENT_ID || '';
  const redirectUri = process.env.SSO_REDIRECT_URI || '';
  console.log(req);
  
  const authUrl = `${ssoBaseUrl}/authorize?client_id=${clientId}&response_type=code&scope=openid email profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return res.redirect(authUrl);
}

// 2. Callback (Retour du SSO)
async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Code d'autorisation manquant");

  const tokens = await exchangeCodeForTokens(code, "verifier_si_utilise");
  const frontendUrl = process.env.FRONTEND_URL || '';
  
  // Utilisation de l'URL de base pour éviter de doubler /dashboard si déjà présent
  return res.redirect(`${frontendUrl}/?token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`);
}

// 3. Informations utilisateur
async function handleUserInfo(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const accessToken = authHeader.substring(7).trim();
  const userInfo = await getUserInfo(accessToken);
  return res.json(userInfo);
}

// 4. Rafraîchissement du token
async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Token manquant' });

  const ssoBaseUrl = process.env.SSO_BASE_URL || '';
  const clientId = process.env.SSO_CLIENT_ID || '';
  const clientSecret = process.env.SSO_CLIENT_SECRET;

  const axios = (await import('axios')).default;
  const response = await axios.post(`${ssoBaseUrl}/token`, {
    grant_type: 'refresh_token',
    refresh_token,
    client_id: clientId,
    client_secret: clientSecret
  });

  return res.json({
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token || refresh_token
  });
}