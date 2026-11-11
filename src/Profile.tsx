import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { subscribeToUserStats, getLastGames } from './firebaseConfig';
import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { GameHistory, Panel, ProfileHeader, StatTiles } from './ProfileParts';
import type { GameRecord, PlayerStats } from './ProfileParts';

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
  const { t } = useLanguage();
  const [stats, setStats] = useState<PlayerStats>({ totalGames: 0, wins: 0, winRate: 0 });
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserStats(user.id, (data: PlayerStats) => {
      setStats(data);
    });

    getLastGames(user.id)
      .then((games) => setHistory(games as GameRecord[]))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));

    return () => unsubscribe();
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4">
      <Button variant="ghost" onClick={onBack} className="-ml-2.5 h-9 gap-1.5 text-muted-foreground">
        <ArrowLeft aria-hidden="true" />
        {t.actions.back}
      </Button>

      <Panel className="space-y-6">
        <ProfileHeader name={user.username || user.name} subtitle={user.email} />
        <StatTiles stats={stats} />
      </Panel>

      <Panel>
        <GameHistory games={history} loading={loadingHistory} />
      </Panel>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={onLogout}
          className="h-9 gap-1.5 px-3 text-destructive hover:text-destructive"
        >
          <LogOut aria-hidden="true" />
          {t.profile.logout}
        </Button>
      </div>
    </div>
  );
}

export default Profile;
