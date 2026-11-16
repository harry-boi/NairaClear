import React, { useEffect, useState } from "react";
import { X, Calculator } from "lucide-react";
import {
  DebtType,
  DurationUnit,
  InterestMode,
  Loan,
} from "../types/loan";
import {
  DEBT_TYPES,
  LENDER_PRESETS,
  calculateInterestAmount,
  computeDueDateFromDuration,
  formatNaira,
  getTodayISO,
} from "../utils/nigerianLenders";

interface LoanModalProps {
  isOpen: boolean;
  editingLoan: Loan | null;
  onClose: () => void;
  onSave: (loanData: Omit<Loan, "id" | "createdAt" | "payments">, existingId?: string) => void;
}

const CUSTOM_LENDER_VALUE = "__custom__";

const SHORT_DEBT_LABELS: Record<DebtType, string> = {
  "Loan App": "Loan App",
  "Bank Loan": "Bank Loan",
  "Personal (Family/Friend)": "Family / Friend",
  Cooperative: "Cooperative",
  Other: "Other",
};

const ALL_LENDER_NAMES = new Set(
  Object.values(LENDER_PRESETS)
    .flat()
    .map((p) => p.name)
);

export const LoanModal: React.FC<LoanModalProps> = ({
  isOpen,
  editingLoan,
  onClose,
  onSave,
}) => {
  const [debtType, setDebtType] = useState<DebtType>("Loan App");
  const [name, setName] = useState("");
  const [selectedLenderOption, setSelectedLenderOption] = useState<string>("PalmPay");
  const [customLender, setCustomLender] = useState("");
  const [principal, setPrincipal] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("12");
  const [interestMode, setInterestMode] = useState<InterestMode>("flat");
  const [durationValue, setDurationValue] = useState<string>("1");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("months");
  const [startDate, setStartDate] = useState<string>(getTodayISO());
  const [dueDate, setDueDate] = useState<string>(
    computeDueDateFromDuration(getTodayISO(), 1, "months")
  );
  const [dueDateManuallyEdited, setDueDateManuallyEdited] = useState(false);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFormError("");
    if (editingLoan) {
      setDebtType(editingLoan.debtType);
      setName(editingLoan.name);
      if (ALL_LENDER_NAMES.has(editingLoan.lender)) {
        setSelectedLenderOption(editingLoan.lender);
        setCustomLender("");
      } else {
        setSelectedLenderOption(CUSTOM_LENDER_VALUE);
        setCustomLender(editingLoan.lender);
      }
      setPrincipal(String(editingLoan.principal));
      setInterestRate(String(editingLoan.interestRate));
      setInterestMode("flat");
      setDurationValue(String(editingLoan.durationValue));
      setDurationUnit(editingLoan.durationUnit);
      setStartDate(editingLoan.startDate);
      setDueDate(editingLoan.dueDate);
      setDueDateManuallyEdited(true);
      setNotes(editingLoan.notes || "");
    } else {
      const today = getTodayISO();
      setDebtType("Loan App");
      setName("");
      setSelectedLenderOption("PalmPay");
      setCustomLender("");
      setPrincipal("");
      setInterestRate("12");
      setInterestMode("flat");
      setDurationValue("1");
      setDurationUnit("months");
      setStartDate(today);
      setDueDate(computeDueDateFromDuration(today, 1, "months"));
      setDueDateManuallyEdited(false);
      setNotes("");
    }
  }, [isOpen, editingLoan]);

  useEffect(() => {
    if (!dueDateManuallyEdited) {
      const dur = Math.max(1, Number(durationValue) || 1);
      setDueDate(computeDueDateFromDuration(startDate, dur, durationUnit));
    }
  }, [startDate, durationValue, durationUnit, dueDateManuallyEdited]);

  if (!isOpen) return null;

  const numericPrincipal = Math.max(0, Number(principal) || 0);
  const numericRate = Math.max(0, Number(interestRate) || 0);
  const numericDuration = Math.max(1, Number(durationValue) || 1);

  const calculatedInterest = calculateInterestAmount(
    numericPrincipal,
    numericRate,
    interestMode,
    numericDuration,
    durationUnit
  );
  const totalRepayment = numericPrincipal + calculatedInterest;

  const orderedCategories: DebtType[] = [
    debtType,
    ...DEBT_TYPES.map((d) => d.type).filter((t) => t !== debtType),
  ];

  const handleSelectDebtType = (nextType: DebtType) => {
    setDebtType(nextType);
    if (!editingLoan) {
      const firstPreset = LENDER_PRESETS[nextType]?.[0];
      if (firstPreset) {
        setSelectedLenderOption(firstPreset.name);
        setCustomLender("");
        setInterestRate(String(firstPreset.typicalRate));
        setInterestMode(firstPreset.interestMode);
        setDurationValue(String(firstPreset.defaultDuration));
        setDurationUnit(firstPreset.defaultUnit);
        setDueDateManuallyEdited(false);
      }
    }
  };

  const handleLenderDropdownChange = (value: string) => {
    setSelectedLenderOption(value);
    if (value === CUSTOM_LENDER_VALUE) return;

    const allPresets = Object.values(LENDER_PRESETS).flat();
    const found = allPresets.find((p) => p.name === value);
    if (found && !editingLoan) {
      setInterestRate(String(found.typicalRate));
      setInterestMode(found.interestMode);
      setDurationValue(String(found.defaultDuration));
      setDurationUnit(found.defaultUnit);
      setDueDateManuallyEdited(false);
    }
  };

  const handleQuickDuration = (val: number, unit: DurationUnit) => {
    setDurationValue(String(val));
    setDurationUnit(unit);
    setDueDateManuallyEdited(false);
  };

  const resolvedLender =
    selectedLenderOption === CUSTOM_LENDER_VALUE
      ? customLender.trim()
      : selectedLenderOption;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedLender) {
      setFormError("Please select or enter the lender.");
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter a name for this loan.");
      return;
    }
    if (numericPrincipal <= 0) {
      setFormError("Please enter an amount borrowed greater than ₦0.");
      return;
    }
    if (!dueDate) {
      setFormError("Please select a due date.");
      return;
    }

    onSave(
      {
        debtType,
        name: name.trim(),
        lender: resolvedLender,
        principal: numericPrincipal,
        interestRate: numericRate,
        interestMode,
        durationValue: numericDuration,
        durationUnit,
        startDate,
        dueDate,
        notes: notes.trim(),
      },
      editingLoan?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loan-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Mobile Bottom Sheet Grabber */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 sm:px-6 py-3.5 sm:py-4">
          <div>
            <h2
              id="loan-modal-title"
              className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100"
            >
              {editingLoan ? "Edit Loan Record" : "Add New Debt"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Interest and total repayment calculate live as you type.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm sm:text-base text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            {/* 1. What type of debt is this? — 2 columns on mobile */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 mb-2">
                What type of debt is this?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEBT_TYPES.map((item) => {
                  const selected = debtType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleSelectDebtType(item.type)}
                      className={`flex min-h-[42px] items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                        selected
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-slate-900 dark:text-emerald-200"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-sm sm:text-base font-medium truncate">
                        {SHORT_DEBT_LABELS[item.type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Debt Name & Lender Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="loan-name"
                  className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
                >
                  Debt Name
                </label>
                <input
                  id="loan-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., PalmPay Loan"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="loan-lender-select"
                  className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
                >
                  Lender
                </label>
                <select
                  id="loan-lender-select"
                  value={selectedLenderOption}
                  onChange={(e) => handleLenderDropdownChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-base text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                >
                  {orderedCategories.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {(LENDER_PRESETS[cat] || []).map((preset) => (
                        <option key={preset.name} value={preset.name}>
                          {preset.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Custom">
                    <option value={CUSTOM_LENDER_VALUE}>
                      Other / Enter Custom Lender Name
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            {selectedLenderOption === CUSTOM_LENDER_VALUE && (
              <div>
                <label
                  htmlFor="loan-custom-lender"
                  className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
                >
                  Custom Lender or Person Name
                </label>
                <input
                  id="loan-custom-lender"
                  type="text"
                  value={customLender}
                  onChange={(e) => setCustomLender(e.target.value)}
                  placeholder="e.g., Uncle Tunde, Shop Landlord, Local Ajo"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>
            )}

            {/* 3. Amount Borrowed & Interest */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="loan-principal"
                  className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
                >
                  Amount Borrowed (₦)
                </label>
                <input
                  id="loan-principal"
                  type="number"
                  min="1"
                  step="any"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="35000"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-mono text-base tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="loan-interest"
                  className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
                >
                  Interest (%)
                </label>
                <div className="relative">
                  <input
                    id="loan-interest"
                    type="number"
                    min="0"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="42"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-9 py-2.5 font-mono text-base tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-base text-slate-400 dark:text-slate-500">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Immediate Live Calculation Label underneath Amount & Interest */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/40 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mb-1.5">
                <Calculator className="h-3.5 w-3.5 shrink-0" />
                <span>Live Repayment Calculation</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm text-slate-600 dark:text-slate-400">
                    Interest amount
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatNaira(calculatedInterest)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-slate-600 dark:text-slate-400">
                    Total to repay
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                    {formatNaira(totalRepayment)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. How Long (Duration) & Dates */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="loan-duration"
                  className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200"
                >
                  How Long
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Sets due date &amp; AI Advisor tenure
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  id="loan-duration"
                  type="number"
                  min="1"
                  value={durationValue}
                  onChange={(e) => {
                    setDurationValue(e.target.value);
                    setDueDateManuallyEdited(false);
                  }}
                  className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 font-mono text-base tabular-nums text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                  required
                />
                <select
                  aria-label="Duration unit"
                  value={durationUnit}
                  onChange={(e) => {
                    setDurationUnit(e.target.value as DurationUnit);
                    setDueDateManuallyEdited(false);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                </select>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[
                  { label: "14 days", v: 14, u: "days" as DurationUnit },
                  { label: "1 month", v: 1, u: "months" as DurationUnit },
                  { label: "2 months", v: 2, u: "months" as DurationUnit },
                  { label: "3 months", v: 3, u: "months" as DurationUnit },
                  { label: "6 months", v: 6, u: "months" as DurationUnit },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleQuickDuration(opt.v, opt.u)}
                    className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-sm text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="loan-start-date"
                  className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
                >
                  Date Borrowed
                </label>
                <input
                  id="loan-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 font-mono text-sm sm:text-base text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="loan-due-date"
                    className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200"
                  >
                    Due Date
                  </label>
                  {dueDateManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => setDueDateManuallyEdited(false)}
                      className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Auto-sync
                    </button>
                  )}
                </div>
                <input
                  id="loan-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setDueDateManuallyEdited(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 font-mono text-sm sm:text-base text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* 6. Optional Notes */}
            <div>
              <label
                htmlFor="loan-notes"
                className="block text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mb-1"
              >
                Optional Notes
              </label>
              <textarea
                id="loan-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Repayment account, rollover warning, guarantor info, etc."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Sticky Bottom Sheet Action Bar */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 sm:px-6 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-3.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-base font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none rounded-lg bg-slate-900 dark:bg-emerald-600 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 whitespace-nowrap shrink-0"
            >
              {editingLoan ? "Save Changes" : "Save Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
