import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maali Neurology Clinic",
  description: "Maali Neurology Clinic — Advanced neurological care in Amman, Jordan.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Maali Neurology Clinic",
    description: "Advanced neurological care in Amman, Jordan.",
    images: ["/opengraph-image.png"],
  },
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
