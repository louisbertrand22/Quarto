import { Share, SquarePlus, X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Button } from '../components/ui/button';

interface InstallBannerProps {
  ios: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

/** Bannière d'invitation à installer l'app (au-dessus de la barre mobile, en bas à droite sur ordinateur). */
export function InstallBanner({ ios, onInstall, onDismiss }: InstallBannerProps) {
  const { t } = useLanguage();
  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="q-pop fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl md:inset-x-auto md:bottom-6 md:right-6"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.install.close}
        className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex gap-3.5 pr-6">
        <img src="/icons/icon-192.png" alt="" className="size-14 shrink-0 rounded-[14px] shadow-md" />
        <div className="min-w-0">
          <p id="install-title" className="font-display text-lg font-bold leading-tight tracking-tight">{t.install.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.install.body}</p>
        </div>
      </div>

      {ios ? (
        <ol className="mt-3.5 flex flex-col gap-2 rounded-xl bg-muted p-3 text-sm">
          <li className="flex items-center gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card font-mono text-xs font-semibold">1</span>
            {t.install.iosStep1}
            <Share className="size-4 shrink-0 text-primary" aria-hidden="true" />
          </li>
          <li className="flex items-center gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card font-mono text-xs font-semibold">2</span>
            {t.install.iosStep2}
            <SquarePlus className="size-4 shrink-0 text-primary" aria-hidden="true" />
          </li>
        </ol>
      ) : (
        <div className="mt-3.5 flex gap-2">
          <Button variant="outline" className="h-10 flex-1" onClick={onDismiss}>{t.install.later}</Button>
          <Button className="h-10 flex-1" onClick={onInstall}>{t.install.install}</Button>
        </div>
      )}
    </div>
  );
}
