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
import { authFetch, clearTokens, onSessionExpired, storeTokens } from './auth/session'

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
    clearTokens();
    window.location.reload();
  };

  // Profil SSO : une seule fois au chargement (le renouvellement du jeton est géré par authFetch)
  useEffect(() => {
    // Retour de connexion : jetons dans le fragment (#token=…), ou dans la query (ancien format)
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    const token = params.get('token');
    if (token) {
      storeTokens(token, params.get('refresh_token'));
      // On les retire aussitôt de la barre d'adresse et de l'historique
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let cancelled = false;
    authFetch('/api/auth/userinfo').then(async response => {
      if (cancelled || !response?.ok) return;
      const data = await response.json();
      setUser({
        email: data.email,
        name: data.name || data.username || data.email,
        id: data.sub || data.id,
        username: data.preferred_username,
      });
    }).catch(error => console.error('Erreur lors de la récupération du profil', error));

    // Session réellement terminée (refresh refusé par le SSO) : on repasse en invité
    const off = onSessionExpired(() => setUser(null));
    return () => { cancelled = true; off(); };
  }, []);

  const { view, userId } = route;
  const isGameView = view === 'two-player' || view === 'vs-ai' || view === 'online';

  // Sur mobile, la barre de navigation fixe (MobileNav) ne doit jamais masquer le bas de page,
  // que le footer soit affiché ou masqué (app installée) : la place est réservée ici.
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
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
