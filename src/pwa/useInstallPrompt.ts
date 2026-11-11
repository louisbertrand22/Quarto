import { useCallback, useEffect, useState } from 'react';

/** Événement non standard de Chrome/Edge/Android : permet d'afficher l'invitation d'installation native. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Émis par la page de partie en fin de partie : bon moment pour proposer l'installation. */
export const GAME_FINISHED_EVENT = 'quarto:game-finished';

const DISMISSED_KEY = 'quarto-install-dismissed-at';
const VISITS_KEY = 'quarto-visits';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* stockage indisponible */ } };

// Compté une seule fois par chargement de page (portée du module)
const visits = (() => {
  const n = Number(read(VISITS_KEY) ?? 0) + 1;
  write(VISITS_KEY, String(n));
  return n;
})();

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile
const detectIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

const dismissedRecently = () => Date.now() - Number(read(DISMISSED_KEY) ?? 0) < SNOOZE_MS;

/**
 * Invitation à installer l'app sur l'écran d'accueil.
 * - Android / Chrome / Edge : bouton qui ouvre l'invitation native.
 * - iOS : pas d'API, on affiche les étapes (Partager → Sur l'écran d'accueil).
 * La bannière n'apparaît qu'après un premier engagement (partie terminée ou 2e visite)
 * et se tait 14 jours après un « Plus tard ».
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [ios] = useState(detectIOS);
  const [engaged, setEngaged] = useState(visits >= 2);
  const [snoozed, setSnoozed] = useState(dismissedRecently);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // on garde l'invitation pour l'afficher au bon moment
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Laisse le temps de voir le résultat de la partie avant de solliciter
    const onGameFinished = () => { timer = setTimeout(() => setEngaged(true), 2500); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener(GAME_FINISHED_EVENT, onGameFinished);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener(GAME_FINISHED_EVENT, onGameFinished);
    };
  }, []);

  const canInstall = !installed && (deferred !== null || ios);

  const dismiss = useCallback(() => {
    write(DISMISSED_KEY, String(Date.now()));
    setSnoozed(true);
    setForced(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) { setForced(true); return; } // iOS : on montre les étapes
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // une invitation ne sert qu'une fois
    if (outcome === 'dismissed') dismiss();
  }, [deferred, dismiss]);

  return {
    /** L'installation est possible sur cet appareil (et pas déjà faite) */
    canInstall,
    showBanner: canInstall && (forced || (engaged && !snoozed)),
    ios: ios && deferred === null,
    install,
    dismiss,
    /** Ouverture volontaire (lien « Installer l'app ») : ignore le délai */
    open: () => (deferred ? install() : setForced(true)),
  };
}
