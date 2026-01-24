import axios from 'axios';

// Utilisation de valeurs par défaut pour éviter les erreurs de type string | undefined
const SSO_BASE_URL = process.env.SSO_BASE_URL || '';
const CLIENT_ID = process.env.SSO_CLIENT_ID || '';
const REDIRECT_URI = process.env.SSO_REDIRECT_URI || '';

export const exchangeCodeForTokens = async (code: string, codeVerifier: string) => {
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  
  if (!clientSecret) {
    throw new Error('SSO_CLIENT_SECRET is not configured in environment variables.');
  }
  
  try {
    const response = await axios.post(`${SSO_BASE_URL}/token`, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: clientSecret,
      code_verifier: codeVerifier 
    }, {
      // Optionnel : s'assurer que le contenu est envoyé en application/json ou x-www-form-urlencoded selon votre SSO
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data; 
  } catch (error: any) {
    // Log plus précis pour le debug en production sur Vercel
    console.error('Erreur SSO (Exchange):', error.response?.data || error.message);
    throw new Error('Authentification échouée');
  }
};

export const getUserInfo = async (accessToken: string) => {
  try {
    const response = await axios.get(`${SSO_BASE_URL}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Erreur SSO (UserInfo):', error.response?.data || error.message);
    throw error;
  }
};