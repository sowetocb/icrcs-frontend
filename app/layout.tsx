import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "./i18n/localeProvider";
import { ThemeProvider, themeNoFlashScript } from "./theme/themeProvider";
import SessionKeepAlive from "@/components/auth/sessionKeepAlive";
import IdleLogout from "@/components/auth/idleLogout";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
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
      className={`${montserrat.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <ThemeProvider>
          <LocaleProvider>
            <SessionKeepAlive />
            <IdleLogout />
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
