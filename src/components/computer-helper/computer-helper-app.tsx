"use client";

import { useState, type FormEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  MonitorSmartphone,
  Search,
} from "lucide-react";
import { DowntownSubnav } from "@/components/downtown/downtown-subnav";
import type {
  ComputerHelperPlan,
  HelperOs,
} from "@/lib/downtown/computer-helper/types";
import { HELPER_OS_OPTIONS } from "@/lib/downtown/computer-helper/types";

const EXAMPLES = [
  "Wi‑Fi connected but no internet",
  "Printer says offline",
  "Device is very slow after boot",
  "App keeps crashing",
  "System update stuck",
];

function planLooksValid(plan: ComputerHelperPlan | null | undefined): boolean {
  return !!(
    plan &&
    typeof plan.summary === "string" &&
    plan.summary.trim() &&
    Array.isArray(plan.summarySteps) &&
    plan.summarySteps.length > 0 &&
    Array.isArray(plan.detailedSteps) &&
    plan.detailedSteps.length > 0 &&
    plan.option2 &&
    typeof plan.option2.summary === "string"
  );
}

export function ComputerHelperApp() {
  const [os, setOs] = useState<HelperOs | "">("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ComputerHelperPlan | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  async function runQuery(raw: string, selectedOs: HelperOs | "") {
    const q = raw.trim();
    if (!selectedOs) {
      setError("Select your operating system first.");
      setPlan(null);
      return;
    }
    if (!q) {
      setError("Enter a computer problem to troubleshoot.");
      setPlan(null);
      return;
    }
    setError(null);
    setLoading(true);
    setPlan(null);
    setExpanded({});
    try {
      const res = await fetch("/api/downtown/computer-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, os: selectedOs }),
      });
      let data: ComputerHelperPlan & { error?: string };
      try {
        data = (await res.json()) as ComputerHelperPlan & { error?: string };
      } catch {
        setError("Server returned an unreadable response — try again.");
        return;
      }
      if (!res.ok) {
        setError(
          data.error ||
            "Could not generate a plan. If this keeps happening, set OPENAI_API_KEY on Vercel and redeploy."
        );
        return;
      }
      if (!planLooksValid(data)) {
        setError(
          data.error ||
            "Received an incomplete plan — try again, or set OPENAI_API_KEY for live AI."
        );
        return;
      }
      setPlan(data);
      setExpanded({ "d-0": true, "o2-0": true });
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runQuery(query, os);
  }

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function copyPlan() {
    if (!plan) return;
    const lines = [
      `Computer Helper — ${plan.query}`,
      `OS: ${plan.osLabel}`,
      plan.topic ? `Topic: ${plan.topic}` : "",
      "",
      "Summary:",
      plan.summary,
      "",
      "Action plan:",
      ...plan.summarySteps.map((s, i) => `${i + 1}. ${s}`),
      "",
      "Details:",
      ...plan.detailedSteps.map(
        (s, i) => `${i + 1}. ${s.title}\n   ${s.detail}`
      ),
      "",
      "Option 2:",
      plan.option2.summary,
      ...plan.option2.steps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.detail}`),
      "",
      `Mode: ${plan.mode}${plan.note ? ` (${plan.note})` : ""}${
        plan.researchUsed ? " · research" : ""
      }`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="computer-helper" />

      <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
        <p
          className="text-[0.65rem] uppercase tracking-[0.14em]"
          style={{ color: "var(--dt-accent)" }}
        >
          Downtown · Tools
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <h1
            className="text-3xl font-semibold tracking-tight md:text-4xl"
            style={{ color: "var(--dt-fg)" }}
          >
            Computer Helper
          </h1>
          <MonitorSmartphone
            className="mb-1 h-6 w-6 shrink-0 opacity-70"
            style={{ color: "var(--dt-accent)" }}
            aria-hidden
          />
        </div>
        <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
          Pick your OS, describe the problem, and live AI researches current fixes — a plain-language
          summary, short action plan, detailed walkthrough, plus Option 2 as an alternate path.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Operating system <span style={{ color: "var(--dt-accent)" }}>*</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Operating system">
            {HELPER_OS_OPTIONS.map((opt) => {
              const selected = os === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={loading}
                  className="downtown-chip"
                  style={
                    selected
                      ? {
                          borderColor: "var(--dt-accent)",
                          color: "var(--dt-accent)",
                        }
                      : undefined
                  }
                  onClick={() => {
                    setOs(opt.id);
                    if (error) setError(null);
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="downtown-search-wrap">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4"
            style={{ color: "var(--dt-muted)" }}
            aria-hidden
          />
          <input
            className="downtown-input"
            style={{ paddingRight: "6.5rem" }}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Wi‑Fi connected but nothing loads…"
            aria-label="Computer problem"
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !os}
            className="absolute right-2 top-1/2 -translate-y-1/2 border border-[var(--dt-line)] px-3 py-1.5 text-xs uppercase tracking-wider transition hover:border-[var(--dt-accent)] hover:text-[var(--dt-accent)] disabled:opacity-50"
            style={{ color: "var(--dt-fg)", background: "rgba(0,0,0,0.35)" }}
          >
            {loading ? "Working…" : "Get plan"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="downtown-chip"
              disabled={loading || !os}
              title={!os ? "Select an OS first" : undefined}
              onClick={() => {
                setQuery(ex);
                void runQuery(ex, os);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error ? (
        <div
          className="space-y-2 border border-[var(--dt-line)] px-4 py-3 text-sm"
          style={{ color: "var(--dt-warn)", background: "rgba(196,122,61,0.08)" }}
          role="alert"
        >
          <p className="font-medium">{error}</p>
          {/OPENAI_API_KEY/i.test(error) ? (
            <p className="text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              Vercel: Project → Settings → Environment Variables → add{" "}
              <code style={{ color: "var(--dt-accent)" }}>OPENAI_API_KEY</code> for Production and
              Preview, then redeploy. Local: put it in <code>.env</code> and restart the dev server.
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div
          className="flex items-center gap-3 border border-[var(--dt-line)] px-4 py-8 text-sm"
          style={{ color: "var(--dt-muted)" }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--dt-accent)" }} />
          Researching and building a live troubleshooting plan…
        </div>
      ) : null}

      {plan ? (
        <div className="space-y-6">
          {plan.liveError ? (
            <div
              className="border border-[var(--dt-line)] px-4 py-3 text-sm leading-relaxed"
              style={{ color: "var(--dt-warn)", background: "rgba(196,122,61,0.1)" }}
              role="status"
            >
              <p className="font-medium">Live AI unavailable — showing a curated plan instead.</p>
              <p className="mt-1 text-xs" style={{ color: "var(--dt-muted)" }}>
                {plan.liveError}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <span
              className="text-[0.65rem] uppercase tracking-[0.12em]"
              style={{ color: "var(--dt-accent)" }}
            >
              {plan.osLabel}
            </span>
            {plan.topic ? (
              <span
                className="text-[0.65rem] uppercase tracking-[0.12em]"
                style={{ color: "var(--dt-muted)" }}
              >
                {plan.topic}
              </span>
            ) : null}
            <span className="text-xs" style={{ color: "var(--dt-muted)" }}>
              {plan.mode === "llm" ? "Live AI" : "Offline playbook"}
              {plan.researchUsed ? " · researched" : ""}
              {plan.note && !plan.liveError ? ` · ${plan.note}` : ""}
            </span>
            <button
              type="button"
              onClick={() => void copyPlan()}
              className="ml-auto inline-flex items-center gap-1.5 border border-[var(--dt-line)] px-2.5 py-1.5 text-xs uppercase tracking-wider hover:border-[var(--dt-accent)]"
              style={{ color: "var(--dt-muted)" }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy plan"}
            </button>
          </div>

          <section
            className="downtown-panel space-y-2 border-l-2 p-4 md:p-5"
            style={{ borderLeftColor: "var(--dt-accent)" }}
          >
            <h2
              className="text-[0.65rem] uppercase tracking-[0.14em]"
              style={{ color: "var(--dt-accent)" }}
            >
              AI summary
            </h2>
            <p className="text-base leading-relaxed md:text-lg" style={{ color: "var(--dt-fg)" }}>
              {plan.summary}
            </p>
          </section>

          <section className="downtown-panel space-y-3 p-4 md:p-5">
            <h2 className="text-lg font-medium" style={{ color: "var(--dt-fg)" }}>
              Action plan
            </h2>
            <ol className="space-y-2">
              {plan.summarySteps.map((step, i) => (
                <li
                  key={`sum-${i}`}
                  className="flex gap-3 border-b border-[var(--dt-line)] pb-2 last:border-0 text-sm leading-relaxed"
                >
                  <span
                    className="downtown-stat shrink-0 w-6 text-right"
                    style={{ color: "var(--dt-accent)" }}
                  >
                    {i + 1}.
                  </span>
                  <span style={{ color: "var(--dt-fg)" }}>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium" style={{ color: "var(--dt-fg)" }}>
              Detailed steps
            </h2>
            <ul className="space-y-2">
              {plan.detailedSteps.map((step, i) => {
                const key = `d-${i}`;
                const open = !!expanded[key];
                return (
                  <li key={key} className="downtown-panel overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-black/20"
                      onClick={() => toggle(key)}
                      aria-expanded={open}
                    >
                      {open ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--dt-accent)" }} />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--dt-muted)" }} />
                      )}
                      <span className="downtown-stat shrink-0" style={{ color: "var(--dt-accent)" }}>
                        {i + 1}.
                      </span>
                      <span className="font-medium" style={{ color: "var(--dt-fg)" }}>
                        {step.title}
                      </span>
                    </button>
                    {open ? (
                      <p
                        className="border-t border-[var(--dt-line)] px-4 py-3 pl-12 text-sm leading-relaxed"
                        style={{ color: "var(--dt-muted)" }}
                      >
                        {step.detail}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            className="space-y-3 border border-[var(--dt-line)] p-4 md:p-5"
            style={{ background: "rgba(196,163,90,0.06)" }}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-medium" style={{ color: "var(--dt-accent)" }}>
                Option 2
              </h2>
              <span className="text-xs uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                Alternate approach
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--dt-fg)" }}>
              {plan.option2.summary}
            </p>
            <ul className="space-y-2">
              {plan.option2.steps.map((step, i) => {
                const key = `o2-${i}`;
                const open = !!expanded[key];
                return (
                  <li key={key} className="border border-[var(--dt-line)] bg-[var(--dt-panel)]">
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm"
                      onClick={() => toggle(key)}
                      aria-expanded={open}
                    >
                      {open ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--dt-accent)" }} />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--dt-muted)" }} />
                      )}
                      <span className="font-medium" style={{ color: "var(--dt-fg)" }}>
                        {step.title}
                      </span>
                    </button>
                    {open ? (
                      <p
                        className="border-t border-[var(--dt-line)] px-3 py-2.5 pl-10 text-sm leading-relaxed"
                        style={{ color: "var(--dt-muted)" }}
                      >
                        {step.detail}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
