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
    // Redirection vers la Serverless Function Vercel que nous avons créée
    window.location.href = '/api/auth/login';
  };


  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-md">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t.header.title}</h1>
              <p className="text-xs sm:text-sm text-indigo-100">{t.header.subtitle}</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-4 md:space-x-6">
            {showNavigation && onHomeClick && (
              <button
                onClick={onHomeClick}
                className="flex items-center space-x-2 text-white hover:text-indigo-100 transition-colors"
                title={t.header.home}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium hidden sm:inline">{t.header.home}</span>
              </button>
            )}

            {/* Nouvel onglet Statistiques */}
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
            
            {showNavigation && onModeSelect && (
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => onModeSelect('two-player')}
                  className="text-white hover:text-indigo-100 transition-colors font-medium"
                  title={t.header.twoPlayer}
                >
                  🎮 {t.header.twoPlayer}
                </button>
                <button
                  onClick={() => onModeSelect('vs-ai')}
                  className="text-white hover:text-indigo-100 transition-colors font-medium"
                  title={t.header.vsAI}
                >
                  🤖 {t.header.vsAI}
                </button>
                <button
                  onClick={() => onModeSelect('online')}
                  className="text-white hover:text-indigo-100 transition-colors font-medium"
                  title={t.header.online}
                >
                  🌐 {t.header.online}
                </button>
              </div>
            )}
            {/* Language Switcher */}
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
              <div onClick={onProfileClick} className="flex items-center space-x-3 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                  {user.username.charAt(0)}
                </div>
                <span className="text-white font-medium hidden md:inline">{user.username}</span>
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

            <a
              href="https://github.com/louisbertrand22/Quarto"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-white hover:text-indigo-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium hidden sm:inline">{t.header.github}</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
