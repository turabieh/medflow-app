import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const visitId = request.nextUrl.searchParams.get("visitId");
  if (!visitId) return NextResponse.json({ error: "Missing visitId" }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("visits")
    .select("patient_id")
    .eq("id", visitId)
    .single();

  return NextResponse.json({ patientId: data?.patient_id ?? null });
}
