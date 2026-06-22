"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // Small delay to let the page render fully before opening print dialog
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print" style={{ marginBottom: "16px", textAlign: "right" }}>
      <button
        onClick={() => window.print()}
        style={{
          background: "#111",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        🖨 Print
      </button>
    </div>
  );
}
