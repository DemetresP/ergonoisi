import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

// Chrome/Android event that lets the page show its own "Install" button
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "installPromptDismissedAt";
const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone/iPad Safari has no install event; the user adds it from the Share menu
function isIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isOtherBrowser = /crios|fxios|edgios/i.test(ua);
  return isIos && !isOtherBrowser;
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Boolean(at) && Date.now() - at < ASK_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed());

  useEffect(() => {
    if (hidden) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    if (isIosSafari()) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [hidden]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setHidden(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setHidden(true);
  };

  if (hidden || (!installEvent && !showIosHint)) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid="install-prompt"
    >
      <div className="mx-auto max-w-md rounded-xl border bg-background shadow-lg p-4 flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Εγκατάσταση εφαρμογής</p>
          {installEvent ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Βάλε το ATHENAI στην αρχική οθόνη για γρήγορη πρόσβαση.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Πάτα <Share className="w-3.5 h-3.5 inline -mt-0.5" aria-label="Κοινοποίηση" /> και μετά
              «Προσθήκη στην οθόνη Αφετηρίας».
            </p>
          )}
          {installEvent && (
            <Button size="sm" className="mt-2 gap-1.5" onClick={install} data-testid="button-install-app">
              <Download className="w-4 h-4" />
              Εγκατάσταση
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Κλείσιμο"
          data-testid="button-install-dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
