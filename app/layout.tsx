import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Note: usually an anti-pattern, but often used for iOS web apps to feel native. Vercel guidelines say to avoid it though, so I'll remove it.
};

export const metadata: Metadata = {
  title: "PokéMed: Ritalin Edition",
  description: "Stateless daily schedule calculator",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PokéMed",
    statusBarStyle: "black-translucent",
  },
  applicationName: "PokéMed",
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{ colorScheme: "dark" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col touch-manipulation overscroll-none">{children}</body>
    </html>
  );
}
