import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedFlow",
  description: "Clinic management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
