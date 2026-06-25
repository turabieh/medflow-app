import { Suspense } from "react";

export default function PrintRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 14mm 14mm;
          /* These suppress browser-generated headers and footers */
          margin-top: 8mm;
          margin-bottom: 8mm;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        @media print {
          .no-print { display: none !important; }
          /* Only the data table gets borders — not header/footer */
          table.data-table th,
          table.data-table td {
            border: 1px solid #ccc !important;
          }
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
