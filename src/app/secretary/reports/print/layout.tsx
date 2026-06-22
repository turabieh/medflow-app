// The print page opens in a new tab and renders raw HTML for the
// browser's print dialog. It must NOT include the secretary sidebar
// layout, so we override the layout for this route specifically by
// providing a minimal wrapper that lets the page render as a full
// standalone document.
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
