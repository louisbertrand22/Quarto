import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { subscribeToUserStats, getLeaderboard, type LeaderboardEntry } from './firebaseConfig';
import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { Panel, sectionLabel } from './ProfileParts';
import type { PlayerStats } from './ProfileParts';

interface StatsProps {
  user: { username: string; id: string } | null;
  /** Conservé pour compatibilité avec App ; la navigation passe désormais par l'en-tête. */
  onBack?: () => void;
  onViewUser: (id: string) => void;
}

function Stats({ user, onViewUser }: StatsProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<PlayerStats>({ totalGames: 0, wins: 0, winRate: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Index du conseil du jour, tiré une fois au montage
  const [tipIndex] = useState(() => Math.floor(Math.random() * 1000));

  useEffect(() => {
    let cancelled = false;
    getLeaderboard()
      .then((data) => {
        if (!cancelled) setLeaderboard(data);
      })
      .catch((err) => {
        console.error('Erreur de chargement du classement', err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToUserStats(user.id, (data: PlayerStats) => setStats(data));
    return () => unsubscribe();
  }, [user?.id]);

  const tips = t.stats.tips;
  const tip = tips[tipIndex % tips.length];

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const yourStatsCard = user ? (
    <Panel className="space-y-5">
      <h2 className={sectionLabel}>{t.stats.yourStats}</h2>
      <div className="flex items-end justify-between gap-4">
        <span className="text-sm text-muted-foreground">{t.stats.winRate}</span>
        <span className="font-display text-5xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">
          {stats.winRate}%
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={t.stats.winRate}
        aria-valuenow={stats.winRate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${Math.min(100, Math.max(0, stats.winRate))}%` }}
        />
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted px-4 py-3">
          <dt className={sectionLabel}>{t.stats.elo}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">{stats.elo ?? '–'}</dd>
        </div>
        <div className="rounded-xl bg-muted px-4 py-3">
          <dt className={sectionLabel}>{t.stats.games}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">{stats.totalGames}</dd>
        </div>
        <div className="rounded-xl bg-muted px-4 py-3">
          <dt className={sectionLabel}>{t.stats.wins}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">{stats.wins || 0}</dd>
        </div>
      </dl>
    </Panel>
  ) : (
    <Panel className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className={sectionLabel}>{t.stats.yourStats}</h2>
        <p className="text-sm text-foreground">{t.stats.signInPrompt}</p>
      </div>
      <Button onClick={handleLogin} className="h-9 gap-1.5 px-3 font-semibold">
        <LogIn aria-hidden="true" />
        {t.header.login}
      </Button>
    </Panel>
  );

  const tipCard = (
    <Panel className="space-y-3">
      <h2 className={sectionLabel}>{t.stats.tipTitle}</h2>
      <p className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground">{tip}</p>
      {user && stats.totalGames > 0 && (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          {stats.winRate > 50 ? t.stats.analysisGood : t.stats.analysisWork}
        </p>
      )}
    </Panel>
  );

  const leaderboardCard = (
    <Panel className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-display text-[21px] font-bold tracking-tight text-foreground">{t.stats.topPlayers}</h2>
        <p className="text-xs text-muted-foreground">{t.stats.eloExplained}</p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{t.stats.loadError}</p>
      ) : leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.stats.empty}</p>
      ) : (
        <ol className="flex flex-col">
          {leaderboard.map((player, index) => {
            const isMe = !!user && player.id === user.id;
            return (
              <li key={player.id} className={isMe ? '' : 'border-b border-border last:border-b-0'}>
                <button
                  type="button"
                  onClick={() => onViewUser(player.id)}
                  aria-current={isMe ? 'true' : undefined}
                  title={t.stats.ratedCount(player.ratedGames)}
                  className={`grid w-full cursor-pointer grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2.5 py-2.5 text-left text-sm transition-colors ${
                    isMe
                      ? '-mx-2.5 w-[calc(100%+1.25rem)] rounded-lg bg-primary/10 px-2.5'
                      : 'rounded-md hover:bg-muted/60'
                  }`}
                >
                  <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{index + 1}</span>
                  <span className="truncate font-medium text-foreground">
                    {player.username}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({t.stats.you})</span>}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    <span className="sr-only">{t.stats.eloCount(player.elo)}</span>
                    <span aria-hidden="true">{player.elo}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{t.stats.title}</h1>
        <p className="text-muted-foreground">{t.stats.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {yourStatsCard}
          {tipCard}
        </div>
        {leaderboardCard}
      </div>
    </div>
  );
}

export default Stats;
