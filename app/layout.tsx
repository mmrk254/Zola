import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zola | Critical care coordination",
  description: "Real-time ICU, HDU, and NICU referral coordination for hospitals."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
