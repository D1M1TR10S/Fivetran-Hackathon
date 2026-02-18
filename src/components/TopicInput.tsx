"use client";

import { useState, useRef, useEffect } from "react";

const TOPIC_OPTIONS = [
  "Postgres Connector",
  "MySQL Connector",
  "Salesforce Connector",
  "HubSpot Connector",
  "Fivetran vs Airbyte",
  "Fivetran vs Stitch",
  "Fivetran vs AWS DMS",
  "Fivetran Postgres Connector vs AWS DMS",
  "Fivetran Pricing",
  "Fivetran Setup & Onboarding",
  "Fivetran Reliability & Downtime",
];

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TopicInput({ value, onChange }: TopicInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(TOPIC_OPTIONS);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);
    const filtered = TOPIC_OPTIONS.filter((opt) =>
      opt.toLowerCase().includes(val.toLowerCase())
    );
    setFilteredOptions(filtered);
    setIsOpen(true);
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-xl">
      <label className="block text-sm font-medium text-fivetran-dark mb-2">
        Topic or Product
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setFilteredOptions(
              value
                ? TOPIC_OPTIONS.filter((opt) =>
                    opt.toLowerCase().includes(value.toLowerCase())
                  )
                : TOPIC_OPTIONS
            );
            setIsOpen(true);
          }}
          placeholder="Select a topic or type your own..."
          className="w-full px-4 py-3 border border-gray-200 rounded-card text-sm
                     focus:outline-none focus:ring-2 focus:ring-fivetran-blue/20 focus:border-fivetran-blue
                     placeholder:text-gray-400 transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-card shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-fivetran-blue/5 transition-colors
                ${value === option ? "bg-fivetran-blue/10 text-fivetran-blue font-medium" : "text-fivetran-dark"}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
