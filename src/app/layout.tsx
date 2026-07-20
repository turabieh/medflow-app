import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maali Neurology Clinic",
  description: "Maali Neurology Clinic — Advanced neurological care in Amman, Jordan.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
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
