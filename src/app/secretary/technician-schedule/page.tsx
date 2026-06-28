import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayClinic } from "@/lib/clinic-timezone";
import { TechBookingForm } from "./tech-booking-form";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string,string> = {
  scheduled:"text-blue-600", in_progress:"text-amber-600",
  done:"text-green-600", cancelled:"text-neutral-400", no_show:"text-red-400",
};
const PAY_BADGE: Record<string,string> = {
  cash:"💵", card:"💳", insurance:"🏥",
};

export default async function SecretaryTechSchedulePage({
  searchParams,
}: { searchParams: Promise<{ date?: string }> }) {
  const { date: paramDate } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const today = todayClinic();
  const date  = paramDate ?? today;

  const [
    { data: technicians },
    { data: procedures },
    { data: appointments },
    { data: patients },
    { data: insuranceCompanies },
  ] = await Promise.all([
    supabase.from("users").select("id, full_name")
      .eq("clinic_id", profile.clinic_id).eq("role", "technician").eq("is_active", true).order("full_name"),
    supabase.from("technician_procedures").select("id, name, price, duration_min, category")
      .eq("clinic_id", profile.clinic_id).eq("is_active", true).order("category").order("name"),
    supabase.from("technician_appointments")
      .select("id, start_time, end_time, status, technician_id, payment_method, insurance_auth_status, patients(full_name, phone), technician_procedures(name, price, duration_min), users!technician_appointments_technician_id_fkey(full_name)")
      .eq("clinic_id", profile.clinic_id).eq("appt_date", date).order("start_time"),
    supabase.from("patients").select("id, full_name, phone")
      .eq("clinic_id", profile.clinic_id).order("full_name").limit(300),
    supabase.from("insurance_companies").select("id, name")
      .eq("clinic_id", profile.clinic_id).eq("is_active", true).order("name"),
  ]);

  const prev = new Date(date); prev.setDate(prev.getDate() - 1);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  const fmt  = (d: Date) => d.toLocaleDateString("en-CA");

  // Slot data for booking form
  const existingSlots = (appointments ?? []).map(a => ({
    start_time:    (a.start_time as string) ?? "00:00",
    end_time:      a.end_time as string | null,
    technician_id: (a as Record<string,unknown>).technician_id as string,
    status:        a.status as string,
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">🔬 Technician Schedule</h1>
        <Link href="/secretary/dashboard" className="text-sm text-neutral-500 hover:text-neutral-700">← Dashboard</Link>
      </div>

      {/* Date nav */}
      <div className="mb-5 flex items-center gap-3">
        <Link href={`?date=${fmt(prev)}`} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">←</Link>
        <span className="text-sm font-semibold text-neutral-800">{date === today ? "Today — " : ""}{date}</span>
        <Link href={`?date=${fmt(next)}`} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">→</Link>
        {date !== today && <Link href="?" className="text-xs text-blue-600 hover:underline">Today</Link>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Schedule */}
        <div className="col-span-2">
          {(appointments ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-neutral-500">No technician appointments for {date}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              {(appointments ?? []).map((a, i) => {
                const p    = (Array.isArray(a.patients)?a.patients[0]:a.patients) as {full_name:string;phone:string}|null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const proc = (Array.isArray(a.technician_procedures)?a.technician_procedures[0]:a.technician_procedures) as {name:string;price:number|null}|null|any;
                const tech = (Array.isArray(a.users)?a.users[0]:a.users) as {full_name:string}|null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ar   = a as any;
                return (
                  <div key={a.id as string} className={`flex items-center gap-4 px-4 py-3 ${i>0?"border-t border-neutral-100":""}`}>
                    <div className="w-14 flex-shrink-0 text-center">
                      <p className="font-mono text-sm font-bold text-neutral-800">{(a.start_time as string)?.slice(0,5)}</p>
                      {a.end_time && <p className="font-mono text-[10px] text-neutral-400">{(a.end_time as string)?.slice(0,5)}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{p?.full_name}</p>
                      <p className="text-xs text-neutral-400">
                        {proc?.name}{proc?.price ? ` · ${Number(proc.price)} JOD` : ""} · {tech?.full_name}
                      </p>
                    </div>
                    {/* Payment badge */}
                    {ar.payment_method && (
                      <span className="text-sm" title={String(ar.payment_method)}>
                        {String(PAY_BADGE[ar.payment_method as string] ?? "")}
                        {ar.payment_method === "insurance" && (() => {
                          const s = ar.insurance_auth_status as string;
                          return (
                            <span className={`ml-1 text-[10px] font-bold ${s==="approved"?"text-green-600":s==="rejected"?"text-red-500":"text-amber-500"}`}>
                              {s==="approved"?"✓":s==="rejected"?"✗":"⏳"}
                            </span>
                          );
                        })()}
                      </span>
                    )}
                    <span className={`text-xs font-semibold capitalize ${STATUS_COLOR[a.status as string]}`}>
                      {(a.status as string)?.replace("_"," ")}
                    </span>
                    <Link href={`/technician/appointments/${a.id}`}
                      className="text-xs text-blue-600 hover:underline flex-shrink-0">View →</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking form */}
        <div>
          <TechBookingForm
            date={date}
            clinicId={profile.clinic_id}
            technicians={technicians ?? []}
            procedures={procedures ?? []}
            patients={patients ?? []}
            insuranceCompanies={insuranceCompanies ?? []}
            existingAppts={existingSlots}
          />
        </div>
      </div>
    </div>
  );
}
