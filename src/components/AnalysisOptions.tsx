"use client";

export interface AnalysisFlags {
  sentiment: boolean;
  complaints: boolean;
  blog: boolean;
}

interface AnalysisOptionsProps {
  options: AnalysisFlags;
  onChange: (options: AnalysisFlags) => void;
}

const OPTIONS = [
  { key: "sentiment" as const, label: "Sentiment Analysis" },
  { key: "complaints" as const, label: "Rank Comments & Draft Replies" },
  { key: "blog" as const, label: "Draft Blog Article" },
];

export default function AnalysisOptions({ options, onChange }: AnalysisOptionsProps) {
  const toggle = (key: keyof AnalysisFlags) => {
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      <span className="text-sm font-medium text-fivetran-dark">Analysis & Workflow Options</span>
      {OPTIONS.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={() => toggle(key)}
              className="sr-only peer"
            />
            <div
              className="w-[18px] h-[18px] rounded border-2 border-gray-300
                          peer-checked:border-fivetran-blue peer-checked:bg-fivetran-blue
                          transition-all flex items-center justify-center"
            >
              {options[key] && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-fivetran-dark group-hover:text-fivetran-blue transition-colors">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}
