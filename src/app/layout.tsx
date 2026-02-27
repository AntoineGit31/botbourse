import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import DisclaimerStrip from "@/components/layout/DisclaimerStrip";
import Footer from "@/components/layout/Footer";
import { I18nProvider } from "@/components/I18nProvider";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BotBourse — Model-Driven Market Views",
    template: "%s | BotBourse",
  },
  description:
    "Quantitative market analysis for stocks and ETFs. Model-generated predictions, risk scores, and trend signals — for informational purposes only.",
  keywords: [
    "stock market",
    "ETF analysis",
    "market predictions",
    "quantitative analysis",
    "AI market signals",
  ],
  openGraph: {
    title: "BotBourse — Model-Driven Market Views",
    description:
      "Quantitative market analysis for stocks and ETFs. Model-generated predictions and risk signals.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          style={{
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            minHeight: "100dvh",
          }}
        >
          <I18nProvider>
            <Navbar />
            <DisclaimerStrip />

            {/* Main content — offset for fixed nav (52px) + disclaimer (~32px) */}
            <main
              style={{
                paddingTop: "calc(52px + 32px)",
                minHeight: "100dvh",
              }}
            >
              {children}
            </main>

            <Footer />
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
