// Bypass the doctor layout so the print page renders as a standalone HTML document
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
