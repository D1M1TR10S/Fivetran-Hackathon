import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fivetran: {
          blue: "#0073FF",
          "blue-hover": "#005FCC",
          dark: "#1A1A2E",
          secondary: "#6B7280",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
