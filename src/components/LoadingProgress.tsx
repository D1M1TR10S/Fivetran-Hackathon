"use client";

export interface ProgressStep {
  message: string;
  status: "pending" | "active" | "completed";
}

interface Props {
  steps: ProgressStep[];
}

function StepIcon({ status }: { status: ProgressStep["status"] }) {
  if (status === "completed") {
    return (
      <div className="w-8 h-8 rounded-full bg-fivetran-success flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="w-8 h-8 rounded-full bg-fivetran-blue flex items-center justify-center shrink-0 animate-pulse-dot">
        <div className="w-2.5 h-2.5 rounded-full bg-white" />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0">
      <div className="w-2 h-2 rounded-full bg-gray-300" />
    </div>
  );
}

export default function LoadingProgress({ steps }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-6">
      <h3 className="text-base font-semibold text-fivetran-dark mb-1 flex items-center gap-2">
        <svg className="w-5 h-5 text-fivetran-blue animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Analysis in Progress
      </h3>
      <p className="text-sm text-fivetran-secondary mb-6">This typically takes 30–60 seconds</p>

      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 ${
                    step.status === "completed" ? "bg-fivetran-success" : "bg-gray-200"
                  } transition-colors`}
                />
              )}
            </div>
            <div className="pt-1.5">
              <span
                className={`text-sm transition-colors ${
                  step.status === "completed"
                    ? "text-fivetran-success font-medium"
                    : step.status === "active"
                      ? "text-fivetran-dark font-medium"
                      : "text-gray-400"
                }`}
              >
                {step.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
