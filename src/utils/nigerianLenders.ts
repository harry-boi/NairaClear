import {
  ComputedLoan,
  DebtType,
  DurationUnit,
  InterestMode,
  Loan,
} from "../types/loan";

export const DEBT_TYPES: Array<{
  type: DebtType;
  shortDesc: string;
}> = [
  { type: "Loan App", shortDesc: "PalmPay, FairMoney, Carbon, Branch, OKash" },
  { type: "Bank Loan", shortDesc: "GTBank, Access, Zenith, UBA, Kuda" },
  { type: "Personal (Family/Friend)", shortDesc: "Friends, relatives, colleagues" },
  { type: "Cooperative", shortDesc: "Workplace cooperative, thrift, Ajo/Esusu" },
  { type: "Other", shortDesc: "BNPL, vendor credit, salary advance" },
];

export interface LenderPreset {
  name: string;
  typicalRate: number;
  interestMode: InterestMode;
  defaultDuration: number;
  defaultUnit: DurationUnit;
}

export const LENDER_PRESETS: Record<DebtType, LenderPreset[]> = {
  "Loan App": [
    { name: "PalmPay", typicalRate: 12, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "FairMoney", typicalRate: 10, interestMode: "flat", defaultDuration: 2, defaultUnit: "months" },
    { name: "Carbon", typicalRate: 9.5, interestMode: "flat", defaultDuration: 2, defaultUnit: "months" },
    { name: "Branch", typicalRate: 11, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "OKash (OPay)", typicalRate: 14, interestMode: "flat", defaultDuration: 14, defaultUnit: "days" },
    { name: "EaseMoni", typicalRate: 12, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Renmoney", typicalRate: 4.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "QuickCheck", typicalRate: 13, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Aella Credit", typicalRate: 8, interestMode: "flat", defaultDuration: 2, defaultUnit: "months" },
    { name: "Migo", typicalRate: 12, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Lidya", typicalRate: 5, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Kiakia", typicalRate: 10, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Sycamore", typicalRate: 5, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Page Financials", typicalRate: 4.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Rosabon Finance", typicalRate: 4.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Newcredit", typicalRate: 13, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "XCredit", typicalRate: 14, interestMode: "flat", defaultDuration: 14, defaultUnit: "days" },
    { name: "KwikMoney", typicalRate: 12, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
  ],
  "Bank Loan": [
    { name: "GTBank QuickCredit", typicalRate: 2.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Access Bank PayDay", typicalRate: 3, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Kuda Overdraft", typicalRate: 3, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Zenith Bank Loan", typicalRate: 2.2, interestMode: "flat", defaultDuration: 12, defaultUnit: "months" },
    { name: "UBA Personal Loan", typicalRate: 2.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "FirstBank FirstAdvance", typicalRate: 2.8, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Wema Bank (ALAT)", typicalRate: 3, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Stanbic IBTC EZ Cash", typicalRate: 2.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Fidelity Bank Loan", typicalRate: 2.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Sterling Bank (Specta)", typicalRate: 2.7, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "FCMB FastCash", typicalRate: 3, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Union Bank Loan", typicalRate: 2.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Polaris Bank (VULTe)", typicalRate: 2.8, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Ecobank Xpress Loan", typicalRate: 2.8, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Moniepoint MFB", typicalRate: 3.5, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "LAPO Microfinance", typicalRate: 4, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
  ],
  "Personal (Family/Friend)": [
    { name: "Family Member", typicalRate: 0, interestMode: "flat", defaultDuration: 2, defaultUnit: "months" },
    { name: "Close Friend", typicalRate: 0, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Colleague / Coworker", typicalRate: 0, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Landlord / Rent Deferral", typicalRate: 0, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Business Partner", typicalRate: 0, interestMode: "flat", defaultDuration: 2, defaultUnit: "months" },
  ],
  Cooperative: [
    { name: "Office Cooperative Society", typicalRate: 1.5, interestMode: "flat", defaultDuration: 6, defaultUnit: "months" },
    { name: "Thrift / Ajo / Esusu", typicalRate: 0, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Microfinance Cooperative", typicalRate: 3, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Trade / Market Union Coop", typicalRate: 2, interestMode: "flat", defaultDuration: 4, defaultUnit: "months" },
  ],
  Other: [
    { name: "CredPal (BNPL)", typicalRate: 4, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "PayQart (BNPL)", typicalRate: 4, interestMode: "flat", defaultDuration: 3, defaultUnit: "months" },
    { name: "Klump (BNPL)", typicalRate: 3.5, interestMode: "flat", defaultDuration: 4, defaultUnit: "months" },
    { name: "Employer Salary Advance", typicalRate: 0, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
    { name: "Supplier / Vendor Credit", typicalRate: 5, interestMode: "flat", defaultDuration: 1, defaultUnit: "months" },
  ],
};

export function formatNaira(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₦${Math.round(safe).toLocaleString("en-NG")}`;
}

export function formatNairaExact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₦${safe.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNairaDecimals(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₦${safe.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addOffsetDaysISO(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeDueDateFromDuration(
  startDateISO: string,
  durationValue: number,
  durationUnit: DurationUnit
): string {
  if (!startDateISO) return getTodayISO();
  const [y, m, d] = startDateISO.split("-").map(Number);
  if (!y || !m || !d) return startDateISO;
  const date = new Date(y, m - 1, d);
  const safeDuration = Math.max(1, Math.round(durationValue || 1));
  if (durationUnit === "days") {
    date.setDate(date.getDate() + safeDuration);
  } else {
    date.setMonth(date.getMonth() + safeDuration);
  }
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, "0");
  const rd = String(date.getDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

export function calculateInterestAmount(
  principal: number,
  interestRate: number,
  _interestMode?: InterestMode,
  _durationValue?: number,
  _durationUnit?: DurationUnit
): number {
  const p = Math.max(0, Number(principal) || 0);
  const r = Math.max(0, Number(interestRate) || 0);
  return Math.round(p * (r / 100));
}

export function getDaysUntilDue(dueDateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dueDateISO.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatReadableDate(dateISO: string): string {
  if (!dateISO) return "—";
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return dateISO;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function enrichLoan(loan: Loan, leadDays = 7): ComputedLoan {
  const interestAmount = calculateInterestAmount(
    loan.principal,
    loan.interestRate,
    loan.interestMode,
    loan.durationValue,
    loan.durationUnit
  );
  const totalDue = Math.max(0, loan.principal + interestAmount);
  const amountPaid = (loan.payments || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const remainingBalance = Math.max(0, totalDue - amountPaid);
  const daysUntilDue = getDaysUntilDue(loan.dueDate);

  let status: ComputedLoan["status"] = "on-track";
  if (remainingBalance <= 0) {
    status = "settled";
  } else if (daysUntilDue < 0) {
    status = "overdue";
  } else if (daysUntilDue <= leadDays) {
    status = "due-soon";
  }

  const progressPercent =
    totalDue > 0 ? Math.min(100, Math.round((amountPaid / totalDue) * 100)) : 100;

  return {
    ...loan,
    interestAmount,
    totalDue,
    amountPaid,
    remainingBalance,
    daysUntilDue,
    status,
    progressPercent,
  };
}

export function getStarterLoans(): Loan[] {
  return [
    {
      id: "starter-palmpay-1",
      debtType: "Loan App",
      name: "Emergency Utility & Data",
      lender: "PalmPay",
      principal: 55000,
      interestRate: 12,
      interestMode: "flat",
      durationValue: 1,
      durationUnit: "months",
      startDate: addOffsetDaysISO(-27),
      dueDate: addOffsetDaysISO(3),
      notes: "Auto-debit linked to PalmPay wallet. Avoid daily rollover penalty.",
      payments: [],
      createdAt: addOffsetDaysISO(-27),
    },
    {
      id: "starter-fairmoney-2",
      debtType: "Loan App",
      name: "Business Stock Top-Up",
      lender: "FairMoney",
      principal: 140000,
      interestRate: 10,
      interestMode: "flat",
      durationValue: 2,
      durationUnit: "months",
      startDate: addOffsetDaysISO(-32),
      dueDate: addOffsetDaysISO(28),
      notes: "Two-month FairMoney personal facility; first tranche partially cleared.",
      payments: [
        {
          id: "pay-init-1",
          amount: 50000,
          date: addOffsetDaysISO(-6),
          note: "First installment transfer",
        },
      ],
      createdAt: addOffsetDaysISO(-32),
    },
    {
      id: "starter-coop-3",
      debtType: "Cooperative",
      name: "Rent Balance Support",
      lender: "Office Cooperative Society",
      principal: 250000,
      interestRate: 1.5,
      interestMode: "flat",
      durationValue: 6,
      durationUnit: "months",
      startDate: addOffsetDaysISO(-60),
      dueDate: addOffsetDaysISO(120),
      notes: "Deducted gradually from monthly cooperative contribution.",
      payments: [
        {
          id: "pay-init-2",
          amount: 85000,
          date: addOffsetDaysISO(-15),
          note: "October salary deduction",
        },
      ],
      createdAt: addOffsetDaysISO(-60),
    },
  ];
}
