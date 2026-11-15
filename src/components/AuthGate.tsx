import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, Sun, Moon } from "lucide-react";

interface AuthGateProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onUnlocked: (token: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  theme,
  onToggleTheme,
  onUnlocked,
}) => {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const raw = await response.text();
      let data: { ok?: boolean; token?: string; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // Non-JSON response
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to verify passcode.");
      }

      setPasscode("");
      onUnlocked(data.token || "");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to verify passcode."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 pb-24 sm:p-6">
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          NairaClear
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 dark:bg-emerald-600 text-white">
          <Lock className="h-5 w-5" />
        </div>

        <h1 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Private Debt Ledger
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          This workspace is gated for owner access only. Enter your passcode to
          view your loans and repayment plan.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="owner-passcode"
              className="block text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Owner Passcode
            </label>
            <div className="relative">
              <input
                id="owner-passcode"
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={isSubmitting}
                placeholder="Enter passcode"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-11 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none disabled:opacity-60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showPasscode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passcode.trim()}
            className="w-full rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Verifying..." : "Unlock Ledger"}
          </button>
        </form>
      </div>

      <div className="max-w-md w-full mx-auto pb-2 text-center text-xs text-slate-400 dark:text-slate-600">
        Single-owner access · Public registration disabled
      </div>
    </div>
  );
};
