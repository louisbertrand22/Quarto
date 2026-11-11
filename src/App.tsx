import { useState, useEffect, useCallback } from 'react'
import type { AppView } from './types'
import { useLanguage } from './LanguageContext'
import Header from './Header'
import MobileNav from './MobileNav'
import Footer from './Footer'
import Home from './Home'
import Game from './Game'
import Profile from './Profile'
import Stats from './Stats'
import User from './User'
import { PieceDefs } from './game/Piece'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { InstallBanner } from './pwa/InstallBanner'
import { UpdatePrompt } from './pwa/UpdatePrompt'

// Routage SPA léger : chaque page a sa propre URL (fallback configuré dans vercel.json)
const VIEW_TO_PATH: Record<Exclude<AppView, 'user'>, string> = {
  home: '/',
  'two-player': '/two-player',
  'vs-ai': '/vs-ai',
  online: '/online',
  stats: '/stats',
  profile: '/profile',
};

const pathFor = (view: AppView, userId?: string | null): string =>
  view === 'user'
    ? `/user/${encodeURIComponent(userId ?? '')}`
    : VIEW_TO_PATH[view];

function parseLocation(): { view: AppView; userId: string | null } {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path.startsWith('/user/')) {
    return { view: 'user', userId: decodeURIComponent(path.slice('/user/'.length)) };
  }
  // Lien d'invitation : /online/ABC123 (userId porte alors le code de salle)
  const invite = path.match(/^\/online\/([A-Za-z0-9]{6})$/);
  if (invite) return { view: 'online', userId: invite[1].toUpperCase() };
  const entry = Object.entries(VIEW_TO_PATH).find(([, p]) => p === path);
  return { view: (entry?.[0] as AppView) ?? 'home', userId: null };
}

function App() {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ name: string; email: string; username: string; id: string } | null>(null);
  const [route, setRoute] = useState(parseLocation);
  const installPrompt = useInstallPrompt();

  const navigate = useCallback((view: AppView, userId: string | null = null) => {
    setRoute({ view, userId });
    const path = pathFor(view, userId);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0 });
  }, []);

  // Boutons précédent/suivant du navigateur
  useEffect(() => {
    const onPopState = () => setRoute(parseLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Titre de l'onglet selon la page
  useEffect(() => {
    const titles: Record<AppView, string> = {
      home: `Quarto — ${t.header.subtitle}`,
      'two-player': `Quarto — ${t.gameModes.twoPlayer}`,
      'vs-ai': `Quarto — ${t.gameModes.vsAI}`,
      online: `Quarto — ${t.gameModes.online}`,
      stats: `Quarto — ${t.header.stats}`,
      profile: `Quarto — ${t.header.profile}`,
      user: `Quarto — ${t.header.stats}`,
    };
    document.title = titles[route.view];
  }, [route.view, t]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  const handleTokenRefresh = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      handleLogout(); // Pas de refresh possible, on déconnecte
      return;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const tokens = await response.json();
        localStorage.setItem('access_token', tokens.access_token);
        // Certains SSO renvoient aussi un nouveau refresh_token
        if (tokens.refresh_token) {
          localStorage.setItem('refresh_token', tokens.refresh_token);
        }
        // On relance la récupération du profil avec le nouveau token
        fetchUserInfo(tokens.access_token);
      } else if (response.status === 400 || response.status === 401) {
        handleLogout(); // Refresh token invalide ou expiré
      }
      // Autre erreur (SSO indisponible…) : on garde les jetons pour réessayer au prochain chargement
    } catch (error) {
      // Erreur réseau : même logique, on ne déconnecte pas pour une panne passagère
      console.error("Erreur de rafraîchissement:", error);
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('/api/auth/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        // Le token a expiré, on tente de le rafraîchir
        await handleTokenRefresh();
      } else if (response.ok) {
        const data = await response.json();
          const mappedUser = {
          email: data.email,
          name: data.name || data.username || data.email,
          id: data.sub || data.id,
          username: data.preferred_username,
        };
        setUser(mappedUser);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil", error);
    }
  };

  useEffect(() => {
    if (user) return;
    // 1. Extraire les paramètres de l'URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refresh_token');

    if (token) {
      // 2. Stocker les tokens pour les prochaines requêtes
      localStorage.setItem('access_token', token);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

      // 3. Nettoyer l'URL (enlever les tokens de la barre d'adresse pour la sécurité)
      window.history.replaceState({}, document.title, window.location.pathname);

      // 4. Récupérer les infos de l'utilisateur via ton API
      fetchUserInfo(token);
    } else {
      // Vérifier si un token existe déjà en cache
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) fetchUserInfo(savedToken);
    }
  }, [user, fetchUserInfo]);

  const { view, userId } = route;
  const isGameView = view === 'two-player' || view === 'vs-ai' || view === 'online';

  return (
    <div className="min-h-screen flex flex-col">
      <PieceDefs />

      <Header
        onProfileClick={() => navigate('profile')}
        onStatsClick={() => navigate('stats')}
        onHomeClick={() => navigate('home')}
        showNavigation={true}
        user={user}
        currentView={view}
      />

      <main className="flex-1">
        {view === 'home' && (
          <Home
            user={user}
            onSelectMode={(mode) => navigate(mode)}
            onViewStats={() => navigate('stats')}
            onViewProfile={() => navigate('profile')}
            onViewUser={(id) => navigate('user', id)}
          />
        )}

        {isGameView && (
          <Game
            key={view}
            user={user}
            mode={view}
            onExit={() => navigate('home')}
            initialRoomCode={view === 'online' ? userId : null}
          />
        )}

        {view === 'profile' && (
          <div className="py-6 sm:py-8">
            <Profile user={user} onBack={() => navigate('home')} onLogout={handleLogout} />
          </div>
        )}

        {view === 'stats' && (
          <div className="py-6 sm:py-8">
            <Stats
              user={user}
              onViewUser={(id) => navigate('user', id)}
            />
          </div>
        )}

        {view === 'user' && (
          <div className="py-6 sm:py-8">
            <User userId={userId} onBack={() => navigate('stats')} />
          </div>
        )}
      </main>

      <Footer onInstall={installPrompt.canInstall ? installPrompt.open : undefined} />

      {installPrompt.showBanner && (
        <InstallBanner ios={installPrompt.ios} onInstall={installPrompt.install} onDismiss={installPrompt.dismiss} />
      )}
      <UpdatePrompt />

      <MobileNav
        currentView={view}
        onHomeClick={() => navigate('home')}
        onStatsClick={() => navigate('stats')}
        onProfileClick={() => navigate('profile')}
        user={user}
      />
    </div>
  );
}

export default App
