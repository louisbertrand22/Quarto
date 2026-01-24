import { useEffect, useState, useMemo } from 'react';
import { subscribeToUserStats, getLeaderboard } from './firebaseConfig';

interface StatsProps {
  user: { username: string; id: string } | null;
  onBack: () => void;
}

function Stats({ user, onBack }: StatsProps) {
  const [stats, setStats] = useState({ totalGames: 0, wins: 0, winRate: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomTip, setRandomTip] = useState("");

  const gameTips = useMemo(() => [
    "Observez bien les trous : c'est la caractéristique la plus facile à oublier lors d'une partie tendue.",
    "Ne vous contentez pas de bloquer l'adversaire, essayez de créer deux menaces simultanées.",
    "La taille des pièces est cruciale : une petite pièce peut se cacher visuellement derrière une grande.",
    "Si vous jouez en premier, donnez une pièce neutre pour ne pas révéler votre stratégie immédiatement.",
    "Le Quarto se gagne souvent par l'erreur de l'autre : restez concentré sur chaque caractéristique commune."
  ], []);

  useEffect(() => {
    if (!user?.id) return;

    const randomIndex = Math.floor(Math.random() * gameTips.length);
    setRandomTip(gameTips[randomIndex]);

    // 1. Stats personnelles en temps réel
    const unsubscribe = subscribeToUserStats(user.id, (data) => {
      setStats(data);
    });

    // 2. Chargement du classement
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        console.error("Erreur de chargement du classement", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => unsubscribe();
  }, [user?.id]);

  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Statistiques & Leaderboard</h2>
        <button onClick={onBack} className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all">
          Retour au jeu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analyse et Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl border-b-4 border-indigo-500">
            <h3 className="text-xl font-bold text-gray-700 mb-6">🏆 Tes Performances</h3>
            <div className="flex justify-between items-end mb-4">
              <span className="text-gray-500 font-medium">Taux de victoire</span>
              <span className="text-5xl font-black text-indigo-600">{stats.winRate}%</span>
            </div>
            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden mb-8">
              <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${stats.winRate}%` }}></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                <p className="text-gray-400 text-xs uppercase font-bold">Matchs</p>
                <p className="text-2xl font-bold">{stats.totalGames}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                <p className="text-gray-400 text-xs uppercase font-bold">Victoires</p>
                <p className="text-2xl font-bold text-green-600">{stats.wins || 0}</p>
              </div>
            </div>
          </div>

          {/* Analyse de jeu & Conseil Aléatoire */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border-b-4 border-purple-500">
            <h3 className="text-xl font-bold text-gray-700 mb-4 font-sans">💡 Analyse du jeu</h3>
            <p className="text-gray-600 leading-relaxed mb-6 text-lg">
              {stats.winRate > 50 
                ? "Ton ratio est excellent ! Tu as une très bonne lecture des pièces à donner à l'adversaire." 
                : "Entraîne-toi à repérer les lignes de 3 pièces. Ne laisse pas l'IA choisir la pièce finale !"}
            </p>
            {/* Affichage du conseil aléatoire */}
            <div className="p-5 bg-purple-50 rounded-2xl text-purple-800 text-sm md:text-base italic border border-purple-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-400"></div>
              <span className="font-bold not-italic block mb-1 text-purple-900">Le conseil du jour :</span>
              "{randomTip}"
            </div>
          </div>
        </div>

        {/* Classement */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-amber-400">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">✨ Top Joueurs</h3>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>)}
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${player.id === user.id ? 'bg-indigo-50 border-2 border-indigo-200 ring-2 ring-indigo-100' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-amber-400 text-white shadow-md' : 'bg-white text-gray-400'}`}>
                      {index + 1}
                    </span>
                    <span className="font-bold text-gray-700 truncate max-w-[120px]">{player.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-indigo-600">{player.wins} victoires</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">{player.totalGames} Games</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Stats;