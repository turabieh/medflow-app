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
          .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
          .clinic-name { font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }
          .doc-title { font-size: 13px; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px; color: #555; }
          .print-date { font-size: 11px; color: #888; margin-top: 6px; }
          .section { margin-bottom: 18px; }
          .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; font-weight: bold; }
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 10px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 10px; }
          .field .label { font-size: 10px; color: #888; margin-bottom: 2px; }
          .field .value { font-size: 12px; font-weight: 500; }
          .allergy { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; display: inline-block; margin: 2px 2px 2px 0; font-size: 11px; }
          .soap-section { margin-bottom: 14px; }
          .soap-label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; margin-bottom: 4px; border-left: 3px solid #111; padding-left: 8px; }
          .soap-text { font-size: 12px; line-height: 1.7; white-space: pre-wrap; padding-left: 12px; color: #222; }
          .rx-item { padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
          .rx-name { font-weight: 600; }
          .dx-item { padding: 4px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; }
          .primary-badge { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-left: 6px; }
          .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-info { font-size: 11px; color: #666; line-height: 1.6; }
          .sig-block { text-align: center; }
          .sig-line { width: 200px; border-top: 1px solid #111; padding-top: 4px; font-size: 10px; color: #666; margin-top: 40px; }
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
          <div className="grid-4">
            <div className="field"><div className="label">Full name</div><div className="value">{patient?.full_name}</div></div>
            {age !== null && <div className="field"><div className="label">Age</div><div className="value">{age} years</div></div>}
            <div className="field"><div className="label">Gender</div><div className="value" style={{textTransform:"capitalize"}}>{patient?.gender ?? "—"}</div></div>
            <div className="field"><div className="label">Blood type</div><div className="value" style={{color:"#dc2626"}}>{patient?.blood_type ?? "—"}</div></div>
          </div>
          {patient?.allergies && (
            <div style={{marginTop:"6px"}}>
              <div style={{fontSize:"10px",color:"#888",marginBottom:"4px"}}>Allergies</div>
              {patient.allergies.split(",").map((a: string) => <span key={a} className="allergy">{a.trim()}</span>)}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-title">Visit</div>
          <div className="grid-4">
            <div className="field"><div className="label">Date</div><div className="value">{visit.visit_date ?? printDate}</div></div>
            <div className="field"><div className="label">Type</div><div className="value" style={{textTransform:"capitalize"}}>{visit.visit_type}</div></div>
            <div className="field"><div className="label">Physician</div><div className="value">{doctor?.full_name ?? "—"}</div></div>
            {doctor?.specialty && <div className="field"><div className="label">Specialty</div><div className="value">{doctor.specialty}</div></div>}
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
            <div className="section-title">Clinical Note</div>
            {visit.clinical_note ? (() => {
              // Parse SOAP sections from plain text
              const noteText = visit.clinical_note;
              const sections = [
                { key: "SUBJECTIVE", label: "S — Subjective" },
                { key: "OBJECTIVE",  label: "O — Objective" },
                { key: "ASSESSMENT", label: "A — Assessment" },
                { key: "PLAN",       label: "P — Plan" },
              ];
              const parsed: { label: string; text: string }[] = [];
              sections.forEach((sec, idx) => {
                const start = noteText.indexOf(sec.key + ":");
                if (start === -1) return;
                const nextStart = sections.slice(idx + 1).reduce((min, s) => {
                  const pos = noteText.indexOf(s.key + ":");
                  return pos !== -1 && pos < min ? pos : min;
                }, noteText.length);
                const text = noteText.slice(start + sec.key.length + 1, nextStart).trim();
                parsed.push({ label: sec.label, text });
              });

              if (parsed.length === 0) {
                return <div style={{whiteSpace:"pre-wrap",lineHeight:"1.7",fontSize:"12px"}}>{noteText}</div>;
              }

              return (
                <div>
                  {parsed.map(s => (
                    <div key={s.label} className="soap-section">
                      <div className="soap-label">{s.label}</div>
                      <div className="soap-text">{s.text}</div>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div>
                {visit.voice_notes && (
                  <div className="soap-section">
                    <div className="soap-label">Voice Notes</div>
                    <div className="soap-text">{visit.voice_notes}</div>
                  </div>
                )}
                {visit.key_clinical_points && (
                  <div className="soap-section">
                    <div className="soap-label">Key Clinical Points</div>
                    <div className="soap-text">{visit.key_clinical_points}</div>
                  </div>
                )}
              </div>
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
          <div className="footer-info">
            <div style={{fontWeight:"600",marginBottom:"2px"}}>{clinic?.name ?? "Clinic"}</div>
            <div style={{color:"#888"}}>Date: {printDate}</div>
          </div>
          <div className="sig-block">
            <div className="sig-line">
              {doctor?.full_name ?? "Physician"}
              {doctor?.specialty && <div style={{color:"#888"}}>{doctor.specialty}</div>}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
