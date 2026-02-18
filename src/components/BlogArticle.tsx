"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Props {
  data: { markdown: string };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                 border border-gray-200 rounded-btn hover:bg-gray-50 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-fivetran-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function RenderedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-sm text-fivetran-dark leading-relaxed">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|`(.+?)`/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[1]) {
        parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
      } else if (match[2]) {
        parts.push(<em key={match.index}>{match[2]}</em>);
      } else if (match[3] && match[4]) {
        parts.push(
          <a key={match.index} href={match[4]} className="text-fivetran-blue hover:underline">
            {match[3]}
          </a>
        );
      } else if (match[5]) {
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
            {match[5]}
          </code>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={i} className="text-xl font-bold text-fivetran-dark mb-3">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-lg font-semibold text-fivetran-dark mt-6 mb-2">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={i} className="text-base font-semibold text-fivetran-dark mt-4 mb-2">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith("- ")) {
      listItems.push(<li key={i}>{renderInline(trimmed.slice(2))}</li>);
    } else if (trimmed === "---") {
      flushList();
      elements.push(<hr key={i} className="my-6 border-gray-200" />);
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="text-sm text-fivetran-dark leading-relaxed mb-3">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <div>{elements}</div>;
}

export default function BlogArticle({ data }: Props) {
  const [showModal, setShowModal] = useState(false);
  const article = data.markdown;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-card p-6">
        <h3 className="text-base font-semibold text-fivetran-dark mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-fivetran-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Draft Blog Article
        </h3>

        <div className="bg-gray-50 rounded-card p-5 max-h-80 overflow-y-auto mb-4">
          <RenderedMarkdown content={article} />
        </div>

        <div className="flex items-center gap-3">
          <CopyButton text={article} label="Copy Article" />
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 text-sm text-fivetran-blue hover:text-fivetran-blue/80 font-medium transition-colors"
          >
            View Full Article
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Draft Blog Article"
      >
        <RenderedMarkdown content={article} />
        <div className="mt-6 pt-4 border-t border-gray-100">
          <CopyButton text={article} label="Copy Article" />
        </div>
      </Modal>
    </>
  );
}
