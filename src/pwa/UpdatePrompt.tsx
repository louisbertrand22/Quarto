import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Button } from '../components/ui/button';

/**
 * Service worker : enregistrement + proposition de mise à jour.
 * Jamais de rechargement automatique, pour ne pas couper une partie en cours.
 */
export function UpdatePrompt() {
  const { t } = useLanguage();
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Vérifie les nouvelles versions toutes les heures si l'app reste ouverte
      if (registration) setInterval(() => { registration.update().catch(() => {}); }, 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="q-pop fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl"
    >
      <RefreshCw className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 text-sm">{t.install.updateAvailable}</p>
      <Button variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => setNeedRefresh(false)}>{t.install.later}</Button>
      <Button className="h-8 px-3" onClick={() => updateServiceWorker(true)}>{t.install.update}</Button>
    </div>
  );
}
