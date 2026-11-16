import React, { useMemo } from "react";
import { Calendar as CalendarIcon, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { ComputedLoan } from "../types/loan";
import { formatNaira, formatReadableDate } from "../utils/nigerianLenders";

interface CalendarViewProps {
  loans: ComputedLoan[];
  onOpenPayment: (loan: ComputedLoan) => void;
  onAddLoan: () => void;
}

interface CalendarEntry {
  key: string;
  loan: ComputedLoan;
  titleSuffix: string;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  amount: number; // amount still owed for this entry
  detailLine: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  loans,
  onOpenPayment,
  onAddLoan,
}) => {
  const groupedByMonth = useMemo(() => {
    const entries: CalendarEntry[] = [];

    for (const loan of loans) {
      if (loan.remainingBalance <= 0) continue;
      if (loan.hasTerms) {
        // One calendar entry per unpaid term, so each term's own due date
        // and amount shows in its own month.
        for (const term of loan.installmentSchedule) {
          if (term.remainingAmount <= 0) continue;
          entries.push({
            key: `${loan.id}-${term.id}`,
            loan,
            titleSuffix: ` · Term ${term.index + 1} of ${loan.installmentSchedule.length}`,
            dueDate: term.dueDate,
            daysUntilDue: term.daysUntilDue,
            isOverdue: term.status === "overdue",
            isDueSoon: term.status === "due-soon",
            amount: term.remainingAmount,
            detailLine:
              term.paidAmount > 0
                ? `${formatNaira(term.paidAmount)} already paid towards this term`
                : `Full term: ${formatNaira(term.amount)}`,
          });
        }
      } else {
        entries.push({
          key: loan.id,
          loan,
          titleSuffix: "",
          dueDate: loan.dueDate,
          daysUntilDue: loan.daysUntilDue,
          isOverdue: loan.status === "overdue",
          isDueSoon: loan.status === "due-soon",
          amount: loan.remainingBalance,
          detailLine: `Includes ${formatNaira(loan.interestAmount)} interest`,
        });
      }
    }

    entries.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const groups = new Map<string, { label: string; entries: CalendarEntry[]; monthTotal: number }>();

    for (const entry of entries) {
      const [y, m] = entry.dueDate.split("-").map(Number);
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const label =
        y && m
          ? new Date(y, m - 1, 1).toLocaleDateString("en-NG", {
              month: "long",
              year: "numeric",
            })
          : "Scheduled";

      const existing = groups.get(key) || { label, entries: [], monthTotal: 0 };
      existing.entries.push(entry);
      existing.monthTotal += entry.amount;
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, val]) => ({
      key,
      ...val,
    }));
  }, [loans]);

  const settledLoans = useMemo(
    () => loans.filter((l) => l.remainingBalance <= 0),
    [loans]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Repayment Dates &amp; Monthly Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chronological view of upcoming due dates and monthly cash-flow obligations.
          </p>
        </div>
      </div>

      {groupedByMonth.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
          <CalendarIcon className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            No upcoming due dates
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All recorded loans are settled, or you haven&apos;t added an active loan yet.
          </p>
          <button
            type="button"
            onClick={onAddLoan}
            className="mt-5 rounded-lg bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-emerald-700 whitespace-nowrap shrink-0"
          >
            Add Loan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByMonth.map((group) => (
            <div
              key={group.key}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {group.label}
                </h3>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                  Month total:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatNaira(group.monthTotal)}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {group.entries.map((entry) => {
                  const loan = entry.loan;
                  return (
                    <div
                      key={entry.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-24 shrink-0">
                          <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {formatReadableDate(entry.dueDate)}
                          </div>
                          <div className="mt-1">
                            {entry.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>{Math.abs(entry.daysUntilDue)}d late</span>
                              </span>
                            ) : entry.isDueSoon ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  {entry.daysUntilDue === 0
                                    ? "Today"
                                    : `In ${entry.daysUntilDue}d`}
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                In {entry.daysUntilDue}d
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {loan.name}
                            {entry.titleSuffix}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {loan.lender} · {loan.debtType} · Borrowed{" "}
                            {formatReadableDate(loan.startDate)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {formatNaira(entry.amount)}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                            {entry.detailLine}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenPayment(loan)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                        >
                          Record Pay
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {settledLoans.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 px-5 py-3">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Settled Loans ({settledLoans.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {settledLoans.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between px-5 py-3 text-xs text-slate-500 dark:text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {loan.name}
                  </span>
                  <span>· {loan.lender}</span>
                </div>
                <span className="font-mono tabular-nums">
                  {formatNaira(loan.totalDue)} paid
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
