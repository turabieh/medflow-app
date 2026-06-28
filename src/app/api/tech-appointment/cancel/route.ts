import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const id   = form.get("id") as string;
  if (!id) return NextResponse.redirect(new URL("/secretary/technician-schedule", req.url));

  const supabase = await createClient();
  await supabase.from("technician_appointments")
    .update({ status: "cancelled" }).eq("id", id);

  return NextResponse.redirect(new URL("/secretary/technician-schedule", req.url));
}
