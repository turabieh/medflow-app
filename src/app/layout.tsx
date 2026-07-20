import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "عيادة معالي للأعصاب | Maali Neurology Clinic",
    template: "%s | عيادة معالي للأعصاب",
  },
  description: "عيادة معالي للأعصاب في عمان، الأردن — رعاية عصبية متقدمة. Maali Neurology Clinic in Amman, Jordan — Advanced neurological care.",
  keywords: ["عيادة معالي", "طب الأعصاب", "عمان", "الأردن", "Maali Neurology", "neurology", "Amman", "Jordan"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "عيادة معالي للأعصاب | Maali Neurology Clinic",
    description: "عيادة معالي للأعصاب في عمان، الأردن. Maali Neurology Clinic in Amman, Jordan.",
    images: ["/opengraph-image.png"],
    locale: "ar_JO",
    alternateLocale: "en_US",
    type: "website",
    url: "https://www.maalineurology.com",
    siteName: "عيادة معالي للأعصاب",
  },
  alternates: {
    canonical: "https://www.maalineurology.com",
    languages: {
      "ar": "https://www.maalineurology.com",
      "en": "https://www.maalineurology.com",
    },
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
