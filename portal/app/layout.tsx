import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TARS — Security Dashboard",
  description: "Tactical Analysis and Reporting System — MSP customer portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
