import { LogIn, Moon, Sun } from 'lucide-react';
import type { AppView } from './types';
import { useLanguage } from './LanguageContext';
import { useTheme } from './game/useTheme';
import { Button } from './components/ui/button';

interface HeaderProps {
  onProfileClick?: () => void;
  onHomeClick?: () => void;
  onStatsClick?: () => void;
  showNavigation?: boolean;
  user?: { name: string; email: string; username: string } | null;
  currentView?: AppView;
}

const HOME_SECTION_VIEWS: AppView[] = ['home', 'two-player', 'vs-ai', 'online'];

/** Logo : disque de bois à quatre trous, l'un occupé par la couleur d'accent. */
function BrandMark() {
  return (
    <svg className="size-[30px] shrink-0" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--wood-2)" />
      <circle cx="16" cy="16" r="13" fill="var(--wood-1)" />
      <circle cx="11.5" cy="11.5" r="2.6" fill="rgba(0,0,0,.3)" />
      <circle cx="20.5" cy="11.5" r="2.6" fill="rgba(0,0,0,.3)" />
      <circle cx="11.5" cy="20.5" r="2.6" fill="rgba(0,0,0,.3)" />
      <circle cx="20.5" cy="20.5" r="2.6" fill="var(--primary)" />
    </svg>
  );
}

const iconBtn =
  'grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-muted-foreground cursor-pointer';

function Header({ onStatsClick, onProfileClick, onHomeClick, showNavigation = false, user, currentView = 'home' }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggle } = useTheme();

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogoClick = () => {
    if (onHomeClick) onHomeClick();
    else window.location.reload();
  };

  const navLink = (active: boolean) =>
    `rounded-lg px-3 py-[7px] text-sm font-medium transition-colors cursor-pointer hover:bg-muted hover:text-foreground ${
      active ? 'bg-muted text-foreground' : 'text-muted-foreground'
    }`;

  const homeActive = HOME_SECTION_VIEWS.includes(currentView);
  const statsActive = currentView === 'stats' || currentView === 'user';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
        {/* Logo + titre */}
        <button
          type="button"
          onClick={handleLogoClick}
          aria-label={`${t.header.title}, ${t.header.home}`}
          className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg text-foreground"
        >
          <BrandMark />
          <span className="font-display text-[21px] font-bold leading-none tracking-tight">{t.header.title}</span>
        </button>

        {/* Navigation desktop — le mobile passe par la barre du bas */}
        {showNavigation ? (
          <nav aria-label={t.header.mainNav} className="mr-auto hidden gap-0.5 md:flex">
            {onHomeClick && (
              <button
                type="button"
                onClick={onHomeClick}
                aria-current={homeActive ? 'page' : undefined}
                className={navLink(homeActive)}
              >
                {t.header.home}
              </button>
            )}
            {onStatsClick && (
              <button
                type="button"
                onClick={onStatsClick}
                aria-current={statsActive ? 'page' : undefined}
                className={navLink(statsActive)}
              >
                {t.header.stats}
              </button>
            )}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            aria-label={language === 'fr' ? t.header.switchToEnglish : t.header.switchToFrench}
            title={language === 'fr' ? t.header.switchToEnglish : t.header.switchToFrench}
            className={`${iconBtn} w-auto px-2.5 font-mono text-xs font-semibold`}
          >
            {language === 'fr' ? 'EN' : 'FR'}
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? t.header.themeLight : t.header.themeDark}
            title={theme === 'dark' ? t.header.themeLight : t.header.themeDark}
            className={iconBtn}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" aria-hidden="true" /> : <Moon className="size-[18px]" aria-hidden="true" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={onProfileClick}
              aria-label={t.header.profile}
              aria-current={currentView === 'profile' ? 'page' : undefined}
              title={user.username}
              className={`ml-1 grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-shadow ${
                currentView === 'profile' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
            >
              {user.username.charAt(0).toUpperCase()}
            </button>
          ) : (
            <Button onClick={handleLogin} className="ml-1 h-9 gap-1.5 rounded-lg px-3 font-semibold">
              <LogIn aria-hidden="true" />
              <span>{t.header.login}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
