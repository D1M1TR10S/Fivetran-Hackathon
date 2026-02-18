"use client";

import { useState } from "react";
import Modal from "./Modal";

type Severity = "Critical" | "High" | "Medium" | "Low";
type FunnelStage = "Awareness" | "Consideration" | "Decision";

export interface Complaint {
  id: number;
  text: string;
  source: string;
  sourceUrl: string;
  severity: Severity;
  funnelStage: FunnelStage;
  draftReply: string;
}

interface Props {
  data: Complaint[];
}

const SEVERITY_STYLES: Record<Severity, string> = {
  Critical: "bg-fivetran-error/10 text-fivetran-error border border-fivetran-error/20",
  High: "bg-orange-50 text-orange-600 border border-orange-200",
  Medium: "bg-fivetran-warning/10 text-fivetran-warning border border-fivetran-warning/20",
  Low: "bg-fivetran-success/10 text-fivetran-success border border-fivetran-success/20",
};

const FUNNEL_STYLES: Record<FunnelStage, string> = {
  Awareness: "bg-purple-50 text-purple-600",
  Consideration: "bg-blue-50 text-blue-600",
  Decision: "bg-indigo-50 text-indigo-600",
};

const ACTIONABLE_PLATFORMS = new Set([
  "reddit", "hackernews", "hacker news", "hn",
  "stack overflow", "stackoverflow",
  "x/twitter", "x", "twitter",
  "g2", "g2 reviews", "trustradius",
  "quora", "forum", "forums",
]);

function isActionable(source: string): boolean {
  return ACTIONABLE_PLATFORMS.has(source.toLowerCase());
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-gray-100 rounded-btn transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-4 h-4 text-fivetran-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const [expanded, setExpanded] = useState(false);

  const severityStyle = SEVERITY_STYLES[complaint.severity] || SEVERITY_STYLES.Medium;
  const funnelStyle = FUNNEL_STYLES[complaint.funnelStage] || FUNNEL_STYLES.Awareness;
  const actionable = isActionable(complaint.source);
  const hasDraftReply = complaint.draftReply && complaint.draftReply.trim() !== "";

  return (
    <div className="border border-gray-200 rounded-card p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-fivetran-dark leading-relaxed flex-1">
          &ldquo;{complaint.text}&rdquo;
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`badge ${severityStyle}`}>{complaint.severity}</span>
        <span className={`badge ${funnelStyle}`}>{complaint.funnelStage}</span>
        {actionable && (
          <span className="badge bg-fivetran-blue/10 text-fivetran-blue border border-fivetran-blue/20 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Actionable
          </span>
        )}
        <span className="text-xs text-fivetran-secondary flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {complaint.source}
        </span>
        {complaint.sourceUrl && complaint.sourceUrl !== "" && complaint.sourceUrl !== "#" && (
          <a
            href={complaint.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-fivetran-blue hover:underline"
          >
            View Original
          </a>
        )}
      </div>

      {hasDraftReply ? (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-fivetran-blue hover:text-fivetran-blue/80 font-medium transition-colors flex items-center gap-1"
          >
            {expanded ? "Hide" : "Show"} Draft Reply
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-btn p-4">
              <div className="flex items-start gap-2">
                <p className="text-sm text-fivetran-dark leading-relaxed flex-1">
                  {complaint.draftReply}
                </p>
                <CopyButton text={complaint.draftReply} />
              </div>
            </div>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-400 italic">
          Source: {complaint.source} (not actionable)
        </span>
      )}
    </div>
  );
}

export default function ComplaintsSection({ data }: Props) {
  const [showModal, setShowModal] = useState(false);
  const previewComplaints = data.slice(0, 3);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-card p-6">
        <h3 className="text-base font-semibold text-fivetran-dark mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-fivetran-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Comments & Complaints by Severity
        </h3>

        <div className="flex flex-col gap-4">
          {previewComplaints.map((c) => (
            <ComplaintCard key={c.id} complaint={c} />
          ))}
        </div>

        {data.length > 3 && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-sm text-fivetran-blue hover:text-fivetran-blue/80 font-medium transition-colors flex items-center gap-1"
          >
            View All {data.length} Comments
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="All Comments & Complaints"
      >
        <div className="flex flex-col gap-4">
          {data.map((c) => (
            <ComplaintCard key={c.id} complaint={c} />
          ))}
        </div>
      </Modal>
    </>
  );
}
