import { useLanguage } from './LanguageContext';

interface MobileNavProps {
  currentView: 'game' | 'profile' | 'stats' | 'user';
  onHomeClick: () => void;
  onStatsClick: () => void;
  onProfileClick: () => void;
  user?: { username: string } | null;
}

/**
 * Barre de navigation inférieure (mobile uniquement, < md).
 * Style "liquid glass" flottant, avec prise en compte de la safe-area iOS.
 */
function MobileNav({ currentView, onHomeClick, onStatsClick, onProfileClick, user }: MobileNavProps) {
  const { t } = useLanguage();

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const items = [
    {
      key: 'game',
      label: t.header.home,
      active: currentView === 'game',
      onClick: onHomeClick,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: 'stats',
      label: t.header.stats,
      active: currentView === 'stats' || currentView === 'user',
      onClick: onStatsClick,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: 'profile',
      label: user ? t.header.profile : t.header.login,
      active: currentView === 'profile',
      onClick: user ? onProfileClick : handleLogin,
      icon: user ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
          {user.username.charAt(0).toUpperCase()}
        </span>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex max-w-sm items-stretch gap-1 rounded-2xl border border-white/60 bg-white/70 p-1.5 shadow-xl shadow-indigo-500/15 backdrop-blur-xl">
        {items.map(({ key, label, active, onClick, icon }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
              active
                ? 'bg-indigo-500/10 text-indigo-600'
                : 'text-slate-500 active:bg-slate-500/10'
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
