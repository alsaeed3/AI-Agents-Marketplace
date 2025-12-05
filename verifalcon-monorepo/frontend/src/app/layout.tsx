import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agent Marketplace - Hire AI Agents with Micro-payments",
  description: "Decentralized marketplace for AI Agents. ERC-8004 identity tokens, x402 micro-payments, and reputation-based hiring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
