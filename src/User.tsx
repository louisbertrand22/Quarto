import { useEffect, useState } from 'react';
import { subscribeToUserStats, getLastGames, getUsernameFromUserId } from './firebaseConfig';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Skeleton } from './components/ui/skeleton';
import { Separator } from './components/ui/separator';

interface UserProps {
  userId: string | null;
  onBack: () => void;
}

function User({ userId, onBack }: UserProps) {
  const [stats, setStats] = useState({ totalGames: 0, wins: 0, winRate: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserStats(userId, (data) => {
      setStats(data);
    });

    getLastGames(userId).then((games) => {
      setHistory(games);
      setLoadingHistory(false);
    }).catch(() => setLoadingHistory(false));

    getUsernameFromUserId(userId).then((name) => {
      setUsername(name);
    });

    return () => unsubscribe();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-primary hover:text-primary gap-2 -ml-2"
      >
        ← Retour aux stats
      </Button>

      <Card className="rounded-3xl border-white/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
        <CardContent className="px-5 sm:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-16">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold">
                {username ? username.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{username ?? '…'}</h2>
              <p className="text-muted-foreground text-sm">Profil joueur</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-8">
            <div className="bg-blue-500/10 p-3 sm:p-4 rounded-2xl border border-blue-200/60 text-center">
              <p className="text-blue-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">Matchs</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-900">{stats.totalGames}</p>
            </div>
            <div className="bg-emerald-500/10 p-3 sm:p-4 rounded-2xl border border-emerald-200/60 text-center">
              <p className="text-emerald-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">Win Rate</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-900">{stats.winRate}%</p>
            </div>
            <div className="bg-purple-500/10 p-3 sm:p-4 rounded-2xl border border-purple-200/60 text-center">
              <p className="text-purple-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">Victoires</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-900">{stats.wins || 0}</p>
            </div>
          </div>

          <Separator className="mb-6" />

          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            🕒 Dernières parties
          </h3>

          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-2">
              {history.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white/50 rounded-2xl border border-white/60 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      variant={game.result === 'win' ? 'default' : game.result === 'loss' ? 'destructive' : 'outline'}
                      className={game.result === 'win' ? 'bg-green-600 hover:bg-green-600' : ''}
                    >
                      {game.result === 'win' ? 'Victoire' : game.result === 'loss' ? 'Défaite' : 'Égalité'}
                    </Badge>
                    <div className="flex gap-1.5">
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
                  <span className="text-sm text-muted-foreground font-mono shrink-0">
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
            <div className="text-center py-10 bg-muted/30 rounded-xl text-muted-foreground italic border-2 border-dashed border-border">
              Aucun historique disponible.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default User;
