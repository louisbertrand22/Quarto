import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';

interface HeaderProps {
  onProfileClick?: () => void;
  onHomeClick?: () => void;
  onStatsClick?: () => void;
  onModeSelect?: (mode: 'two-player' | 'vs-ai' | 'online') => void;
  showNavigation?: boolean;
  user?: { name: string; email: string; username: string } | null;
  currentView?: 'game' | 'profile' | 'stats' | 'user';
}

function Header({ onStatsClick, onProfileClick, onHomeClick, showNavigation = false, user, currentView = 'game' }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const navItemClasses = (active: boolean) =>
    `gap-1.5 rounded-xl px-3 text-slate-600 hover:bg-indigo-500/10 hover:text-indigo-600 ${
      active ? 'bg-indigo-500/10 text-indigo-600' : ''
    }`;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/60 px-3 py-2 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:px-5 sm:py-2.5">

        {/* Logo + Titre */}
        <div
          className="group flex shrink-0 cursor-pointer items-center gap-2.5"
          onClick={handleRefresh}
          title="Rafraîchir la page"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 sm:h-10 sm:w-10">
            <svg
              className="h-5 w-5 text-white sm:h-6 sm:w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-xl">
              {t.header.title}
            </h1>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block">{t.header.subtitle}</p>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {/* Liens de navigation — desktop uniquement, le mobile passe par la barre du bas */}
          {showNavigation && onHomeClick && (
            <Button
              variant="ghost"
              onClick={onHomeClick}
              className={`hidden md:flex ${navItemClasses(currentView === 'game')}`}
              title={t.header.home}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-medium">{t.header.home}</span>
            </Button>
          )}

          {showNavigation && onStatsClick && (
            <Button
              variant="ghost"
              onClick={onStatsClick}
              className={`hidden md:flex ${navItemClasses(currentView === 'stats' || currentView === 'user')}`}
              title={t.header.stats}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">{t.header.stats}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="gap-1 rounded-xl px-2 text-slate-600 hover:bg-indigo-500/10 hover:text-indigo-600 sm:px-3"
            title={language === 'fr' ? t.header.switchToEnglish : t.header.switchToFrench}
          >
            <span className="text-base leading-none">{language === 'fr' ? '🇬🇧' : '🇫🇷'}</span>
            <span className="hidden text-xs font-semibold sm:inline">
              {language === 'fr' ? 'EN' : 'FR'}
            </span>
          </Button>

          {user ? (
            <Button
              variant="ghost"
              onClick={onProfileClick}
              className={`gap-2 rounded-full px-1.5 text-slate-700 hover:bg-indigo-500/10 hover:text-indigo-600 sm:px-2.5 ${
                currentView === 'profile' ? 'bg-indigo-500/10 text-indigo-600' : ''
              }`}
              title={t.header.profile}
            >
              <Avatar className="size-7 sm:size-8">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden pr-1 text-sm font-medium md:inline">{user.username}</span>
            </Button>
          ) : (
            <Button
              onClick={handleLogin}
              className="gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg sm:px-4"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm">{t.header.login}</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
