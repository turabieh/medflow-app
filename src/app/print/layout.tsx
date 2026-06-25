import { Suspense } from "react";

export default function PrintRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 12mm 14mm;
          /* Suppresses browser header/footer (URL, page number, title) */
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      <Suspense fallback={
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial,sans-serif", color:"#666" }}>
          Loading report...
        </div>
      }>
        {children}
      </Suspense>
    </>
  );
}
