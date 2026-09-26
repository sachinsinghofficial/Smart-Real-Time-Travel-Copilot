import AppProvider from "@/app/components/AppProvider";
import type { Metadata } from "next";
import "./globals.css";
import "./shell.css";
import { Navbar } from "@/app/components/Navbar";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "TravelSetu — Travel Smarter. Travel Safer.",
  description: "AI-powered adaptive travel planning for smarter and safer journeys.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Navbar />
        <div className="app-workspace"><AppProvider />
        {children}
        <Footer /></div>
      </body>
    </html>
  );
}
