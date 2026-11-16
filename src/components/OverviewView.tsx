import React, { useMemo, useState } from "react";
import {
  Bell,
  Wallet,
  TrendingDown,
  Percent,
  CheckCircle2,
  Search,
  Plus,
  PlusCircle,
  Pencil,
  Trash2,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { ComputedLoan, DebtType } from "../types/loan";
import {
  formatNaira,
  formatNairaDecimals,
  formatReadableDate,
} from "../utils/nigerianLenders";

interface OverviewViewProps {
  loans: ComputedLoan[];
  onAddLoan: () => void;
  onEditLoan: (loan: ComputedLoan) => void;
  onDeleteLoan: (id: string) => void;
  onOpenPayment: (loan: ComputedLoan) => void;
  onNavigateAdvisor: () => void;
  onNavigateNotifications: () => void;
}

type StatusFilter = "all" | "active" | "due-soon" | "overdue" | "settled";
type SortBy = "due-date" | "balance" | "interest";

export const OverviewView: React.FC<OverviewViewProps> = ({
  loans,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onOpenPayment,
  onNavigateAdvisor,
  onNavigateNotifications,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<DebtType | "All">("All");
  const [sortBy, setSortBy] = useState<SortBy>("due-date");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const activeLoans = loans.filter((l) => l.remainingBalance > 0);
    const stillOwed = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);
    const totalBorrowed = loans.reduce((s, l) => s + l.principal, 0);
    const totalRepaid = loans.reduce((s, l) => s + l.amountPaid, 0);
    const totalRepayable = loans.reduce((s, l) => s + l.totalDue, 0);

    const totalInterestAmount = loans.reduce((s, l) => s + l.interestAmount, 0);
    const avgInterest =
      totalBorrowed > 0 ? (totalInterestAmount / totalBorrowed) * 100 : 0;

    const overdueCount = activeLoans.filter((l) => l.status === "overdue").length;
    const dueSoonCount = activeLoans.filter((l) => l.status === "due-soon").length;
    const urgentCount = overdueCount + dueSoonCount;

    const nextUrgent = [...activeLoans].sort(
      (a, b) => a.daysUntilDue - b.daysUntilDue
    )[0];

    const repaidPct =
      totalRepayable > 0
        ? Math.min(100, Math.round((totalRepaid / totalRepayable) * 100))
        : 0;

    return {
      activeCount: activeLoans.length,
      totalCount: loans.length,
      stillOwed,
      totalBorrowed,
      avgInterest,
      totalRepaid,
      repaidPct,
      overdueCount,
      dueSoonCount,
      urgentCount,
      nextUrgent,
    };
  }, [loans]);

  const breakdownByType = useMemo(() => {
    const activeLoans = loans.filter((l) => l.remainingBalance > 0);
    const total = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);
    const map = new Map<DebtType, { amount: number; count: number }>();

    for (const loan of activeLoans) {
      const prev = map.get(loan.debtType) || { amount: 0, count: 0 };
      map.set(loan.debtType, {
        amount: prev.amount + loan.remainingBalance,
        count: prev.count + 1,
      });
    }

    return Array.from(map.entries())
      .map(([type, data]) => ({
        type,
        amount: data.amount,
        count: data.count,
        share: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [loans]);

  const filteredLoans = useMemo(() => {
    return loans
      .filter((loan) => {
        if (statusFilter === "active" && loan.status === "settled") return false;
        if (statusFilter === "due-soon" && loan.status !== "due-soon") return false;
        if (statusFilter === "overdue" && loan.status !== "overdue") return false;
        if (statusFilter === "settled" && loan.status !== "settled") return false;
        if (typeFilter !== "All" && loan.debtType !== typeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            loan.name.toLowerCase().includes(q) ||
            loan.lender.toLowerCase().includes(q) ||
            loan.debtType.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === "settled" && b.status !== "settled") return 1;
        if (a.status !== "settled" && b.status === "settled") return -1;

        if (sortBy === "balance") {
          return b.remainingBalance - a.remainingBalance;
        }
        if (sortBy === "interest") {
          const aPct = a.principal > 0 ? a.interestAmount / a.principal : 0;
          const bPct = b.principal > 0 ? b.interestAmount / b.principal : 0;
          return bPct - aPct;
        }
        return a.daysUntilDue - b.daysUntilDue;
      });
  }, [loans, statusFilter, typeFilter, sortBy, searchQuery]);

  const getStatusMeta = (loan: ComputedLoan) => {
    if (loan.status === "settled") {
      return {
        label: "Settled",
        labelColor: "text-emerald-700 dark:text-emerald-400",
        dueText: "Paid in full",
        stripBg:
          "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300",
      };
    }
    if (loan.status === "overdue") {
      const d = Math.abs(loan.daysUntilDue);
      return {
        label: "Overdue",
        labelColor: "text-red-700 dark:text-red-400",
        dueText: `Overdue by ${d} ${d === 1 ? "day" : "days"}`,
        stripBg:
          "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300",
      };
    }
    if (loan.status === "due-soon") {
      return {
        label: "Due Soon",
        labelColor: "text-amber-700 dark:text-amber-400",
        dueText:
          loan.daysUntilDue === 0
            ? "Due today"
            : `Due in ${loan.daysUntilDue} ${
                loan.daysUntilDue === 1 ? "day" : "days"
              }`,
        stripBg:
          "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300",
      };
    }
    return {
      label: "Upcoming",
      labelColor: "text-blue-700 dark:text-blue-400",
      dueText: `Due in ${loan.daysUntilDue} ${
        loan.daysUntilDue === 1 ? "day" : "days"
      }`,
      stripBg:
        "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    };
  };

  return (
    <div className="space-y-5">
      {/* Urgent Alerts Banner */}
      {metrics.urgentCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <Bell className="h-4 w-4" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-amber-950 dark:text-amber-200 truncate">
              {metrics.urgentCount}{" "}
              {metrics.urgentCount === 1 ? "alert" : "alerts"} —{" "}
              {metrics.overdueCount} overdue, {metrics.dueSoonCount} due soon
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateNotifications}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 transition-colors hover:bg-amber-100/80 dark:hover:bg-amber-900/50 whitespace-nowrap shrink-0"
          >
            Show
          </button>
        </div>
      )}

      {/* iOS-Smooth 2x2 / 4-Column Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Still Owed
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-lg sm:text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {formatNairaDecimals(metrics.stillOwed)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {metrics.activeCount} active{" "}
            {metrics.activeCount === 1 ? "loan" : "loans"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Borrowed
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-700 text-white">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-lg sm:text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {formatNairaDecimals(metrics.totalBorrowed)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Across {metrics.totalCount}{" "}
            {metrics.totalCount === 1 ? "facility" : "facilities"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Avg Interest
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-lg sm:text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            {metrics.avgInterest.toFixed(1)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Weighted cost on principal
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Repaid
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-lg sm:text-2xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400 truncate">
            {formatNairaDecimals(metrics.totalRepaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {metrics.repaidPct}% of total cleared
          </div>
        </div>
      </div>

      {/* Next Due Highlight Strip */}
      {metrics.nextUrgent && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
            <CalendarClock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span>
              <span className="font-semibold">{metrics.nextUrgent.name}</span>{" "}
              {metrics.nextUrgent.daysUntilDue < 0
                ? `is overdue by ${Math.abs(metrics.nextUrgent.daysUntilDue)} ${
                    Math.abs(metrics.nextUrgent.daysUntilDue) === 1
                      ? "day"
                      : "days"
                  }`
                : metrics.nextUrgent.daysUntilDue === 0
                ? "is due today"
                : `is due in ${metrics.nextUrgent.daysUntilDue} ${
                    metrics.nextUrgent.daysUntilDue === 1 ? "day" : "days"
                  }`}
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateAdvisor}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-slate-900 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Get AI Payoff Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sort, Filter & Search Controls */}
      {loans.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 shrink-0">
                Sort:
              </span>
              {(
                [
                  { id: "due-date", label: "Due Date" },
                  { id: "balance", label: "Balance" },
                  { id: "interest", label: "Interest" },
                ] as Array<{ id: SortBy; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    sortBy === opt.id
                      ? "bg-slate-900 dark:bg-emerald-600 text-white"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search loans..."
                  className="w-full sm:w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <select
                aria-label="Filter by debt type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DebtType | "All")}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:border-emerald-600 focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="Loan App">Loan App</option>
                <option value="Bank Loan">Bank Loan</option>
                <option value="Personal (Family/Friend)">Family / Friend</option>
                <option value="Cooperative">Cooperative</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/90 dark:bg-slate-800/80 p-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "due-soon", label: "Due Soon" },
                { id: "overdue", label: "Overdue" },
                { id: "settled", label: "Settled" },
              ] as Array<{ id: StatusFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loan Cards Grid or Empty State */}
      {loans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <Wallet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            No loans tracked yet
          </h2>
          <p className="mt-1.5 max-w-md mx-auto text-sm text-slate-500 dark:text-slate-400">
            Tap Add Loan to record your PalmPay, FairMoney, bank, cooperative, or
            personal debts and start tracking balances and due dates.
          </p>
          <button
            type="button"
            onClick={onAddLoan}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Loan</span>
          </button>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No loans match your current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLoans.map((loan) => {
            const meta = getStatusMeta(loan);
            const effectivePct =
              loan.principal > 0
                ? Math.round((loan.interestAmount / loan.principal) * 100)
                : 0;
            const paymentCount = loan.payments.length;

            return (
              <article
                key={loan.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {loan.name}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{loan.lender}</span>
                        <span aria-hidden="true">·</span>
                        <span>{loan.debtType}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-medium ${meta.labelColor}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditLoan(loan)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                        aria-label={`Edit ${loan.name}`}
                        title="Edit loan"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {confirmDeleteId === loan.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteLoan(loan.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(loan.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
                          aria-label={`Delete ${loan.name}`}
                          title="Delete loan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
                      You still owe
                    </div>
                    <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                      {formatNairaDecimals(loan.remainingBalance)}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 px-3.5 py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Borrowed
                      </span>
                      <span className="font-mono font-medium tabular-nums text-slate-800 dark:text-slate-200">
                        {formatNairaDecimals(loan.principal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Interest ({effectivePct}%)
                      </span>
                      <span className="font-mono font-medium tabular-nums text-slate-800 dark:text-slate-200">
                        {formatNairaDecimals(loan.interestAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-700/80 pt-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Total to Repay
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatNairaDecimals(loan.totalDue)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="font-mono tabular-nums">
                        {formatNairaDecimals(loan.amountPaid)} repaid
                      </span>
                      <span className="font-mono tabular-nums">
                        {loan.progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                        style={{ width: `${loan.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div
                    className={`mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium ${meta.stripBg}`}
                  >
                    <span>{meta.dueText}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {formatReadableDate(loan.dueDate)}
                    </span>
                  </div>

                  {loan.hasTerms && (
                    <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {loan.nextInstallment ? (
                        <>
                          Term {loan.nextInstallment.index + 1} of{" "}
                          {loan.installmentSchedule.length} ·{" "}
                          <span className="font-mono tabular-nums">
                            {formatNairaDecimals(
                              loan.nextInstallment.remainingAmount
                            )}
                          </span>{" "}
                          this term
                          {loan.installmentSchedule.some(
                            (t) => t.status === "paid"
                          ) &&
                            ` · ${
                              loan.installmentSchedule.filter(
                                (t) => t.status === "paid"
                              ).length
                            } cleared`}
                        </>
                      ) : (
                        <>All {loan.installmentSchedule.length} terms cleared</>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3.5 text-xs">
                  <div className="text-slate-500 dark:text-slate-400 truncate">
                    <span className="font-mono tabular-nums">
                      {paymentCount} {paymentCount === 1 ? "payment" : "payments"}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono tabular-nums">
                      {formatNairaDecimals(loan.amountPaid)} repaid
                    </span>
                  </div>

                  {loan.remainingBalance > 0 ? (
                    <button
                      type="button"
                      onClick={() => onOpenPayment(loan)}
                      className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-400 transition-colors hover:text-teal-800 dark:hover:text-teal-300 whitespace-nowrap shrink-0"
                    >
                      <PlusCircle className="h-4 w-4 shrink-0" />
                      <span>Log Payment</span>
                    </button>
                  ) : (
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                      Cleared
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Active Debt Breakdown by Category */}
      {breakdownByType.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active Debt by Category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share of remaining Naira balance across your Nigerian debt sources
            </p>
          </div>

          <div className="space-y-3.5">
            {breakdownByType.map((row) => (
              <div key={row.type}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {row.type}{" "}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      · {row.count} {row.count === 1 ? "facility" : "facilities"}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatNaira(row.amount)} ({row.share}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-slate-900 dark:bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${row.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
