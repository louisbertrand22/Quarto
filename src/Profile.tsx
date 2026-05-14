import { useEffect, useState } from 'react';
import { subscribeToUserStats, getLastGames } from './firebaseConfig';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Skeleton } from './components/ui/skeleton';
import { Separator } from './components/ui/separator';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-primary hover:text-primary gap-2 -ml-2"
      >
        ← Retour au jeu
      </Button>

      <Card className="rounded-2xl overflow-hidden">
        {/* Bandeau gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-28 sm:h-32" />

        <CardContent className="px-6 sm:px-8 pb-8">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4">
            <Avatar className="size-24 ring-4 ring-background shadow-lg">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-3xl font-bold">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="text-2xl font-bold text-foreground">{user.username || user.name}</h2>
          <p className="text-muted-foreground mb-6">{user.email}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">Matchs</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-900">{stats.totalGames}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
              <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-1">Win Rate</p>
              <p className="text-2xl sm:text-3xl font-black text-green-900">{stats.winRate}%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
              <p className="text-purple-600 text-xs font-bold uppercase tracking-widest mb-1">Victoires</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-900">{stats.wins || 0}</p>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Historique */}
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
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-transparent hover:border-primary/10 hover:bg-background hover:shadow-sm transition-all"
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

          <Separator className="mt-8 mb-6" />

          <div className="flex justify-end">
            <Button variant="destructive" onClick={onLogout} className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Profile;
