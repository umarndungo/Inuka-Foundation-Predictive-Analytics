import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inuka Sentinel | Predictive Intelligence Dashboard",
  description: "Real-time predictive analytics and field operations intelligence for Inuka Foundation",
  keywords: ["predictive analytics", "beneficiary risk", "field operations", "Inuka Foundation", "dashboard"],
  authors: [{ name: "Inuka Foundation" }],
  openGraph: {
    title: "Inuka Sentinel",
    description: "Predictive Intelligence & Program Automation",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}