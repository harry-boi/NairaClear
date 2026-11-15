import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Bell,
  Plus,
  Download,
  Trash2,
  Sun,
  Moon,
  Lock,
} from "lucide-react";
import {
  ActiveTab,
  ComputedLoan,
  Loan,
  NotificationSettings,
} from "./types/loan";
import {
  enrichLoan,
  formatNaira,
  formatReadableDate,
} from "./utils/nigerianLenders";
import { OverviewView } from "./components/OverviewView";
import { CalendarView } from "./components/CalendarView";
import { AdvisorView } from "./components/AdvisorView";
import { NotificationsView } from "./components/NotificationsView";
import { LoanModal } from "./components/LoanModal";
import { PaymentModal } from "./components/PaymentModal";
import { AuthGate } from "./components/AuthGate";
import {
  OfflineIndicator,
  PWAInstallBanner,
} from "./components/PWAInstallPrompt";

const LOANS_STORAGE_KEY = "nairaclear_loans_v2";
const NOTIF_STORAGE_KEY = "nairaclear_notif_v1";
const THEME_STORAGE_KEY = "nairaclear_theme_v1";
const AUTH_TOKEN_STORAGE_KEY = "nairaclear_auth_token";

function loadInitialLoans(): Loan[] {
  try {
    const saved = localStorage.getItem(LOANS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return [];
}

function loadInitialSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed?.leadDays === "number") {
        return {
          browserEnabled: Boolean(parsed.browserEnabled),
          leadDays: parsed.leadDays,
        };
      }
    }
  } catch {
    // Default settings
  }
  return { browserEnabled: false, leadDays: 7 };
}

function loadInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Default light
  }
  return "light";
}

