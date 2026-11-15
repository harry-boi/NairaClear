import React, { useState } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2, Sun, Moon, Lock } from "lucide-react";
import { ComputedLoan, NotificationSettings } from "../types/loan";
import { formatNaira, formatReadableDate } from "../utils/nigerianLenders";
import { PWAInstallSettingRow } from "./PWAInstallPrompt";

interface NotificationsViewProps {
  loans: ComputedLoan[];
  settings: NotificationSettings;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLockApp: () => void;
  onUpdateSettings: (next: NotificationSettings) => void;
  onOpenPayment: (loan: ComputedLoan) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  loans,
  settings,
  theme,
  onToggleTheme,
  onLockApp,
  onUpdateSettings,
  onOpenPayment,
}) => {
  const [testNoticeStatus, setTestNoticeStatus] = useState("");

  const activeLoans = loans.filter((l) => l.remainingBalance > 0);
  const overdueLoans = activeLoans
    .filter((l) => l.status === "overdue")
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const dueSoonLoans = activeLoans
    .filter((l) => l.status === "due-soon")
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const upcomingLater = activeLoans
    .filter((l) => l.status === "on-track")
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const browserSupported = typeof window !== "undefined" && "Notification" in window;
  const permissionState = browserSupported ? Notification.permission : "denied";

  const handleToggleBrowserNotifications = async () => {
    if (!browserSupported) {
      setTestNoticeStatus("Browser notifications are not supported in this browser.");
      return;
    }

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        onUpdateSettings({ ...settings, browserEnabled: true });
        setTestNoticeStatus("Browser due-date notifications enabled.");
      } else {
        onUpdateSettings({ ...settings, browserEnabled: false });
        setTestNoticeStatus("Notification permission was not granted.");
      }
      return;
    }

    if (Notification.permission === "granted") {
      const nextEnabled = !settings.browserEnabled;
      onUpdateSettings({ ...settings, browserEnabled: nextEnabled });
      setTestNoticeStatus(
        nextEnabled
          ? "Browser due-date notifications enabled."
          : "Browser due-date notifications paused."
      );
      return;
    }

    setTestNoticeStatus(
      "Notifications are blocked by your browser settings. Enable them in site permissions."
    );
  };

  const handleSendTestNotification = async () => {
    if (!browserSupported) {
      setTestNoticeStatus("Browser notifications are not supported here.");
      return;
    }
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") {
      setTestNoticeStatus("Please allow notifications in your browser first.");
      return;
    }

    const firstUrgent = overdueLoans[0] || dueSoonLoans[0] || activeLoans[0];
    const body = firstUrgent
      ? `${firstUrgent.lender} (${firstUrgent.name}): ${formatNaira(
          firstUrgent.remainingBalance
        )} due ${formatReadableDate(firstUrgent.dueDate)}.`
      : "Your NairaClear due-date reminders are working properly.";

    new Notification("NairaClear Due Date Reminder", { body });
    setTestNoticeStatus("Test reminder sent to your device notifications.");
  };

  return (
    <div className="space-y-6">
      {/* Preferences & Reminder Settings */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Due-Date Alerts &amp; Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stay ahead of PalmPay, FairMoney, and bank due dates before rollover penalties apply.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleBrowserNotifications}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.browserEnabled && permissionState === "granted"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>
                {settings.browserEnabled && permissionState === "granted"
                  ? "Browser Alerts Active"
                  : "Enable Browser Alerts"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="rounded-lg bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 whitespace-nowrap shrink-0"
            >
              Send Test Alert
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Early Warning Lead Time
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Flag loans as &quot;Due Soon&quot; and alert this many days before the due date
            </p>
          </div>
          <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
            {[3, 7, 14].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, leadDays: days })}
                className={`rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium text-center transition-colors whitespace-nowrap ${
                  settings.leadDays === days
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {/* Appearance / Dark Mode Toggle */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Appearance
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between light and dark theme
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-slate-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Security / Lock App */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Private Access
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lock the ledger so your owner passcode is required again
            </p>
          </div>
          <button
            type="button"
            onClick={onLockApp}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <Lock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            <span>Lock Ledger</span>
          </button>
        </div>

        <PWAInstallSettingRow />

        {testNoticeStatus && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300">
            {testNoticeStatus}
          </div>
        )}
      </div>

      {/* Overdue Alerts */}
      {overdueLoans.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-red-100 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/40 px-5 py-3.5">
            <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-400 shrink-0" />
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
              Overdue Loans ({overdueLoans.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {overdueLoans.map((loan) => (
              <div
                key={loan.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {loan.name} · {loan.lender}
                  </div>
                  <div className="mt-0.5 text-xs text-red-700 dark:text-red-400 font-medium">
                    Overdue by {Math.abs(loan.daysUntilDue)}{" "}
                    {Math.abs(loan.daysUntilDue) === 1 ? "day" : "days"} · Was due{" "}
                    {formatReadableDate(loan.dueDate)}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatNaira(loan.remainingBalance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenPayment(loan)}
                    className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due Soon Alerts */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 px-5 py-3.5">
          <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Due Within {settings.leadDays} Days ({dueSoonLoans.length})
          </h3>
        </div>
        {dueSoonLoans.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No loans are due within the next {settings.leadDays} days.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {dueSoonLoans.map((loan) => (
              <div
                key={loan.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {loan.name} · {loan.lender}
                  </div>
                  <div className="mt-0.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {loan.daysUntilDue === 0
                      ? "Due today"
                      : `Due in ${loan.daysUntilDue} ${
                          loan.daysUntilDue === 1 ? "day" : "days"
                        }`}{" "}
                    · {formatReadableDate(loan.dueDate)}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatNaira(loan.remainingBalance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenPayment(loan)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    Record Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Later */}
      {upcomingLater.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              On-Track Later Dates ({upcomingLater.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {upcomingLater.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between px-5 py-3.5 text-xs"
              >
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {loan.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {" "}
                    · {loan.lender} · Due {formatReadableDate(loan.dueDate)} (
                    {loan.daysUntilDue} days left)
                  </span>
                </div>
                <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {formatNaira(loan.remainingBalance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
