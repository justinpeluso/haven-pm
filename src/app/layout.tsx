import type { Metadata } from "next";
import { Bangers, Geist, Geist_Mono, IBM_Plex_Sans, Oxanium } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@/components/party-chronicle/party-chronicle.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pcDisplay = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pc-display",
});

const pcHud = Oxanium({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-pc-hud",
});

const pcBody = IBM_Plex_Sans({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-pc-body",
});

export const metadata: Metadata = {
  title: "Haven PM — Property Management",
  description: "Modern property management platform for leasing, maintenance, and tenant communication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pcDisplay.variable} ${pcHud.variable} ${pcBody.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
