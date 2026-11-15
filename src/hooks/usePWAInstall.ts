import { useCallback, useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_STORAGE_KEY = "nairaclear_pwa_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true ||
    document.referrer.startsWith("android-app://")
  );
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    (/macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function isBannerDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => cachedDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectStandalone);
  const [isIOS] = useState<boolean>(detectIOS);
  const [isDismissed, setIsDismissed] = useState<boolean>(
    isBannerDismissedRecently
  );

  useEffect(() => {
    setIsInstalled(detectStandalone());

    const mql = window.matchMedia("(display-mode: standalone)");
    const handleDisplayChange = () => setIsInstalled(detectStandalone());
    if (mql.addEventListener) {
      mql.addEventListener("change", handleDisplayChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      cachedDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      cachedDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleDisplayChange);
      }
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const promptEvent = deferredPrompt || cachedDeferredPrompt;
    if (!promptEvent) return "unavailable";

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    cachedDeferredPrompt = null;
    setDeferredPrompt(null);

    if (outcome === "accepted") {
      setIsInstalled(true);
      return "accepted";
    }
    return "dismissed";
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    isInstalled,
    canNativePrompt: Boolean(deferredPrompt || cachedDeferredPrompt),
    isIOS,
    isBannerVisible: !isInstalled && !isDismissed,
    install,
    dismissBanner,
  };
}
