import { useEffect, useState } from 'react'; // Ajout de useState
import { subscribeToUserStats, getLastGames } from './firebaseConfig'

interface ProfileProps {
  user: {
    name: string;
    email: string;
    username: string;
    id: string;
  } | null;
  onBack: () => void;
  onLogout: () => void;
}

function Profile({ user, onBack, onLogout }: ProfileProps) {
  // 1. Initialisation de l'état des statistiques
  const [stats, setStats] = useState({ totalGames: 0, wins: 0, winRate: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  if (!user) return null;

  useEffect(() => {
    if (!user?.id) return;

    // 2. Abonnement aux statistiques réelles
    const unsubscribe = subscribeToUserStats(user.id, (data) => {
        setStats(data); 
    });

    getLastGames(user.id).then((games) => {
      setHistory(games);
      setLoadingHistory(false);
    }).catch(() => setLoadingHistory(false));

    return () => unsubscribe(); 
  }, [user?.id]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={onBack} className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center gap-2">
        ← Retour au jeu
      </button>
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-6">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
              <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-700">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800">{user.username || user.name}</h2>
          <p className="text-gray-500 mb-8">{user.email}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 3. Affichage des données dynamiques de Firebase */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-blue-600 text-sm font-semibold uppercase">Parties Jouées</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalGames}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <p className="text-green-600 text-sm font-semibold uppercase">Victoires</p>
              <p className="text-3xl font-bold text-green-900">{stats.winRate}%</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-purple-600 text-sm font-semibold uppercase">Nombre de Wins</p>
              <p className="text-3xl font-bold text-purple-900">{stats.wins || 0}</p>
            </div>
          </div>

          {/* Section Historique des parties */}
          <div className="border-t pt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Dernières parties</h3>
            {loadingHistory ? (
              <div className="text-center py-4 text-gray-400 animate-pulse">Chargement de l'historique...</div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((game) => (
                  <div key={game.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        game.result === 'win' ? 'bg-green-500' : 
                        game.result === 'loss' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-semibold text-gray-700 capitalize">
                        {game.result === 'win' ? 'Victoire' : game.result === 'loss' ? 'Défaite' : 'Égalité'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400 font-medium">
                      <span className="text-sm text-gray-400 font-medium italic">
                        {new Date(game.date).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-500 italic">
                Aucune partie enregistrée pour le moment.
              </div>
            )}
          </div>

          {/* Section déconnexion */}
          <div className="border-t pt-8 flex justify-end">
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default Profile;