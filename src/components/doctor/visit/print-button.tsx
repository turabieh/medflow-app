"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        background: "#1a1a1a",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        zIndex: 100,
      }}
    >
      Print / Save PDF
    </button>
  );
}
