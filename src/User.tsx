import { useEffect, useState } from 'react';
import { subscribeToUserStats, getLastGames, getUsernameFromUserId } from './firebaseConfig';

interface UserProps {
  userId: string | null;
  onBack: () => void;
}

function User({ userId, onBack }: UserProps) {
    const [stats, setStats] = useState({ totalGames: 0, wins: 0, winRate: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [username, setUsername] = useState(null);

    useEffect(() => {
        if (!userId) return;
    
        // Abonnement aux statistiques globales
        const unsubscribe = subscribeToUserStats(userId, (data) => {
            setStats(data); 
        });
    
        getLastGames(userId).then((games) => {
          setHistory(games);
          setLoadingHistory(false);
        }).catch(() => setLoadingHistory(false));

        getUsernameFromUserId(userId).then((username) => {
            setUsername(username)
        })
    
        return () => unsubscribe(); 
      }, [userId]);

      if (!userId) return null;

      return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <button onClick={onBack} className="text-indigo-600 cursor-pointer hover:text-indigo-800 flex items-center gap-2 transition-colors font-medium">
                ← Retour aux stats
            </button>

            <h2 className="text-2xl font-bold text-gray-800">{username}</h2>

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
        </div>
      );
}

export default User;