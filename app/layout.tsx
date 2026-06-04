import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mockuper",
  description: "Generate product mockups with AI",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='6' fill='%232563EB'/%3E%3Crect x='9' y='7' width='14' height='14' rx='2.5' fill='%233B82F6' opacity='0.55'/%3E%3Crect x='7' y='9' width='14' height='14' rx='2.5' fill='%2360A5FA' opacity='0.35'/%3E%3Cpath d='M8 22V10h3.2l2.8 6.2L16.8 10H20v12h-2.6v-7.1L14.2 22h-1.4l-3.2-7.1V22H8z' fill='%23fff'/%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
