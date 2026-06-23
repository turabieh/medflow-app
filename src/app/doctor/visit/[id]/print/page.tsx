import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintTrigger } from "@/components/secretary/print-trigger";

export default async function VisitPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type = "note" } = await searchParams;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, voice_notes, key_clinical_points, clinical_note, heart_rate, blood_pressure, temperature, oxygen_saturation, resp_rate, weight_kg, height_cm, appointment_id, patient_id, doctor_id")
    .eq("id", id)
    .single();

  if (!visit) notFound();

  const [{ data: patient }, { data: doctor }, { data: clinic }, { data: prescriptions }, { data: diagnoses }, { data: labs }] = await Promise.all([
    supabase.from("patients").select("full_name, full_name_ar, dob, gender, blood_type, allergies, phone").eq("id", visit.patient_id).single(),
    supabase.from("users").select("full_name, specialty").eq("id", visit.doctor_id).single(),
    supabase.from("clinics").select("name, logo_url").limit(1).single(),
    supabase.from("prescriptions").select("medication_name, dose, unit, instructions, duration").eq("visit_id", id),
    supabase.from("visit_diagnoses").select("icd_code, description, is_primary").eq("visit_id", id),
    supabase.from("visit_labs").select("type, name, lab_date, findings").eq("visit_id", id),
  ]);

  const printDate = new Date().toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
  const age = patient?.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  const titles: Record<string, string> = {
    note: "Clinical Note",
    prescription: "Prescription",
    summary: "Patient Visit Summary",
  };

  return (
    <html>
      <head>
        <title>{`${titles[type] ?? "Report"} — ${patient?.full_name}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
          .clinic-name { font-size: 18px; font-weight: bold; }
          .doc-title { font-size: 14px; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 8px; font-weight: bold; }
          .row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
          .field .label { font-size: 10px; color: #888; }
          .field .value { font-size: 12px; font-weight: 500; }
          .allergy { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; display: inline-block; margin: 2px; font-size: 11px; }
          .note-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; background: #fafafa; min-height: 80px; white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
          .rx-item { border-bottom: 1px solid #eee; padding: 6px 0; }
          .rx-name { font-weight: 600; }
          .dx-item { padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
          .primary-badge { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-left: 6px; }
          .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; display: flex; justify-content: space-between; }
          .sig-line { width: 180px; border-top: 1px solid #111; margin-top: 40px; text-align: center; font-size: 10px; color: #666; padding-top: 4px; }
          @media print { body { padding: 20px; } .no-print { display: none !important; } }
        `}</style>
      </head>
      <body>
        <PrintTrigger />

        <div className="header">
          {clinic?.logo_url && <img src={clinic.logo_url} alt="logo" style={{height:"50px",objectFit:"contain",marginBottom:"8px"}} />}
          <div className="clinic-name">{clinic?.name ?? "Clinic"}</div>
          <div className="doc-title">{titles[type] ?? "Report"}</div>
          <div style={{fontSize:"11px",color:"#888",marginTop:"4px"}}>{printDate}</div>
        </div>

        <div className="section">
          <div className="section-title">Patient</div>
          <div className="row">
            <div className="field"><div className="label">Name</div><div className="value">{patient?.full_name}</div></div>
            {age !== null && <div className="field"><div className="label">Age</div><div className="value">{age} years</div></div>}
            <div className="field"><div className="label">Gender</div><div className="value" style={{textTransform:"capitalize"}}>{patient?.gender ?? "—"}</div></div>
            <div className="field"><div className="label">Blood type</div><div className="value" style={{color:"#dc2626"}}>{patient?.blood_type ?? "—"}</div></div>
          </div>
          {patient?.allergies && (
            <div style={{marginTop:"6px"}}>
              <div className="label" style={{fontSize:"10px",color:"#888",marginBottom:"3px"}}>Allergies</div>
              {patient.allergies.split(",").map((a: string) => <span key={a} className="allergy">{a.trim()}</span>)}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-title">Visit — {doctor?.full_name}{doctor?.specialty && ` (${doctor.specialty})`}</div>
          <div className="row">
            <div className="field"><div className="label">Date</div><div className="value">{visit.visit_date ?? printDate}</div></div>
            <div className="field"><div className="label">Type</div><div className="value" style={{textTransform:"capitalize"}}>{visit.visit_type}</div></div>
          </div>
        </div>

        {(visit.heart_rate || visit.blood_pressure || visit.temperature) && (
          <div className="section">
            <div className="section-title">Vitals</div>
            <div className="row">
              {visit.heart_rate && <div className="field"><div className="label">Heart rate</div><div className="value">{visit.heart_rate} bpm</div></div>}
              {visit.blood_pressure && <div className="field"><div className="label">Blood pressure</div><div className="value">{visit.blood_pressure}</div></div>}
              {visit.temperature && <div className="field"><div className="label">Temperature</div><div className="value">{visit.temperature}°C</div></div>}
              {visit.oxygen_saturation && <div className="field"><div className="label">O₂ sat</div><div className="value">{visit.oxygen_saturation}%</div></div>}
            </div>
          </div>
        )}

        {diagnoses && diagnoses.length > 0 && (
          <div className="section">
            <div className="section-title">Diagnosis</div>
            {diagnoses.map((d, i) => (
              <div key={i} className="dx-item">
                {d.icd_code && <span style={{fontFamily:"monospace",color:"#888",marginRight:"8px",fontSize:"11px"}}>{d.icd_code}</span>}
                {d.description}
                {d.is_primary && <span className="primary-badge">Primary</span>}
              </div>
            ))}
          </div>
        )}

        {type === "note" && (visit.clinical_note || visit.voice_notes || visit.key_clinical_points) && (
          <div className="section">
            <div className="section-title">Clinical Notes</div>
            {visit.clinical_note && <div className="note-box">{visit.clinical_note}</div>}
            {!visit.clinical_note && visit.voice_notes && (
              <>
                <div className="label" style={{fontSize:"10px",color:"#888",margin:"6px 0 3px"}}>Voice notes</div>
                <div className="note-box">{visit.voice_notes}</div>
              </>
            )}
            {visit.key_clinical_points && (
              <>
                <div className="label" style={{fontSize:"10px",color:"#888",margin:"8px 0 3px"}}>Key clinical points</div>
                <div className="note-box">{visit.key_clinical_points}</div>
              </>
            )}
          </div>
        )}

        {(type === "prescription" || type === "note") && prescriptions && prescriptions.length > 0 && (
          <div className="section">
            <div className="section-title">Medications</div>
            {prescriptions.map((rx, i) => (
              <div key={i} className="rx-item">
                <span className="rx-name">{rx.medication_name}</span>
                {(rx.dose || rx.unit) && <span style={{marginLeft:"8px",color:"#555"}}>{rx.dose} {rx.unit}</span>}
                {rx.instructions && <span style={{marginLeft:"8px",color:"#888"}}>· {rx.instructions}</span>}
                {rx.duration && <span style={{marginLeft:"8px",color:"#888"}}>· {rx.duration}</span>}
              </div>
            ))}
          </div>
        )}

        {labs && labs.length > 0 && type === "note" && (
          <div className="section">
            <div className="section-title">Labs &amp; Imaging</div>
            {labs.map((lab, i) => (
              <div key={i} className="rx-item">
                <span className="rx-name">{lab.name}</span>
                <span style={{marginLeft:"8px",color:"#888",textTransform:"capitalize",fontSize:"11px"}}>({lab.type})</span>
                {lab.lab_date && <span style={{marginLeft:"8px",color:"#888"}}>{lab.lab_date}</span>}
                {lab.findings && <div style={{color:"#555",marginTop:"2px",fontSize:"11px"}}>{lab.findings}</div>}
              </div>
            ))}
          </div>
        )}

        {type === "summary" && (
          <div className="section">
            <div className="section-title">Patient Summary</div>
            <div className="note-box" style={{minHeight:"100px"}}>
              {visit.clinical_note ?? "Summary to be completed by physician."}
            </div>
          </div>
        )}

        <div className="footer">
          <div className="sig-line">Doctor&apos;s signature</div>
          <div className="sig-line">Clinic stamp</div>
        </div>
      </body>
    </html>
  );
}
