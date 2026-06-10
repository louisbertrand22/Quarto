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
  const entry = Object.entries(VIEW_TO_PATH).find(([, p]) => p === path);
  return { view: (entry?.[0] as AppView) ?? 'home', userId: null };
}

function App() {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ name: string; email: string; username: string; id: string } | null>(null);
  const [route, setRoute] = useState(parseLocation);

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
      } else {
        handleLogout(); // Refresh token invalide ou expiré
      }
    } catch (error) {
      console.error("Erreur de rafraîchissement:", error);
      handleLogout();
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
      {/* Fond ambiant "liquid glass" : dégradé + halos flous fixes derrière toute l'app */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-indigo-100 via-slate-50 to-sky-100" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-purple-300/40 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-300/40 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
      </div>

      <Header
        onProfileClick={() => navigate('profile')}
        onStatsClick={() => navigate('stats')}
        onHomeClick={() => navigate('home')}
        showNavigation={true}
        user={user}
        currentView={view}
      />

      <main className="flex-1">
        {view === 'home' && <Home onSelectMode={(mode) => navigate(mode)} />}

        {isGameView && (
          <Game key={view} user={user} mode={view} onExit={() => navigate('home')} />
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
              onBack={() => navigate('home')}
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

      <Footer />

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
