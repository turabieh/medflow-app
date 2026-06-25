import { NursePage } from "./nurse-client";

export const dynamic = "force-dynamic";

// Fully public page — no server-side data fetching, all done client-side
export default function NursePublicPage() {
  return <NursePage />;
}
