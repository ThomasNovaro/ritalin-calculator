import type { Metadata, Viewport } from "next";
import { Anton, Azeret_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "DOSE | PROTOCOL",
  description: "Minimalist dosage calculator",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DOSE",
    statusBarStyle: "black-translucent",
  },
  applicationName: "DOSE",
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
      className={`${anton.variable} ${azeretMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col touch-manipulation overscroll-none bg-black text-white selection:bg-white selection:text-black">
        <div className="fixed inset-0 pointer-events-none z-50 mix-blend-overlay noise-bg opacity-[0.15]" />
        {children}
      </body>
    </html>
  );
}
