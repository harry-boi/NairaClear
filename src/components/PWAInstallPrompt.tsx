import React, { useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Smartphone,
  X,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

interface InstallGuideModalProps {
  isOpen: boolean;
  isIOS: boolean;
  onClose: () => void;
}

const InstallGuideSheet: React.FC<InstallGuideModalProps> = ({
  isOpen,
  isIOS,
  onClose,
}) => {
  if (!isOpen) return null;

  const isInIframe =
    typeof window !== "undefined" && window.self !== window.top;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="NairaClear"
              className="h-10 w-10 rounded-xl shadow-xs"
            />
            <div>
              <h3
                id="install-guide-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Install NairaClear
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add to your home screen like a native app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install guide"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isInIframe && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              If you are viewing inside an embedded preview, open the app URL
              directly in Safari or Chrome first to enable Home Screen
              installation.
            </div>
          )}

          {isIOS ? (
            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                  <Share className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    1. Tap the Share icon
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Located at the bottom toolbar in Safari (or top-right on iPad).
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                  <PlusSquare className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    2. Choose &ldquo;Add to Home Screen&rdquo;
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Scroll down the share sheet and tap Add to Home Screen.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    3. Tap &ldquo;Add&rdquo;
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    NairaClear launches fullscreen with offline ledger access.
                  </p>
                </div>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                  <MoreVertical className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    1. Open your browser menu
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap the menu icon in Chrome, Edge, or Samsung Internet, or
                    look for the install icon in the address bar.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    2. Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Confirm to place NairaClear on your home screen.
                  </p>
                </div>
              </li>
            </ol>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 dark:bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

interface PWAInstallBannerProps {
  hasBottomNav?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  hasBottomNav = false,
}) => {
  const { isIOS, isBannerVisible, install, dismissBanner } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (!isBannerVisible) {
    return null;
  }

  const handleInstallClick = async () => {
    const result = await install();
    if (result === "unavailable") {
      setShowGuide(true);
    }
  };

  return (
    <>
      <aside
        aria-label="Install NairaClear App"
        className={`fixed z-30 left-3 right-3 lg:left-auto lg:right-6 lg:w-[390px] ${
          hasBottomNav
            ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-6"
            : "bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-6"
        }`}
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-[0_12px_36px_-8px_rgba(15,23,42,0.22)] dark:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="NairaClear App Icon"
              className="h-11 w-11 shrink-0 rounded-xl shadow-xs"
            />

            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                Install NairaClear
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                Home-screen access, fast due alerts &amp; offline ledger
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 hover:bg-emerald-700 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Dismiss install banner"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <InstallGuideSheet
        isOpen={showGuide}
        isIOS={isIOS}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
};

export const PWAInstallSettingRow: React.FC = () => {
  const { isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const result = await install();
    if (result === "unavailable") {
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Install App
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add NairaClear to your phone home screen for native full-screen launch
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install</span>
        </button>
      </div>

      <InstallGuideSheet
        isOpen={showGuide}
        isIOS={isIOS}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
};

export const OfflineIndicator: React.FC<{ hasBottomNav?: boolean }> = ({
  hasBottomNav = false,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-4 z-40 inline-flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/95 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-200 shadow-lg backdrop-blur-xs ${
        hasBottomNav ? "bottom-[4.25rem] lg:bottom-5" : "bottom-4"
      }`}
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span>Offline — Saved loan data stays available</span>
    </div>
  );
};
