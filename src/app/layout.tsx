import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExamOps - MSBTE Polytechnic Exam Management",
  description: "Enterprise exam operations system for MSBTE affiliated polytechnic institutes",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
