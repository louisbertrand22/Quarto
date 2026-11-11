import type { ReactNode } from 'react';
import { Home, LogIn, Trophy } from 'lucide-react';
import type { AppView } from './types';
import { useLanguage } from './LanguageContext';

interface MobileNavProps {
  currentView: AppView;
  onHomeClick: () => void;
  onStatsClick: () => void;
  onProfileClick: () => void;
  user?: { username: string } | null;
}

const HOME_SECTION_VIEWS: AppView[] = ['home', 'two-player', 'vs-ai', 'online'];

/**
 * Barre de navigation inférieure (mobile uniquement, < md).
 * Pleine largeur, collée en bas, avec prise en compte de la safe-area iOS.
 */
function MobileNav({ currentView, onHomeClick, onStatsClick, onProfileClick, user }: MobileNavProps) {
  const { t } = useLanguage();

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const items: { key: string; label: string; active: boolean; onClick: () => void; icon: ReactNode }[] = [
    {
      key: 'home',
      label: t.header.home,
      active: HOME_SECTION_VIEWS.includes(currentView),
      onClick: onHomeClick,
      icon: <Home className="size-5" aria-hidden="true" />,
    },
    {
      key: 'stats',
      label: t.header.stats,
      active: currentView === 'stats' || currentView === 'user',
      onClick: onStatsClick,
      icon: <Trophy className="size-5" aria-hidden="true" />,
    },
    {
      key: 'profile',
      label: user ? t.header.profile : t.header.login,
      active: currentView === 'profile',
      onClick: user ? onProfileClick : handleLogin,
      icon: user ? (
        <span
          className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {user.username.charAt(0).toUpperCase()}
        </span>
      ) : (
        <LogIn className="size-5" aria-hidden="true" />
      ),
    },
  ];

  return (
    <nav
      aria-label={t.header.mainNav}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch px-2">
        {items.map(({ key, label, active, onClick, icon }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {icon}
            <span className="leading-none">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default MobileNav;
