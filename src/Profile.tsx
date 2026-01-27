import { useEffect, useState } from 'react';
import { subscribeToUserStats, getLastGames } from './firebaseConfig';

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
  const [stats, setStats] = useState({ totalGames: 0, wins: 0, winRate: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    // Abonnement aux statistiques globales
    const unsubscribe = subscribeToUserStats(user.id, (data) => {
        setStats(data); 
    });

    getLastGames(user.id).then((games) => {
      setHistory(games);
      setLoadingHistory(false);
    }).catch(() => setLoadingHistory(false));

    return () => unsubscribe(); 
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors font-medium">
        ← Retour au jeu
      </button>
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header du profil */}
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

          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-center shadow-sm">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">Matchs</p>
              <p className="text-3xl font-black text-blue-900">{stats.totalGames}</p>
            </div>
            <div className="bg-green-50 p-5 rounded-2xl border border-green-100 text-center shadow-sm">
              <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-1">Win Rate</p>
              <p className="text-3xl font-black text-green-900">{stats.winRate}%</p>
            </div>
            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 text-center shadow-sm">
              <p className="text-purple-600 text-xs font-bold uppercase tracking-widest mb-1">Victoires</p>
              <p className="text-3xl font-black text-purple-900">{stats.wins || 0}</p>
            </div>
          </div>

          {/* Section Historique */}
          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              🕒 Dernières parties
            </h3>
            
            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse"></div>)}
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((game) => (
                  <div key={game.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${
                        game.result === 'win' ? 'bg-green-500' : 
                        game.result === 'loss' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className={`font-bold uppercase text-xs tracking-wider ${
                        game.result === 'win' ? 'text-green-600' : 
                        game.result === 'loss' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {game.result === 'win' ? 'Victoire' : game.result === 'loss' ? 'Défaite' : 'Égalité'}
                      </span>

                      {/* Affichage des conditions de victoire */}
                        <div className="flex gap-2 mt-1">
                          {game.Options?.lines && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase">
                              Lignes
                            </span>
                          )}
                          {game.Options?.squares && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold uppercase">
                              Carrés
                            </span>
                          )}
                        </div>
                    </div>
                    {/* Formatage : dd/mm/yyyy hh:mm */}
                    <span className="text-sm text-gray-400 font-bold font-mono">
                      {new Date(game.date).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-400 italic border-2 border-dashed border-gray-100">
                Aucun historique disponible.
              </div>
            )}
          </div>

          {/* Actions de compte */}
          <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end">
            <button 
              onClick={onLogout}
              className="group flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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