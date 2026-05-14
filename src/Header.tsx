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

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">

          {/* Logo + Titre */}
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
            onClick={handleRefresh}
            title="Rafraîchir la page"
          >
            <div className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 bg-white rounded-lg shadow-md transition-transform group-hover:scale-105">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600"
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white transition-opacity group-hover:opacity-90">
                {t.header.title}
              </h1>
              <p className="text-xs text-indigo-100 hidden sm:block">{t.header.subtitle}</p>
            </div>
          </div>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {showNavigation && onHomeClick && (
              <Button
                variant="ghost"
                onClick={onHomeClick}
                className={`text-white hover:bg-white/10 hover:text-white gap-1.5 px-2 sm:px-3 ${currentView === 'game' ? 'bg-white/20' : ''}`}
                title={t.header.home}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium hidden sm:inline text-sm">{t.header.home}</span>
              </Button>
            )}

            {showNavigation && onStatsClick && (
              <Button
                variant="ghost"
                onClick={onStatsClick}
                className={`text-white hover:bg-white/10 hover:text-white gap-1.5 px-2 sm:px-3 ${currentView === 'stats' ? 'bg-white/20' : ''}`}
                title="Statistiques"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium hidden sm:inline text-sm">Statistiques</span>
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="text-white hover:bg-white/10 hover:text-white gap-1 px-2 sm:px-3"
              title={language === 'fr' ? t.header.switchToEnglish : t.header.switchToFrench}
            >
              <span className="text-base leading-none">{language === 'fr' ? '🇬🇧' : '🇫🇷'}</span>
              <span className="text-xs font-medium hidden sm:inline">
                {language === 'fr' ? 'EN' : 'FR'}
              </span>
            </Button>

            {user ? (
              <Button
                variant="ghost"
                onClick={onProfileClick}
                className={`text-white hover:bg-white/10 hover:text-white gap-2 rounded-full px-2 sm:px-3 ${currentView === 'profile' ? 'bg-white/20' : ''}`}
              >
                <Avatar className="size-7 sm:size-8">
                  <AvatarFallback className={`text-sm font-bold ${currentView === 'profile' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium hidden md:inline text-sm">{user.username}</span>
              </Button>
            ) : (
              <Button
                onClick={handleLogin}
                className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-full border border-indigo-400/30 font-semibold shadow-sm gap-1.5 px-3 sm:px-4"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm hidden sm:inline">Connexion</span>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
