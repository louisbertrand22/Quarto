import { useLanguage } from './LanguageContext';

interface HeaderProps {
  onProfileClick?: () => void;
  onHomeClick?: () => void;
  onStatsClick?: () => void;
  onModeSelect?: (mode: 'two-player' | 'vs-ai' | 'online') => void;
  showNavigation?: boolean;
  user?: { name: string; email: string; username: string } | null;
  currentView?: 'game' | 'profile' | 'stats';
}

function Header({ onStatsClick, onProfileClick, onHomeClick, onModeSelect, showNavigation = false, user, currentView = 'game' }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  // Fonction pour rafraîchir la page
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          
          {/* Conteneur Logo + Titre avec rafraîchissement au clic */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={handleRefresh}
            title="Rafraîchir la page"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-md transition-transform group-hover:scale-105">
              <svg
                className="w-8 h-8 text-indigo-600"
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white transition-opacity group-hover:opacity-90">
                {t.header.title}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100">{t.header.subtitle}</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-4 md:space-x-6">
            {showNavigation && onHomeClick && (
              <button
                onClick={onHomeClick}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${currentView === 'game' ? 'bg-white/20 text-white' : 'text-white hover:text-indigo-100'}`}
                title={t.header.home}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium hidden sm:inline">{t.header.home}</span>
              </button>
            )}

            {showNavigation && onStatsClick && (
              <button
                onClick={onStatsClick}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${currentView === 'stats' ? 'bg-white/20 text-white' : 'text-white hover:text-indigo-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium hidden sm:inline">Statistiques</span>
              </button>
            )}

            <button
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={language === 'fr' ? t.header.switchToEnglish : t.header.switchToFrench}
            >
              <span className="text-lg">{language === 'fr' ? '🇬🇧' : '🇫🇷'}</span>
              <span className="text-sm font-medium text-white hidden sm:inline">
                {language === 'fr' ? 'EN' : 'FR'}
              </span>
            </button>

            {user ? (
              <div 
                onClick={onProfileClick} 
                className={`flex items-center space-x-3 cursor-pointer px-3 py-1.5 rounded-full border transition-colors ${currentView === 'profile' ? 'bg-white text-indigo-700 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentView === 'profile' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium hidden md:inline">{user.username}</span>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full font-semibold shadow-sm transition-all border border-indigo-400/30 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">Connexion</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;