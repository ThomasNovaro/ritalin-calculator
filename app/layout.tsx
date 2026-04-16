import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on mobile inputs
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
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased dark`}
    >
      <body className="font-sans min-h-full flex flex-col touch-manipulation overscroll-none bg-[#F4F4F0] dark:bg-[#0A0A0A] selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
