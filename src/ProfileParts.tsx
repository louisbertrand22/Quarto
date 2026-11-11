import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { Skeleton } from './components/ui/skeleton';

/** Statistiques agrégées d'un joueur (cf. subscribeToUserStats). */
export interface PlayerStats {
  totalGames: number;
  wins: number;
  winRate: number;
}

/** Entrée de l'historique des parties (cf. getLastGames). */
export interface GameRecord {
  id: string;
  date: number;
  result: 'win' | 'loss' | 'draw';
  Options?: { lines?: boolean; squares?: boolean };
}


export const sectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground';

/** Carte de base du nouveau langage visuel. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</section>;
}

/** En-tête de profil : avatar, nom, ligne secondaire. */
export function ProfileHeader({ name, subtitle }: { name: string | null; subtitle?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div
        className="grid size-14 shrink-0 place-items-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground"
        aria-hidden="true"
      >
        {name ? name.charAt(0).toUpperCase() : '?'}
      </div>
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {name ?? '…'}
        </h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Trois tuiles : parties, taux de victoire, victoires. */
export function StatTiles({ stats }: { stats: PlayerStats }) {
  const { t } = useLanguage();
  const tiles = [
    { label: t.stats.games, value: String(stats.totalGames) },
    { label: t.stats.winRate, value: `${stats.winRate}%` },
    { label: t.stats.wins, value: String(stats.wins || 0) },
  ];

  return (
    <dl className="grid grid-cols-3 gap-2 sm:gap-3">
      {tiles.map(({ label, value }) => (
        <div key={label} className="min-w-0 rounded-xl bg-muted px-3 py-3 sm:px-4">
          <dt className={`${sectionLabel} truncate`}>{label}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const RESULT_CHIP: Record<GameRecord['result'], string> = {
  win: 'bg-good/15 text-good',
  loss: 'bg-destructive/15 text-destructive',
  draw: 'bg-muted text-muted-foreground',
};

/** Liste des dernières parties, avec squelette et état vide. */
export function GameHistory({ games, loading }: { games: GameRecord[]; loading: boolean }) {
  const { t, language } = useLanguage();
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';

  const resultLabel = (r: GameRecord['result']) =>
    r === 'win' ? t.profile.win : r === 'loss' ? t.profile.loss : t.profile.draw;

  return (
    <div className="space-y-3">
      <h2 className={`${sectionLabel} flex items-center gap-1.5`}>
        <Clock className="size-3.5" aria-hidden="true" />
        {t.profile.recentGames}
      </h2>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t.profile.noHistory}
        </p>
      ) : (
        <ul className="flex flex-col">
          {games.map((game) => {
            const date = new Date(game.date);
            const validDate = !Number.isNaN(date.getTime());
            return (
            <li
              key={game.id}
              className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${RESULT_CHIP[game.result] ?? RESULT_CHIP.draw}`}>
                  {resultLabel(game.result)}
                </span>
                {game.Options?.lines && (
                  <span className="rounded-full border border-border px-2 py-px text-[10.5px] uppercase tracking-[0.07em] text-muted-foreground">
                    {t.profile.lines}
                  </span>
                )}
                {game.Options?.squares && (
                  <span className="rounded-full border border-border px-2 py-px text-[10.5px] uppercase tracking-[0.07em] text-muted-foreground">
                    {t.profile.squares}
                  </span>
                )}
              </div>
              {validDate && (
                <time
                  dateTime={date.toISOString()}
                  className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                >
                  {date.toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
