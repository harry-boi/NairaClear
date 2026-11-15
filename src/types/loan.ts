export type DebtType =
  | "Loan App"
  | "Bank Loan"
  | "Personal (Family/Friend)"
  | "Cooperative"
  | "Other";

export type InterestMode = "monthly" | "flat";

export type DurationUnit = "days" | "months";

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface Loan {
  id: string;
  debtType: DebtType;
  name: string;
  lender: string;
  principal: number;
  interestRate: number; // percentage number e.g. 12 means 12%
  interestMode: InterestMode;
  durationValue: number;
  durationUnit: DurationUnit;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  notes: string;
  payments: PaymentRecord[];
  createdAt: string;
}

export interface ComputedLoan extends Loan {
  interestAmount: number;
  totalDue: number;
  amountPaid: number;
  remainingBalance: number;
  daysUntilDue: number; // negative means overdue
  status: "settled" | "overdue" | "due-soon" | "on-track";
  progressPercent: number;
}

export interface NotificationSettings {
  browserEnabled: boolean;
  leadDays: number; // e.g. 3, 7, 14
}

export interface PriorityLoanPlan {
  rank: number;
  loanName: string;
  lender: string;
  remainingBalanceNGN: number;
  recommendedThisMonthNGN: number;
  urgencyLevel: "Critical" | "High" | "Medium" | "Low" | string;
  rationale: string;
}

export interface MonthlyRoadmapItem {
  monthLabel: string;
  focusAction: string;
  totalPaymentNGN: number;
}

export interface RepaymentPlanResponse {
  executiveSummary: string;
  estimatedMonthsToFreedom: number;
  budgetSufficiencyNote: string;
  priorityOrder: PriorityLoanPlan[];
  monthlyRoadmap: MonthlyRoadmapItem[];
  nigerianActionTips: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export type ActiveTab = "overview" | "calendar" | "advisor" | "notifications";