function loadInitialAuthToken(): string {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export default function App() {
  const [authStatus, setAuthStatus] = useState<"checking" | "locked" | "unlocked">(
    "checking"
  );
  const [authToken, setAuthToken] = useState<string>(loadInitialAuthToken);

  const [loans, setLoans] = useState<Loan[]>(loadInitialLoans);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    loadInitialSettings
  );
  const [theme, setTheme] = useState<"light" | "dark">(loadInitialTheme);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [paymentTargetLoanId, setPaymentTargetLoanId] = useState<string | null>(
    null
  );

  const hasNotifiedThisSession = useRef(false);

  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const token = loadInitialAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch("/api/auth/status", {
          credentials: "include",
          headers,
        });
        const data = (await res.json()) as {
          authenticated?: boolean;
        };
        if (!active) return;

        if (data.authenticated) {
          setAuthStatus("unlocked");
        } else {
          try {
            sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          } catch {
            // Ignore storage errors
          }
          setAuthToken("");
          setAuthStatus("locked");
        }
      } catch {
        if (!active) return;
        setAuthStatus("locked");
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "dark" ? "#0b1120" : "#f8fafc");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    } catch {
      // Ignore storage quota errors
    }
  }, [loans]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifSettings));
    } catch {
      // Ignore storage quota errors
    }
  }, [notifSettings]);

  const computedLoans: ComputedLoan[] = useMemo(
    () => loans.map((l) => enrichLoan(l, notifSettings.leadDays)),
    [loans, notifSettings.leadDays]
  );

  const urgentCount = useMemo(
    () =>
      computedLoans.filter(
        (l) =>
          l.remainingBalance > 0 &&
          (l.status === "overdue" || l.status === "due-soon")
      ).length,
    [computedLoans]
  );

  const paymentTargetLoan = useMemo(
    () => computedLoans.find((l) => l.id === paymentTargetLoanId) || null,
    [computedLoans, paymentTargetLoanId]
  );

  useEffect(() => {
    if (hasNotifiedThisSession.current) return;
    if (!notifSettings.browserEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const urgent = computedLoans.filter(
      (l) =>
        l.remainingBalance > 0 &&
        (l.status === "overdue" || l.status === "due-soon")
    );

    if (urgent.length > 0) {
      hasNotifiedThisSession.current = true;
      const top = urgent[0];
      const msg =
        urgent.length === 1
          ? `${top.lender}: ${formatNaira(top.remainingBalance)} due ${formatReadableDate(
              top.dueDate
            )}.`
          : `${urgent.length} loans need attention. Earliest: ${top.lender} (${formatNaira(
              top.remainingBalance
            )}).`;
      new Notification("NairaClear Due Date Alert", { body: msg });
    }
  }, [computedLoans, notifSettings.browserEnabled]);

  const handleSaveLoan = (
    data: Omit<Loan, "id" | "createdAt" | "payments">,
    existingId?: string
  ) => {
    if (existingId) {
      setLoans((prev) =>
        prev.map((item) =>
          item.id === existingId ? { ...item, ...data } : item
        )
      );
    } else {
      const newLoan: Loan = {
        ...data,
        id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        payments: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setLoans((prev) => [newLoan, ...prev]);
    }
  };

  const handleDeleteLoan = (id: string) => {
    setLoans((prev) => prev.filter((l) => l.id !== id));
  };

  const handleRecordPayment = (
    loanId: string,
    amount: number,
    date: string,
    note: string
  ) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.id !== loanId) return loan;
        return {
          ...loan,
          payments: [
            ...loan.payments,
            {
              id: `pay-${Date.now()}`,
              amount,
              date,
              note: note || undefined,
            },
          ],
        };
      })
    );
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(loans, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nairaclear-loans-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    setLoans([]);
    setConfirmClearAll(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleUnlocked = (token: string) => {
    setAuthToken(token);
    try {
      if (token) {
        sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
    setAuthStatus("unlocked");
  };

  const handleSessionExpired = () => {
    setAuthToken("");
    try {
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setAuthStatus("locked");
  };

  const handleLockApp = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    }
    handleSessionExpired();
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
    { id: "calendar", label: "Repayment Dates", shortLabel: "Dates", icon: CalendarDays },
    { id: "advisor", label: "AI Repayment Plan", shortLabel: "AI Advisor", icon: Sparkles },
    {
      id: "notifications",
      label: "Due Alerts",
      shortLabel: "Alerts",
      icon: Bell,
      count: urgentCount > 0 ? urgentCount : undefined,
    },
  ];

  const activeTitle =
    navItems.find((n) => n.id === activeTab)?.label || "Overview";

  const openAddModal = () => {
    setEditingLoan(null);
    setLoanModalOpen(true);
  };

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-display text-lg font-bold tracking-tight">
            NairaClear
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Checking session...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "locked") {
    return (
      <>
        <AuthGate
          theme={theme}
          onToggleTheme={toggleTheme}
          onUnlocked={handleUnlocked}
        />
        <PWAInstallBanner hasBottomNav={false} />
        <OfflineIndicator hasBottomNav={false} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex h-16 items-center border-b border-slate-200 dark:border-slate-800 px-5">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            NairaClear
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-slate-900 dark:bg-emerald-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive
                        ? "text-amber-300"
                        : "text-amber-700 dark:text-amber-400 font-semibold"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
          >
            <span className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleLockApp}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Lock Ledger</span>
          </button>

          {loans.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>Export Ledger Backup</span>
              </button>
              {confirmClearAll ? (
                <div className="flex items-center gap-2 px-1 pt-1">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="flex-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Clear All Loans</span>
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-20 flex h-14 lg:h-16 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 lg:px-8 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:hidden whitespace-nowrap shrink-0">
              NairaClear
            </span>
            <span className="text-slate-300 dark:text-slate-700 lg:hidden" aria-hidden="true">
              /
            </span>
            <span className="text-slate-400 dark:text-slate-500 hidden lg:inline text-sm">
              Workspace
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden lg:inline" aria-hidden="true">
              /
            </span>
            <h1 className="font-display text-sm lg:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
              {activeTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Loan</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pt-5 pb-32 sm:px-6 lg:px-8 lg:py-6 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && (
            <OverviewView
              loans={computedLoans}
              onAddLoan={openAddModal}
              onEditLoan={(loan) => {
                setEditingLoan(loan);
                setLoanModalOpen(true);
              }}
              onDeleteLoan={handleDeleteLoan}
              onOpenPayment={(loan) => setPaymentTargetLoanId(loan.id)}
              onNavigateAdvisor={() => setActiveTab("advisor")}
              onNavigateNotifications={() => setActiveTab("notifications")}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              loans={computedLoans}
              onOpenPayment={(loan) => setPaymentTargetLoanId(loan.id)}
              onAddLoan={openAddModal}
            />
          )}

          {activeTab === "advisor" && (
            <AdvisorView
              loans={computedLoans}
              authToken={authToken}
              onSessionExpired={handleSessionExpired}
              onAddLoan={openAddModal}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsView
              loans={computedLoans}
              settings={notifSettings}
              theme={theme}
              onToggleTheme={toggleTheme}
              onLockApp={handleLockApp}
              onUpdateSettings={setNotifSettings}
              onOpenPayment={(loan) => setPaymentTargetLoanId(loan.id)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-30 flex min-h-[3.5rem] pb-[env(safe-area-inset-bottom)] items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md lg:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                isActive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4 shrink-0" />
                {item.count !== undefined && (
                  <span className="absolute -top-1 -right-2.5 font-mono text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {item.count}
                  </span>
                )}
              </div>
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Install App Banner & Connectivity Status */}
      <PWAInstallBanner hasBottomNav={true} />
      <OfflineIndicator hasBottomNav={true} />

      {/* Add / Edit Loan Bottom Sheet (mobile) / Modal (desktop) */}
      <LoanModal
        isOpen={loanModalOpen}
        editingLoan={editingLoan}
        onClose={() => {
          setLoanModalOpen(false);
          setEditingLoan(null);
        }}
        onSave={handleSaveLoan}
      />

      {/* Record Payment Bottom Sheet (mobile) / Modal (desktop) */}
      <PaymentModal
        loan={paymentTargetLoan}
        onClose={() => setPaymentTargetLoanId(null)}
        onRecordPayment={handleRecordPayment}
      />
    </div>
  );
}
