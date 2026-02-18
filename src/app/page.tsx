"use client";

import { useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import TopicInput from "@/components/TopicInput";
import AnalysisOptions, { AnalysisFlags } from "@/components/AnalysisOptions";
import SentimentAnalysis, { SentimentData } from "@/components/SentimentAnalysis";
import ComplaintsSection, { Complaint } from "@/components/ComplaintsSection";
import BlogArticle from "@/components/BlogArticle";
import LoadingProgress, { ProgressStep } from "@/components/LoadingProgress";

// Map SSE progress messages to step indices in the stepper
const STEP_LABELS = [
  "Searching Reddit & forums...",
  "Scanning X and tech blogs...",
  "Analyzing sentiment",
  "Ranking complaints by severity...",
  "Drafting replies",
  "Writing blog article...",
];

function buildInitialSteps(options: AnalysisFlags): ProgressStep[] {
  const steps: ProgressStep[] = [];
  if (options.sentiment || options.complaints || options.blog) {
    steps.push({ message: "Searching Reddit & forums...", status: "pending" });
    steps.push({ message: "Scanning X and tech blogs...", status: "pending" });
    steps.push({ message: "Analyzing sentiment...", status: "pending" });
  }
  if (options.complaints) {
    steps.push({ message: "Ranking complaints by severity...", status: "pending" });
    steps.push({ message: "Drafting replies...", status: "pending" });
  }
  if (options.blog) {
    steps.push({ message: "Writing blog article...", status: "pending" });
  }
  return steps;
}

/** Find the best matching step index for an SSE progress message */
function matchStepIndex(steps: ProgressStep[], message: string): number {
  // Try substring match against step labels
  for (let i = 0; i < steps.length; i++) {
    const stepBase = steps[i].message.replace(/\.{3}$/, "").replace(/\d+/g, "").trim().toLowerCase();
    const msgBase = message.replace(/\.{3}$/, "").replace(/\d+/g, "").trim().toLowerCase();
    if (msgBase.includes(stepBase) || stepBase.includes(msgBase)) {
      return i;
    }
  }
  // Fallback: find first pending step
  return steps.findIndex((s) => s.status === "pending");
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [options, setOptions] = useState<AnalysisFlags>({
    sentiment: true,
    complaints: true,
    blog: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [complaintsData, setComplaintsData] = useState<Complaint[] | null>(null);
  const [blogData, setBlogData] = useState<{ markdown: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analysisTopic, setAnalysisTopic] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const hasResults = sentimentData || complaintsData || blogData;

  const handleRunAnalysis = useCallback(async () => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset state
    setSentimentData(null);
    setComplaintsData(null);
    setBlogData(null);
    setErrors({});
    setAnalysisTopic(topic);

    const initialSteps = buildInitialSteps(options);
    setSteps(initialSteps);
    setIsLoading(true);

    // Activate first step
    if (initialSteps.length > 0) {
      initialSteps[0].status = "active";
      setSteps([...initialSteps]);
    }

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, options }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE events from buffer
        const lines = buffer.split("\n");
        buffer = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.startsWith("data: ")) {
            // Check if this is a complete event (followed by empty line or end of buffer)
            const isComplete = i + 1 < lines.length;
            if (!isComplete) {
              // Incomplete event, put back in buffer
              buffer = line + "\n";
              continue;
            }

            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "progress") {
                setSteps((prev) => {
                  const next = prev.map((s) => ({ ...s }));
                  const idx = matchStepIndex(next, event.message);

                  if (idx >= 0) {
                    // Mark everything before as completed
                    for (let j = 0; j < idx; j++) {
                      next[j].status = "completed";
                    }
                    // Update the message to the real one from the server
                    next[idx].message = event.message;
                    next[idx].status = "active";
                  }
                  return next;
                });
              } else if (event.type === "result") {
                // Mark all steps up to the next pending one as completed
                setSteps((prev) => {
                  const next = prev.map((s) => ({ ...s }));
                  // Complete all active steps
                  for (const s of next) {
                    if (s.status === "active") s.status = "completed";
                  }
                  // Activate next pending step
                  const nextPending = next.find((s) => s.status === "pending");
                  if (nextPending) nextPending.status = "active";
                  return next;
                });

                if (event.section === "sentiment") {
                  setSentimentData(event.data);
                } else if (event.section === "complaints") {
                  setComplaintsData(event.data);
                } else if (event.section === "blog") {
                  setBlogData(event.data);
                }
              } else if (event.type === "error") {
                setErrors((prev) => ({
                  ...prev,
                  [event.step]: event.message,
                }));
                // Skip past the failed step
                setSteps((prev) => {
                  const next = prev.map((s) => ({ ...s }));
                  for (const s of next) {
                    if (s.status === "active") s.status = "completed";
                  }
                  const nextPending = next.find((s) => s.status === "pending");
                  if (nextPending) nextPending.status = "active";
                  return next;
                });
              } else if (event.type === "done") {
                // Mark all steps as completed
                setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as const })));
                setIsLoading(false);
              }
            } catch {
              // Malformed JSON line, skip
            }
          } else if (line.trim() !== "") {
            // Non-empty, non-data line — could be leftover, put in buffer
            buffer += line + "\n";
          }
        }
      }

      // Stream ended — ensure loading is off
      setIsLoading(false);
      setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as const })));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrors((prev) => ({
        ...prev,
        connection: (err as Error).message || "Connection failed",
      }));
      setIsLoading(false);
    }
  }, [topic, options]);

  const handleReset = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setSentimentData(null);
    setComplaintsData(null);
    setBlogData(null);
    setErrors({});
    setSteps([]);
  };

  const anyOptionSelected = options.sentiment || options.complaints || options.blog;
  const sectionCount = [sentimentData, complaintsData, blogData].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="bg-white border border-gray-200 rounded-card p-6 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xl">
              <TopicInput value={topic} onChange={setTopic} />
              <AnalysisOptions options={options} onChange={setOptions} />

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleRunAnalysis}
                  disabled={!topic.trim() || !anyOptionSelected || isLoading}
                  className="px-6 py-2.5 bg-fivetran-blue text-white text-sm font-medium rounded-btn
                             hover:bg-fivetran-blue-hover transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed
                             shadow-sm shadow-fivetran-blue/25"
                >
                  {isLoading ? "Running..." : "Run Analysis"}
                </button>

                {(hasResults || isLoading) && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 text-sm font-medium text-fivetran-secondary
                               hover:text-fivetran-dark border border-gray-200 rounded-btn
                               hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Error */}
        {errors.connection && (
          <div className="mb-6 bg-fivetran-error/5 border border-fivetran-error/20 rounded-card p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-fivetran-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-fivetran-error">{errors.connection}</span>
          </div>
        )}

        {/* Loading Stepper */}
        {isLoading && steps.length > 0 && (
          <div className="mb-6">
            <LoadingProgress steps={steps} />
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-fivetran-dark">
                  Results for &ldquo;{analysisTopic}&rdquo;
                </h2>
                <p className="text-sm text-fivetran-secondary mt-0.5">
                  {isLoading
                    ? `Loading — ${sectionCount} section${sectionCount !== 1 ? "s" : ""} ready`
                    : `Analysis completed — showing ${sectionCount} section${sectionCount !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {/* Sentiment */}
            {sentimentData && <SentimentAnalysis data={sentimentData} topic={analysisTopic} />}
            {errors.research && !sentimentData && (
              <div className="bg-fivetran-error/5 border border-fivetran-error/20 rounded-card p-4 text-sm text-fivetran-error">
                Sentiment analysis failed: {errors.research}
              </div>
            )}

            {/* Complaints */}
            {complaintsData && <ComplaintsSection data={complaintsData} />}
            {errors.complaints && !complaintsData && (
              <div className="bg-fivetran-error/5 border border-fivetran-error/20 rounded-card p-4 text-sm text-fivetran-error">
                Complaints analysis failed: {errors.complaints}
              </div>
            )}

            {/* Blog */}
            {blogData && <BlogArticle data={blogData} />}
            {errors.blog && !blogData && (
              <div className="bg-fivetran-error/5 border border-fivetran-error/20 rounded-card p-4 text-sm text-fivetran-error">
                Blog generation failed: {errors.blog}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
