import { redirect } from "next/navigation";

// Inpatient visits use the same visit page as outpatients for consistency
export default async function InpatientVisitRedirect({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { visitId } = await params;
  redirect(`/doctor/visit/${visitId}`);
}
