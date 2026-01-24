import { useState, useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'
import Game from './Game'
import Profile from './Profile'
import Stats from './Stats'

function App() {
  const [user, setUser] = useState<{ name: string; email: string; username: string; id: string } | null>(null);
  const [view, setView] = useState<'game' | 'profile' | 'stats'>('game');
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header 
        onProfileClick={() => setView('profile')} 
        onStatsClick={() => setView('stats')}
        onHomeClick={() => setView('game')}
        showNavigation={true} 
        user={user}
        currentView={view}
      />

      {/* 1. flex-1 : force le main à prendre tout l'espace restant.
          2. flex flex-col : permet au contenu interne de se centrer parfaitement.
          3. w-full : s'assure qu'il n'y a pas de marges latérales vides.
      */}
      <main className="flex-1 flex flex-col w-full">
        {view === 'game' && (
          /* h-full permet au menu de sélection de s'étaler sur toute la hauteur disponible */
          <div className="flex-1 flex flex-col">
            <Game user={user} />
          </div>
        )}

        {view === 'profile' && (
          <div className="flex-1 py-8">
            <Profile user={user} onBack={() => setView('game')} onLogout={handleLogout} />
          </div>
        )}

        {view === 'stats' && (
          <div className="flex-1 py-8">
            <Stats user={user} onBack={() => setView('game')} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );

  
}

export default App

