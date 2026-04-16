import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "dose | protocol",
  description: "dosage calculator",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "dose",
    statusBarStyle: "black-translucent",
  },
  applicationName: "dose",
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
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col touch-manipulation overscroll-none selection:bg-foreground selection:text-background lowercase">
        {children}
      </body>
    </html>
  );
}
