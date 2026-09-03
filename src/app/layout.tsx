import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inventra AI — AI Operating Copilot for SMEs",
  description:
    "Inventra AI turns your business data into decisions: what to do next, which products are at risk, and where you are losing revenue.",
  keywords: [
    "Inventra AI",
    "inventory management",
    "AI business copilot",
    "Cambodian SME",
    "revenue protection",
    "demand forecasting",
  ],
  authors: [{ name: "Inventra AI" }],
  icons: {
    icon: "/inventra-logo.png",
    apple: "/inventra-logo.png",
  },
  openGraph: {
    title: "Inventra AI — Stop Guessing. Start Reordering Smarter.",
    description:
      "An AI business analyst dedicated to your store. Prevent stockouts, protect revenue, and optimize cash flow.",
    siteName: "Inventra AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inventra AI",
    description: "AI-powered inventory intelligence for Cambodian SMEs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
