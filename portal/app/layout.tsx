import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { THEME_BOOTSTRAP_SCRIPT } from "../lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TARS — Security Dashboard",
  description: "Tactical Analysis and Reporting System — MSP customer portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <AmbientBackdrop />
        {children}
      </body>
    </html>
  );
}
