import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LocaleProvider } from "./i18n/localeProvider";
import { ThemeProvider, themeNoFlashScript } from "./theme/themeProvider";
import { ToastProvider } from "@/components/ui/toast";
import SessionKeepAlive from "@/components/auth/sessionKeepAlive";
import IdleLogout from "@/components/auth/idleLogout";

// Self-hosted (variable) fonts so the production build never reaches out to
// Google Fonts at build time — the build container has no internet access.
// The woff2 files live in app/fonts/ and cover the full weight axis.
const ubuntuSans = localFont({
  src: "./fonts/UbuntuSans.woff2",
  variable: "--font-ubuntu-sans",
  display: "swap",
  weight: "400 800",
});

const jetbrains = localFont({
  src: "./fonts/JetBrainsMono.woff2",
  variable: "--font-jetbrains",
  display: "swap",
  weight: "400 500",
});

export const metadata: Metadata = {
  title: "ICRCS Tanzania — Sovereign Access",
  description:
    "Integrated Citizen Registry and Control System — Tanzania Immigration Services Department. Your gateway to national immigration services.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport = {
  themeColor: "#0d1f33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ubuntuSans.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
        {/* Print-only stylesheet for the registration form layout */}
        <link rel="stylesheet" href="/registry-print.css" media="print" />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <ThemeProvider>
          <LocaleProvider>
            <ToastProvider>
              <SessionKeepAlive />
              <IdleLogout />
              {children}
            </ToastProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
