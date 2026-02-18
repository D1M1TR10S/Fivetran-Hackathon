"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/fivetran-logo.jpg"
            alt="Fivetran"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-fivetran-dark">
            Fivetran Pulse
          </h1>
        </div>
        <span className="badge bg-gray-100 text-fivetran-secondary border border-gray-200">
          Internal Tool
        </span>
      </div>
    </header>
  );
}
