import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WorkspaceProvider } from "@/lib/use-workspace";
import { PwaInstallBanner } from "@/components/pwa-install";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F8D8A" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1F2E" }
  ]
};

export const metadata: Metadata = {
  title: {
    default: "Zola | Critical care coordination",
    template: "%s | Zola"
  },
  description: "Real-time ICU, HDU, and NICU referral coordination for hospitals.",
  applicationName: "Zola",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zola"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.svg"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <PwaInstallBanner />
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
