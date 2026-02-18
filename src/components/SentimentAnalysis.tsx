"use client";

import { useState, useCallback } from "react";

export interface PainPoint {
  title: string;
  description: string;
  frequency: number;
}

export interface Competitor {
  name: string;
  mentions: number;
  context: string;
}

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  totalMentions: number;
  estimatedAccounts?: number;
  platforms: { name: string; count: number }[];
  themes: string[];
  trend: string;
  painPoints?: PainPoint[];
  competitors?: Competitor[];
  keyInsights?: string;
}

interface Props {
  data: SentimentData;
  topic: string;
}

// ---------------------------------------------------------------------------
// Ideate types & helpers
// ---------------------------------------------------------------------------

interface Solution {
  team: "Engineering" | "Product" | "Marketing" | "Sales";
  idea: string;
  detail: string;
}

type IdeateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; solutions: Solution[] }
  | { status: "error" };

const TEAM_STYLES: Record<string, string> = {
  Engineering: "bg-blue-50 text-blue-700 border border-blue-200",
  Product: "bg-purple-50 text-purple-700 border border-purple-200",
  Marketing: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Sales: "bg-amber-50 text-amber-700 border border-amber-200",
};

// ---------------------------------------------------------------------------
// PainPointCard (with Ideate)
// ---------------------------------------------------------------------------

function PainPointCard({ pp, topic }: { pp: PainPoint; topic: string }) {
  const [ideate, setIdeate] = useState<IdeateState>({ status: "idle" });

  const handleIdeate = useCallback(async () => {
    if (ideate.status === "done") return; // already cached
    setIdeate({ status: "loading" });
    try {
      const res = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          painPoint: pp.title,
          description: pp.description,
          topic,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setIdeate({ status: "done", solutions: data.solutions || [] });
    } catch {
      setIdeate({ status: "error" });
    }
  }, [ideate.status, pp.title, pp.description, topic]);

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-fivetran-dark">{pp.title}</div>
          <p className="text-sm text-fivetran-secondary leading-relaxed mt-0.5">{pp.description}</p>
        </div>
        <span className="badge bg-fivetran-error/10 text-fivetran-error border border-fivetran-error/20 shrink-0">
          {pp.frequency} mention{pp.frequency !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Ideate button / states */}
      <div className="mt-3">
        {ideate.status === "idle" && (
          <button
            onClick={handleIdeate}
            className="text-xs font-medium text-fivetran-blue hover:text-fivetran-blue/80 transition-colors flex items-center gap-1"
          >
            Ideate ✦
          </button>
        )}

        {ideate.status === "loading" && (
          <span className="text-xs text-fivetran-secondary flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin text-fivetran-blue" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Ideating...
          </span>
        )}

        {ideate.status === "error" && (
          <span className="text-xs text-fivetran-error">
            Failed to ideate —{" "}
            <button
              onClick={() => { setIdeate({ status: "idle" }); }}
              className="underline hover:no-underline"
            >
              try again
            </button>
          </span>
        )}

        {ideate.status === "done" && ideate.solutions.length > 0 && (
          <div className="flex flex-col gap-2 animate-in fade-in">
            {ideate.solutions.map((s, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-btn p-3 animate-fadeIn"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-[11px] ${TEAM_STYLES[s.team] || TEAM_STYLES.Product}`}>
                    {s.team}
                  </span>
                  <span className="text-sm font-semibold text-fivetran-dark">{s.idea}</span>
                </div>
                <p className="text-xs text-fivetran-secondary leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SentimentAnalysis({ data, topic }: Props) {
  const {
    positive, neutral, negative, totalMentions, estimatedAccounts,
    trend, platforms, themes, painPoints, competitors, keyInsights,
  } = data;

  const trendColor =
    trend === "Declining" ? "text-fivetran-error" : "text-fivetran-success";
  const trendArrow =
    trend === "Declining" ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18";

  return (
    <div className="bg-white border border-gray-200 rounded-card p-6">
      <h3 className="text-base font-semibold text-fivetran-dark mb-5 flex items-center gap-2">
        <svg className="w-5 h-5 text-fivetran-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Sentiment Analysis
      </h3>

      {/* Sentiment Bar */}
      <div className="mb-6">
        <div className="flex rounded-full overflow-hidden h-4 mb-3">
          <div className="bg-fivetran-success transition-all" style={{ width: `${positive}%` }} />
          <div className="bg-gray-300 transition-all" style={{ width: `${neutral}%` }} />
          <div className="bg-fivetran-error transition-all" style={{ width: `${negative}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fivetran-success" />
            <span className="font-medium text-fivetran-success">{positive}% Positive</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="font-medium text-gray-500">{neutral}% Neutral</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fivetran-error" />
            <span className="font-medium text-fivetran-error">{negative}% Negative</span>
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-card p-4">
          <div className="text-2xl font-bold text-fivetran-dark">{totalMentions}</div>
          <div className="text-sm text-fivetran-secondary">Total Mentions</div>
        </div>
        {estimatedAccounts != null && estimatedAccounts > 0 && (
          <div className="bg-gray-50 rounded-card p-4">
            <div className="text-2xl font-bold text-fivetran-dark">{estimatedAccounts}</div>
            <div className="text-sm text-fivetran-secondary">Estimated Accounts Discussing</div>
          </div>
        )}
        <div className="bg-gray-50 rounded-card p-4">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${trendColor}`}>{trend}</span>
            <svg className={`w-5 h-5 ${trendColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trendArrow} />
            </svg>
          </div>
          <div className="text-sm text-fivetran-secondary">Sentiment Trend</div>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="mb-5">
        <div className="text-sm font-medium text-fivetran-dark mb-2">Platform Breakdown</div>
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-fivetran-blue/5 text-fivetran-blue rounded-full text-sm font-medium"
            >
              {p.name}
              <span className="bg-fivetran-blue text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {p.count}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Key Themes */}
      <div className="mb-6">
        <div className="text-sm font-medium text-fivetran-dark mb-2">Key Themes</div>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <span key={theme} className="px-3 py-1.5 bg-gray-100 text-fivetran-dark rounded-full text-sm">
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* ── New Subsections ── */}

      {/* Key Insights */}
      {keyInsights && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-card p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-amber-800 mb-1">Key Insights</div>
              <p className="text-sm text-amber-900 leading-relaxed">{keyInsights}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Pain Points */}
      {painPoints && painPoints.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-fivetran-dark mb-3">Top Pain Points</div>
          <div className="grid gap-3">
            {painPoints.map((pp) => (
              <PainPointCard key={pp.title} pp={pp} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* Top Competitors Mentioned */}
      {competitors && competitors.length > 0 && (
        <div>
          <div className="text-sm font-medium text-fivetran-dark mb-3">Top Competitors Mentioned</div>
          <div className="border border-gray-200 rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-fivetran-secondary">Competitor</th>
                  <th className="px-4 py-2.5 font-medium text-fivetran-secondary text-center w-24">Mentions</th>
                  <th className="px-4 py-2.5 font-medium text-fivetran-secondary">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {competitors.map((c) => (
                  <tr key={c.name} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-fivetran-dark">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-fivetran-blue/10 text-fivetran-blue text-xs font-semibold px-2 py-0.5 rounded-full min-w-[24px]">
                        {c.mentions}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fivetran-secondary">{c.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
