import React, { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { ComputedLoan } from "../types/loan";
import { formatNaira, formatReadableDate, getTodayISO } from "../utils/nigerianLenders";

interface PaymentModalProps {
  loan: ComputedLoan | null;
  onClose: () => void;
  onRecordPayment: (loanId: string, amount: number, date: string, note: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  loan,
  onClose,
  onRecordPayment,
}) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loan) {
      setAmount(String(loan.remainingBalance));
      setDate(getTodayISO());
      setNote("");
      setError("");
    }
  }, [loan]);

  if (!loan) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount) || 0;
    if (num <= 0) {
      setError("Enter a payment amount greater than ₦0.");
      return;
    }
    onRecordPayment(loan.id, num, date, note.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90dvh] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2
              id="payment-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Record Payment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loan.name} · {loan.lender}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label="Close payment dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Due</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatNaira(loan.totalDue)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Already Paid</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatNaira(loan.amountPaid)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Remaining</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatNaira(loan.remainingBalance)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pay-amount"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Payment Amount (₦)
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(String(loan.remainingBalance))}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Pay Full Balance
                </button>
              </div>
              <input
                id="pay-amount"
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label
                htmlFor="pay-date"
                className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Payment Date
              </label>
              <input
                id="pay-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="pay-note"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Payment Reference / Note (Optional)
            </label>
            <input
              id="pay-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Bank transfer via GTB mobile"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {loan.payments.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Previous Payments ({loan.payments.length})
              </h3>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {loan.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                      <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {formatReadableDate(p.date)}
                      </span>
                      {p.note && (
                        <span className="truncate text-slate-500 dark:text-slate-400">
                          · {p.note}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100 ml-3 shrink-0">
                      {formatNaira(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
