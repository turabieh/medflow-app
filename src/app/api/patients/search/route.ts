import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json({ patients: [] });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, full_name_ar, phone")
    .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(8);

  if (error) {
    return NextResponse.json({ patients: [] });
  }

  return NextResponse.json({ patients: data ?? [] });
}
