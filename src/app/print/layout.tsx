import { Suspense } from "react";

export default function PrintRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial,sans-serif", color:"#666" }}>
        Loading report...
      </div>
    }>
      {children}
    </Suspense>
  );
}
