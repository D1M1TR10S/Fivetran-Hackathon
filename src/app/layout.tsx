import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fivetran Pulse | Fivetran",
  description: "Internal tool for analyzing market sentiment and competitive intelligence",
  icons: {
    icon: "/fivetran-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
