import { useEffect, useState, useMemo } from 'react';
import { subscribeToUserStats, getLeaderboard } from './firebaseConfig';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Skeleton } from './components/ui/skeleton';
import { Badge } from './components/ui/badge';

interface StatsProps {
  user: { username: string; id: string } | null;
  onBack: () => void;
  onViewUser: (id: string) => void;
}

function Stats({ user, onBack, onViewUser }: StatsProps) {
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
    const randomIndex = Math.floor(Math.random() * gameTips.length);
    setRandomTip(gameTips[randomIndex]);

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

    if (!user?.id) return;

    const unsubscribe = subscribeToUserStats(user.id, (data) => {
      setStats(data);
    });

    return () => unsubscribe();
  }, [user?.id, gameTips]);

  const leaderboardCard = (
    <Card className="rounded-3xl border-white/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-amber-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">✨ Top Joueurs</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                onClick={() => onViewUser(player.id)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all hover:bg-indigo-500/5 active:bg-indigo-500/10 ${user && player.id === user.id ? 'bg-indigo-500/5 ring-1 ring-indigo-500/20' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {index === 0 ? (
                    <Badge className="size-8 rounded-full bg-amber-400 text-white justify-center">{index + 1}</Badge>
                  ) : (
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">{index + 1}</span>
                  )}
                  <span className="font-semibold text-foreground truncate max-w-[120px]">{player.username}</span>
                </div>
                <div className="text-right">
                  <span className="block font-black text-primary">{player.wins} victoires</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{player.totalGames} Games</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const tipCard = (
    <Card className="rounded-3xl border-white/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-purple-500/10">
      <CardHeader>
        <CardTitle>💡 Analyse du jeu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          {stats.winRate > 50
            ? "Ton ratio est excellent ! Tu as une très bonne lecture des pièces à donner à l'adversaire."
            : "Entraîne-toi à repérer les lignes de 3 pièces. Ne laisse pas l'IA choisir la pièce finale !"}
        </p>
        <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-800 text-sm italic border border-purple-200/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-400" />
          <span className="font-bold not-italic block mb-1 text-purple-900">Le conseil du jour :</span>
          "{randomTip}"
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Statistiques & Leaderboard</h2>
          <Button onClick={onBack} className="self-start rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700 sm:self-auto">Retour au jeu</Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">{tipCard}</div>
          {leaderboardCard}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Statistiques & Leaderboard</h2>
        <Button onClick={onBack} className="self-start rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700 sm:self-auto">Retour au jeu</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-white/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
            <CardHeader>
              <CardTitle>🏆 Tes Performances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground font-medium">Taux de victoire</span>
                <span className="text-5xl font-black text-primary">{stats.winRate}%</span>
              </div>
              <div className="w-full bg-slate-900/10 h-3 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-1000 rounded-full" style={{ width: `${stats.winRate}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl text-center">
                  <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Matchs</p>
                  <p className="text-2xl font-bold">{stats.totalGames}</p>
                </div>
                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl text-center">
                  <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Victoires</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.wins || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {tipCard}
        </div>

        {leaderboardCard}
      </div>
    </div>
  );
}

export default Stats;
