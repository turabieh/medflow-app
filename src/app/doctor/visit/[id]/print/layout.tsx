import type { Metadata } from "next";

export const metadata: Metadata = { title: " " };

// Completely bypass the doctor layout — print page is standalone
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#fff" }}>
        {children}
      </body>
    </html>
  );
}
