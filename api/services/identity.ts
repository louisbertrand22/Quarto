import type { VercelRequest } from '@vercel/node';
import axios from 'axios';
import { getUserInfo } from './ssoService.js';

export type Identity =
  | { ok: true; userId: string; username: string }
  | { ok: false; status: number; error: string };

/** Identifie le joueur par son jeton SSO (jamais par le corps de la requête). */
export const authenticate = async (req: VercelRequest): Promise<Identity> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, status: 401, error: 'Token manquant' };
  try {
    const info = await getUserInfo(authHeader.substring(7).trim());
    const userId: string | undefined = info.sub || info.id;
    if (!userId) return { ok: false, status: 401, error: 'Utilisateur inconnu' };
    const username: string = info.preferred_username || info.name || info.email || 'Joueur';
    return { ok: true, userId: String(userId), username };
  } catch (error) {
    if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) {
      return { ok: false, status: 401, error: 'Token expiré ou invalide' };
    }
    console.error('[identity] Erreur SSO :', error);
    return { ok: false, status: 502, error: 'SSO indisponible' };
  }
};
