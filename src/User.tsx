import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { subscribeToUserStats, getLastGames, getUsernameFromUserId } from './firebaseConfig';
import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { GameHistory, Panel, ProfileHeader, StatTiles } from './ProfileParts';
import type { GameRecord, PlayerStats } from './ProfileParts';

interface UserProps {
  userId: string | null;
  onBack: () => void;
}

function User({ userId, onBack }: UserProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<PlayerStats>({ totalGames: 0, wins: 0, winRate: 0 });
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserStats(userId, (data: PlayerStats) => {
      setStats(data);
    });

    getLastGames(userId)
      .then((games) => setHistory(games as GameRecord[]))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));

    getUsernameFromUserId(userId)
      .then((name: string) => setUsername(name))
      .catch(() => setUsername(null));

    return () => unsubscribe();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4">
      <Button variant="ghost" onClick={onBack} className="-ml-2.5 h-9 gap-1.5 text-muted-foreground">
        <ArrowLeft aria-hidden="true" />
        {t.profile.backToStats}
      </Button>

      <Panel className="space-y-6">
        <ProfileHeader name={username} subtitle={t.profile.playerProfile} />
        <StatTiles stats={stats} />
      </Panel>

      <Panel>
        <GameHistory games={history} loading={loadingHistory} />
      </Panel>
    </div>
  );
}

export default User;
