import express from "express";
import type { NextFunction, Request, Response } from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SESSION_COOKIE_NAME = "nairaclear_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");

// Simple in-memory brute-force protection for login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

function getConfiguredPasscode(): string {
  return (process.env.APP_PASSCODE || "").trim();
}

function getSigningSecret(): string {
  const base =
    process.env.SESSION_SECRET ||
    getConfiguredPasscode() ||
    EPHEMERAL_FALLBACK_SECRET;
  return crypto.createHash("sha256").update(`nairaclear:${base}`).digest("hex");
}

function createSessionToken(): string {
  const payload = {
    sub: "owner",
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token || !getConfiguredPasscode()) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return false;

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as { sub?: string; exp?: number };
    return parsed.sub === "owner" && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) result[key] = val;
  }
  return result;
}

function extractRequestToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

function requireOwnerAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: "Authentication required. Please unlock with your owner passcode." });
    return;
  }
  next();
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// --- Supabase cloud storage (optional) ---
// When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, the owner's loan
// list is stored server-side in a single-row document table so every device
// sees the same data. The service-role key never leaves the server; the
// browser only ever talks to /api/loans behind the owner session.
function getSupabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return { url, key };
}

async function supabaseFetch(
  pathname: string,
  init: RequestInit & { headers?: Record<string, string> }
): Promise<globalThis.Response> {
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error("Cloud storage is not configured.");
  return fetch(`${cfg.url}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractReadableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "Unknown error");
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // Not raw JSON
  }
  return raw;
}

function isTransientError(err: unknown): boolean {
  const msg = extractReadableError(err).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("econnreset") ||
    msg.includes("timeout")
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithResilience(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    thinkingLevel: ThinkingLevel;
    responseMimeType?: string;
    responseSchema?: unknown;
  }
) {
  const primaryConfig: Record<string, unknown> = {
    systemInstruction: params.systemInstruction,
    thinkingConfig: { thinkingLevel: params.thinkingLevel },
  };
  if (params.responseMimeType) {
    primaryConfig.responseMimeType = params.responseMimeType;
  }
  if (params.responseSchema) {
    primaryConfig.responseSchema = params.responseSchema;
  }

  let lastError: unknown;
  const delays = [0, 500, 1200];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);
    try {
      return await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: params.contents,
        config: primaryConfig,
      });
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) {
        throw err;
      }
    }
  }

  const fallbackConfig: Record<string, unknown> = {
    systemInstruction: params.systemInstruction,
  };
  if (params.responseMimeType) {
    fallbackConfig.responseMimeType = params.responseMimeType;
  }
  if (params.responseSchema) {
    fallbackConfig.responseSchema = params.responseSchema;
  }

  try {
    return await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: params.contents,
      config: fallbackConfig,
    });
  } catch (fallbackErr) {
    throw lastError || fallbackErr;
  }
}

interface LoanPayload {
  id: string;
  name: string;
  lender: string;
  debtType: string;
  principal: number;
  interestRate: number;
  interestMode: string;
  durationValue: number;
  durationUnit: string;
  interestAmount: number;
  totalDue: number;
  amountPaid: number;
  remainingBalance: number;
  startDate: string;
  dueDate: string;
  notes?: string;
  hasTerms?: boolean;
  installments?: Array<{ id?: string; amount: number; dueDate: string }>;
  installmentSchedule?: Array<{
    amount: number;
    dueDate: string;
    paidAmount: number;
    remainingAmount: number;
    status: string;
  }>;
}

// Build a compact repayment-terms summary for the AI prompts. Prefers the
// client's computed schedule (which knows how recorded payments split across
// terms) and falls back to the raw installment list.
function buildTermsSummary(l: LoanPayload) {
  const raw =
    Array.isArray(l.installmentSchedule) && l.installmentSchedule.length > 0
      ? l.installmentSchedule
      : Array.isArray(l.installments)
        ? l.installments
        : [];
  if (raw.length === 0) return null;

  const schedule = raw.map((t, i) => {
    const paidNGN =
      "paidAmount" in t && typeof t.paidAmount === "number" ? t.paidAmount : 0;
    const remainingNGN =
      "remainingAmount" in t && typeof t.remainingAmount === "number"
        ? t.remainingAmount
        : t.amount - paidNGN;
    return {
      term: i + 1,
      amountNGN: t.amount,
      dueDate: t.dueDate,
      paidNGN,
      remainingNGN,
      status:
        "status" in t && typeof t.status === "string"
          ? t.status
          : remainingNGN <= 0
            ? "paid"
            : "scheduled",
    };
  });

  const nextTerm = schedule.find((t) => t.remainingNGN > 0) || null;
  return { termsCount: schedule.length, nextTerm, schedule };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/auth/status", (req, res) => {
    const configured = Boolean(getConfiguredPasscode());
    const authenticated = configured && verifySessionToken(extractRequestToken(req));
    res.json({ authenticated, cloudStorage: Boolean(getSupabaseConfig()) });
  });

  app.post("/api/auth/login", (req, res) => {
    const configuredPasscode = getConfiguredPasscode();
    if (!configuredPasscode) {
      res.status(503).json({
        error: "Owner login is currently unavailable.",
      });
      return;
    }

    const ip = getClientIp(req);
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (record && record.lockedUntil > now) {
      const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
      res.status(429).json({
        error: `Too many incorrect attempts. Try again in ${waitSec}s.`,
      });
      return;
    }

    const { passcode } = req.body as { passcode?: string };
    if (typeof passcode !== "string" || !passcode) {
      res.status(400).json({ error: "Please enter your passcode." });
      return;
    }

    const inputHash = crypto.createHash("sha256").update(passcode.trim()).digest();
    const expectedHash = crypto.createHash("sha256").update(configuredPasscode).digest();

    if (!crypto.timingSafeEqual(inputHash, expectedHash)) {
      const nextCount = (record && record.lockedUntil <= now ? 0 : record?.count || 0) + 1;
      if (nextCount >= MAX_FAILED_ATTEMPTS) {
        loginAttempts.set(ip, { count: nextCount, lockedUntil: now + LOCKOUT_MS });
        res.status(429).json({
          error: "Too many incorrect attempts. Locked for 60 seconds.",
        });
        return;
      }
      loginAttempts.set(ip, { count: nextCount, lockedUntil: 0 });
      res.status(401).json({ error: "Incorrect passcode." });
      return;
    }

    loginAttempts.delete(ip);
    const token = createSessionToken();
    const isHttps =
      req.secure || req.headers["x-forwarded-proto"] === "https";

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: SESSION_TTL_MS,
      path: "/",
    });

    res.json({ ok: true, token });
  });

  app.post("/api/auth/logout", (req, res) => {
    const isHttps =
      req.secure || req.headers["x-forwarded-proto"] === "https";
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      path: "/",
    });
    res.json({ ok: true });
  });

  app.get("/api/loans", requireOwnerAuth, async (_req, res) => {
    if (!getSupabaseConfig()) {
      res.status(503).json({
        error: "Cloud storage is not configured on the server.",
        configured: false,
      });
      return;
    }
    try {
      const r = await supabaseFetch(
        "nairaclear_state?select=value,updated_at&key=eq.loans",
        { method: "GET" }
      );
      if (!r.ok) {
        throw new Error(`Supabase read failed (${r.status}): ${await r.text()}`);
      }
      const rows = (await r.json()) as Array<{
        value: unknown;
        updated_at: string;
      }>;
      if (!Array.isArray(rows) || rows.length === 0) {
        res.json({ loans: null, updatedAt: null });
        return;
      }
      res.json({ loans: rows[0].value, updatedAt: rows[0].updated_at });
    } catch (error: unknown) {
      console.error("Loan load error:", error);
      res.status(500).json({ error: extractReadableError(error) });
    }
  });

  app.put("/api/loans", requireOwnerAuth, async (req, res) => {
    if (!getSupabaseConfig()) {
      res.status(503).json({
        error: "Cloud storage is not configured on the server.",
        configured: false,
      });
      return;
    }
    const { loans } = req.body as { loans?: unknown };
    if (!Array.isArray(loans)) {
      res.status(400).json({ error: "Expected a body of { loans: [...] }." });
      return;
    }
    try {
      const r = await supabaseFetch("nairaclear_state?on_conflict=key", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          key: "loans",
          value: loans,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!r.ok) {
        throw new Error(
          `Supabase write failed (${r.status}): ${await r.text()}`
        );
      }
      const rows = (await r.json()) as Array<{ updated_at: string }>;
      res.json({ ok: true, updatedAt: rows?.[0]?.updated_at || null });
    } catch (error: unknown) {
      console.error("Loan save error:", error);
      res.status(500).json({ error: extractReadableError(error) });
    }
  });

  app.post("/api/repayment-plan", requireOwnerAuth, async (req, res) => {
    try {
      const { loans, monthlyBudget, strategy, paydayDay, currentDate } =
        req.body as {
          loans: LoanPayload[];
          monthlyBudget: number;
          strategy: string;
          paydayDay?: number;
          currentDate: string;
        };

      if (!Array.isArray(loans) || loans.length === 0) {
        res.status(400).json({
          error:
            "At least one active loan is required to generate a repayment plan.",
        });
        return;
      }

      if (!monthlyBudget || monthlyBudget <= 0) {
        res.status(400).json({
          error:
            "Please provide a valid monthly repayment budget greater than ₦0.",
        });
        return;
      }

      const ai = getGeminiClient();

      const activeLoansSummary = loans.map((l) => ({
        name: l.name,
        lender: l.lender,
        type: l.debtType,
        principalNGN: l.principal,
        interestRatePercent: l.interestRate,
        duration: `${l.durationValue} ${l.durationUnit}`,
        totalDueNGN: l.totalDue,
        paidSoFarNGN: l.amountPaid,
        remainingBalanceNGN: l.remainingBalance,
        dueDate: l.dueDate,
        repaymentTerms: buildTermsSummary(l),
        notes: l.notes || "",
      }));

      const prompt = `
Today's date is ${currentDate}.
The user lives in Nigeria and uses Nigerian Naira (₦ / NGN).
Monthly amount available for debt repayment: ₦${monthlyBudget.toLocaleString("en-NG")}.
Preferred strategy: ${strategy}.
${paydayDay ? `Expected monthly payday / income day: Day ${paydayDay} of the month.` : ""}

Here are the user's active loans:
${JSON.stringify(activeLoansSummary, null, 2)}

Some loans carry repaymentTerms: a schedule of installments (terms), each with its own amount and due date. For those loans, only the NEXT term's remaining amount falls due on the next term's due date; the rest of the balance falls due on the later term dates. Weigh urgency by the next term's amount and due date (not the full remaining balance), and make sure the plan covers each term on time. For loans without repaymentTerms, the full remaining balance falls due on the single dueDate.

Analyze these exact loans carefully within the Nigerian lending context:
- Nigerian digital Loan Apps (e.g., PalmPay, FairMoney, Carbon, Branch, OKash/OPay, QuickCheck, EaseMoni, Renmoney) typically charge steep daily rollover/late penalties (often 1%–2% per day overdue) and report to credit bureaus (CRC, FirstCentral) or contact references if overdue.
- Bank Loans (GTBank, Access, Zenith, UBA, Kuda, etc.) have structured monthly deductions and moderate late fees.
- Cooperative / Thrift (Ajo/Esusu) loans often rely on workplace salary deduction or group trust and carry lower rates.
- Personal (Family/Friend) loans usually have 0% or flexible interest, though relationship trust matters.

Create a realistic, prioritized, mathematically coherent repayment plan using the ₦${monthlyBudget.toLocaleString("en-NG")} monthly budget.
Make sure the sum of this month's recommended allocations across loans does not exceed ₦${monthlyBudget.toLocaleString("en-NG")} (unless flagging a shortfall and advising how to bridge it).
Keep every text item clear, specific to the user's actual lenders and amounts, and practical.
`;

      const response = await generateWithResilience(ai, {
        contents: prompt,
        systemInstruction:
          "You are an expert Nigerian personal finance and debt-restructuring advisor. Provide clear, empathetic, practical, mathematically sound repayment plans in Nigerian Naira (₦). Never invent fake loans or fake amounts; base all numbers strictly on the user's provided loans.",
        thinkingLevel: ThinkingLevel.MEDIUM,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description:
                "Concise 2-3 sentence overview of the user's debt situation, urgent risks, and overall strategy.",
            },
            estimatedMonthsToFreedom: {
              type: Type.NUMBER,
              description:
                "Estimated number of months to clear all listed remaining debt at the given monthly budget.",
            },
            budgetSufficiencyNote: {
              type: Type.STRING,
              description:
                "Assessment of whether the monthly budget covers urgent due dates/interest or if there is a shortfall.",
            },
            priorityOrder: {
              type: Type.ARRAY,
              description:
                "Ordered list of loans from highest priority (1) to lowest.",
              items: {
                type: Type.OBJECT,
                properties: {
                  rank: { type: Type.INTEGER },
                  loanName: { type: Type.STRING },
                  lender: { type: Type.STRING },
                  remainingBalanceNGN: { type: Type.NUMBER },
                  recommendedThisMonthNGN: { type: Type.NUMBER },
                  urgencyLevel: {
                    type: Type.STRING,
                    description: "One of: Critical, High, Medium, Low",
                  },
                  rationale: {
                    type: Type.STRING,
                    description:
                      "Specific reason for this rank and allocation (due date, penalty risk, interest rate, etc.).",
                  },
                },
              },
            },
            monthlyRoadmap: {
              type: Type.ARRAY,
              description:
                "Step-by-step month-by-month breakdown (up to 6 phases/months).",
              items: {
                type: Type.OBJECT,
                properties: {
                  monthLabel: {
                    type: Type.STRING,
                    description: "e.g., Month 1 (Immediate)",
                  },
                  focusAction: { type: Type.STRING },
                  totalPaymentNGN: { type: Type.NUMBER },
                },
              },
            },
            nigerianActionTips: {
              type: Type.ARRAY,
              description:
                "3-5 specific, practical tips tailored to Nigerian lenders (e.g., negotiating with FairMoney/PalmPay support, avoiding loan-app cycling, cooperative top-up consolidation).",
              items: { type: Type.STRING },
            },
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: unknown) {
      console.error("Repayment plan generation error:", error);
      res.status(500).json({ error: extractReadableError(error) });
    }
  });

  app.post("/api/repayment-chat", requireOwnerAuth, async (req, res) => {
    try {
      const { question, loans, monthlyBudget, currentDate, history } =
        req.body as {
          question: string;
          loans: LoanPayload[];
          monthlyBudget?: number;
          currentDate: string;
          history?: Array<{ role: "user" | "assistant"; text: string }>;
        };

      if (!question || !question.trim()) {
        res.status(400).json({ error: "Question cannot be empty." });
        return;
      }

      const ai = getGeminiClient();

      const contextText = `
Current Date: ${currentDate}
Monthly Repayment Budget: ${monthlyBudget ? `₦${monthlyBudget.toLocaleString("en-NG")}` : "Not specified"}
Active Loans:
${
  loans.length > 0
    ? loans
        .map((l) => {
          const terms = buildTermsSummary(l);
          const termsText = terms
            ? ` · Repayment terms (${terms.termsCount}): ${terms.schedule
                .map(
                  (t) =>
                    `Term ${t.term}: ₦${t.amountNGN.toLocaleString("en-NG")} due ${t.dueDate} (${t.remainingNGN <= 0 ? "paid" : `₦${t.remainingNGN.toLocaleString("en-NG")} left`})`
                )
                .join("; ")}`
            : "";
          return `- ${l.name} (${l.lender} · ${l.debtType}): Borrowed ₦${l.principal.toLocaleString("en-NG")}, Interest ${l.interestRate}%, Remaining ₦${l.remainingBalance.toLocaleString("en-NG")} of ₦${l.totalDue.toLocaleString("en-NG")}, Tenure ${l.durationValue} ${l.durationUnit}, Due ${l.dueDate}${termsText}${l.notes ? ` · Notes: ${l.notes}` : ""}`;
        })
        .join("\n")
    : "No active loans recorded."
}

Recent conversation:
${(history || [])
  .slice(-6)
  .map((m) => `${m.role === "user" ? "User" : "Advisor"}: ${m.text}`)
  .join("\n")}

User's question: ${question}
`;

      const response = await generateWithResilience(ai, {
        contents: contextText,
        systemInstruction:
          "You are NairaClear's Nigerian debt & repayment advisor. Answer concisely, practically, and accurately in plain text or short bullet points using Nigerian Naira (₦). Never advise taking predatory loan-app loans to pay off other loan apps unless explaining why it traps borrowers; instead suggest realistic prioritization, restructuring, or lower-interest cooperative/family options when appropriate.",
        thinkingLevel: ThinkingLevel.LOW,
      });

      res.json({ answer: (response.text ?? "").trim() });
    } catch (error: unknown) {
      console.error("Repayment chat error:", error);
      res.status(500).json({ error: extractReadableError(error) });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`NairaClear server listening on http://localhost:${PORT}`);
  });
}

startServer();
