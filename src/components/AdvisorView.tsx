import React, { useState } from "react";
import { Send, RefreshCw, AlertCircle, CheckCircle2, CalendarClock } from "lucide-react";
import {
  ChatMessage,
  ComputedLoan,
  RepaymentPlanResponse,
} from "../types/loan";
import { formatNaira, getTodayISO } from "../utils/nigerianLenders";

interface AdvisorViewProps {
  loans: ComputedLoan[];
  authToken: string;
  onSessionExpired: () => void;
  onAddLoan: () => void;
}

const STRATEGIES = [
  {
    id: "Balanced Nigerian Penalty Shield",
    label: "AI Penalty Shield (Recommended)",
    desc: "Stops high daily loan-app rollover fees first, then targets highest interest.",
  },
  {
    id: "Avalanche (Highest Interest Rate First)",
    label: "Avalanche (Highest Interest)",
    desc: "Minimizes total Naira interest paid across all facilities.",
  },
  {
    id: "Snowball (Smallest Balance First)",
    label: "Snowball (Smallest Debt)",
    desc: "Clears smaller balances quickly to free up monthly cash flow.",
  },
];

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  loans,
  authToken,
  onSessionExpired,
  onAddLoan,
}) => {
  const activeLoans = loans.filter((l) => l.remainingBalance > 0);
  const totalActiveDebt = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);

  const [monthlyBudget, setMonthlyBudget] = useState<string>("120000");
  const [paydayDay, setPaydayDay] = useState<string>("25");
  const [strategy, setStrategy] = useState<string>(STRATEGIES[0].id);

  const [plan, setPlan] = useState<RepaymentPlanResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planError, setPlanError] = useState("");

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState("");

  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeLoans.length === 0) return;

    const budgetNum = Number(monthlyBudget) || 0;
    if (budgetNum <= 0) {
      setPlanError("Enter a monthly repayment budget greater than ₦0.");
      return;
    }

    setIsGenerating(true);
    setPlanError("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch("/api/repayment-plan", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          loans: activeLoans,
          monthlyBudget: budgetNum,
          strategy,
          paydayDay: Number(paydayDay) || undefined,
          currentDate: getTodayISO(),
        }),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const rawBody = await response.text();
      let data: RepaymentPlanResponse & { error?: string } = {} as RepaymentPlanResponse & {
        error?: string;
      };
      try {
        data = rawBody ? JSON.parse(rawBody) : data;
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not generate repayment plan.");
      }

      setPlan(data);
    } catch (err: unknown) {
      setPlanError(
        err instanceof Error
          ? err.message
          : "Unable to reach the AI advisor right now."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setChatInput("");
    setIsSendingChat(true);
    setChatError("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch("/api/repayment-chat", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          question: trimmed,
          loans: activeLoans,
          monthlyBudget: Number(monthlyBudget) || undefined,
          currentDate: getTodayISO(),
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const rawBody = await response.text();
      let data: { error?: string; answer?: string } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to reach the AI advisor right now. Please try again."
        );
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.answer || "No response received.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const msg =
        err instanceof TypeError
          ? "Connection interrupted while contacting the AI advisor. Please try again."
          : err instanceof Error
          ? err.message
          : "Failed to get response from advisor.";
      setChatError(msg);
    } finally {
      setIsSendingChat(false);
    }
  };

  if (activeLoans.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600 dark:text-emerald-500" />
        <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
          No active debts to schedule
        </h2>
        <p className="mt-1 max-w-md mx-auto text-sm text-slate-500 dark:text-slate-400">
          Add at least one unpaid loan so the AI repayment advisor can build a
          prioritized Nigerian payoff schedule for you.
        </p>
        <button
          type="button"
          onClick={onAddLoan}
          className="mt-5 rounded-lg bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-emerald-700 whitespace-nowrap shrink-0"
        >
          Add Loan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <form
        onSubmit={handleGeneratePlan}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Repayment Planner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Powered by Gemini · Balances {activeLoans.length} active facilities
              totaling{" "}
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {formatNaira(totalActiveDebt)}
              </span>
            </p>
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span>
              {isGenerating
                ? "Building Plan..."
                : plan
                ? "Regenerate Plan"
                : "Generate Repayment Plan"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="advisor-budget"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Monthly Repayment Budget (₦)
            </label>
            <input
              id="advisor-budget"
              type="number"
              min="1000"
              step="any"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Total Naira you can put toward loans each month
            </p>
          </div>

          <div>
            <label
              htmlFor="advisor-payday"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Monthly Payday (Day of Month)
            </label>
            <input
              id="advisor-payday"
              type="number"
              min="1"
              max="31"
              value={paydayDay}
              onChange={(e) => setPaydayDay(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Used to align recommendations with salary or income
            </p>
          </div>

          <div>
            <label
              htmlFor="advisor-strategy"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Prioritization Strategy
            </label>
            <select
              id="advisor-strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {STRATEGIES.find((s) => s.id === strategy)?.desc}
            </p>
          </div>
        </div>

        {planError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{planError}</span>
          </div>
        )}
      </form>

      {/* Loading Skeleton */}
      {isGenerating && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      )}

      {/* Structured Plan Output */}
      {plan && !isGenerating && (
        <div className="space-y-6">
          {/* Executive Summary + Freedom Metric */}
          <div className="grid grid-cols-1 lg:grid-cols-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="lg:col-span-2 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Strategy Summary
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {plan.executiveSummary}
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {plan.budgetSufficiencyNote}
              </p>
            </div>
            <div className="p-6 flex flex-col justify-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Estimated Debt-Free Timeline
              </div>
              <div className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {plan.estimatedMonthsToFreedom}{" "}
                <span className="text-base font-normal text-slate-600 dark:text-slate-400">
                  {plan.estimatedMonthsToFreedom === 1 ? "month" : "months"}
                </span>
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                At {formatNaira(Number(monthlyBudget) || 0)} / month
              </div>
            </div>
          </div>

          {/* Priority Order Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                This Month&apos;s Recommended Priority Order
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allocate your monthly budget in this exact sequence to minimize penalties and interest
              </p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {(plan.priorityOrder || []).map((item) => (
                <div
                  key={`${item.rank}-${item.loanName}`}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.rank}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.loanName}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">·</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.lender}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">·</span>
                        <span
                          className={`text-xs font-medium ${
                            item.urgencyLevel === "Critical"
                              ? "text-red-700 dark:text-red-400"
                              : item.urgencyLevel === "High"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {item.urgencyLevel} priority
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl">
                        {item.rationale}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:block md:text-right shrink-0 pl-11 md:pl-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Pay this month
                    </div>
                    <div className="font-mono text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatNaira(item.recommendedThisMonthNGN)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                      of {formatNaira(item.remainingBalanceNGN)} owed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Roadmap & Nigerian Action Tips */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Month-by-Month Payoff Roadmap
                </h3>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {(plan.monthlyRoadmap || []).map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-4 px-5 py-3.5"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {step.monthLabel}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {step.focusAction}
                      </p>
                    </div>
                    <div className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                      {formatNaira(step.totalPaymentNGN)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Practical Nigerian Debt Management Tips
              </h3>
              <ul className="space-y-3">
                {(plan.nigerianActionTips || []).map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300"
                  >
                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0">
                      0{i + 1}.
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Follow-Up Advisor Chat */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Ask the Debt Advisor
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ask specific questions about restructuring FairMoney, handling PalmPay due dates, or splitting a partial payment.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {[
                "I only have ₦40,000 this week — which lender should I pay first?",
                "Should I use my cooperative loan to clear my loan apps?",
                "How do I avoid rollover fees if my salary is delayed by 5 days?",
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => setChatInput(promptText)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {promptText}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-slate-900 dark:bg-emerald-700 text-white"
                        : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {msg.role === "user" ? "You" : "Gemini Advisor"} · {msg.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}

          {chatError && (
            <div className="text-xs text-red-600 dark:text-red-400">{chatError}</div>
          )}

          <form onSubmit={handleAskQuestion} className="flex items-center gap-2.5 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isSendingChat}
              placeholder="Ask a follow-up question about your Nigerian loans..."
              className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500"
            />
            <button
              type="submit"
              disabled={isSendingChat || !chatInput.trim()}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
