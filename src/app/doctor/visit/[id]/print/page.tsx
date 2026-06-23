import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, visit_date, visit_type, voice_notes, key_clinical_points, clinical_note, patient_summary, heart_rate, blood_pressure, temperature, oxygen_saturation, resp_rate, weight_kg, height_cm, appointment_id, patient_id, doctor_id")
    .eq("id", id)
    .single();

  if (!visit) notFound();

  const [{ data: patient }, { data: doctor }, { data: clinic }, { data: prescriptions }, { data: diagnoses }, { data: labs }] = await Promise.all([
    supabase.from("patients").select("full_name, full_name_ar, dob, gender, blood_type, allergies, phone").eq("id", visit.patient_id).single(),
    supabase.from("users").select("full_name, specialty").eq("id", visit.doctor_id).single(),
    supabase.from("clinics").select("name, name_ar, logo_url, phone, address").limit(1).single(),
    supabase.from("prescriptions").select("medication_name, dose, unit, instructions, duration").eq("visit_id", id),
    supabase.from("visit_diagnoses").select("icd_code, description, is_primary").eq("visit_id", id),
    supabase.from("visit_labs").select("type, name, lab_date, findings").eq("visit_id", id),
  ]);

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const titles: Record<string, string> = {
    note: "Clinical Note",
    prescription: "Prescription",
    summary: "Patient Summary",
  };

  // Parse SOAP sections
  function parseSoap(text: string) {
    const sections = [
      { key: "SUBJECTIVE", label: "S — Subjective" },
      { key: "OBJECTIVE",  label: "O — Objective" },
      { key: "ASSESSMENT", label: "A — Assessment" },
      { key: "PLAN",       label: "P — Plan" },
    ];
    const result: { label: string; text: string }[] = [];
    sections.forEach((sec, idx) => {
      const start = text.indexOf(sec.key + ":");
      if (start === -1) return;
      const nextStarts = sections.slice(idx + 1).map(s => text.indexOf(s.key + ":")).filter(p => p !== -1);
      const end = nextStarts.length ? Math.min(...nextStarts) : text.length;
      const content = text.slice(start + sec.key.length + 1, end).trim();
      if (content) result.push({ label: sec.label, text: content });
    });
    return result;
  }

  const soapSections = visit.clinical_note ? parseSoap(visit.clinical_note) : [];

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${titles[type] ?? "Report"} — ${patient?.full_name ?? "Patient"}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
          .page { max-width: 750px; margin: 0 auto; padding: 40px; }

          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
          .header-left { flex: 1; }
          .clinic-logo { max-height: 55px; max-width: 140px; object-fit: contain; margin-bottom: 6px; display: block; }
          .clinic-name { font-size: 18px; font-weight: 700; color: #111; }
          .clinic-sub { font-size: 11px; color: #666; margin-top: 3px; line-height: 1.5; }
          .header-right { text-align: right; }
          .doc-type { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #333; }
          .doc-date { font-size: 11px; color: #888; margin-top: 6px; }

          /* Patient strip */
          .patient-strip { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .pf-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 2px; }
          .pf-value { font-size: 12px; font-weight: 600; color: #111; }
          .allergies-row { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8e8e8; display: flex; align-items: center; gap: 8px; grid-column: 1/-1; }
          .allergy-badge { background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

          /* Vitals */
          .vitals-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
          .vital-card { border: 1px solid #e8e8e8; border-radius: 5px; padding: 8px 10px; }
          .vital-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; color: #999; margin-bottom: 3px; }
          .vital-value { font-size: 14px; font-weight: 700; color: #111; }
          .vital-unit { font-size: 9px; color: #aaa; margin-left: 2px; }

          /* Section */
          .section { margin-bottom: 20px; }
          .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #777; padding-bottom: 5px; border-bottom: 1px solid #e0e0e0; margin-bottom: 10px; }

          /* SOAP */
          .soap-block { margin-bottom: 14px; }
          .soap-tag { display: inline-block; font-size: 10px; font-weight: 700; background: #1a1a1a; color: #fff; padding: 2px 8px; border-radius: 3px; margin-bottom: 6px; letter-spacing: 0.5px; }
          .soap-body { font-size: 12px; line-height: 1.75; white-space: pre-wrap; color: #222; padding-left: 4px; }

          /* Medications */
          .rx-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .rx-table th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 10px; text-align: left; color: #555; font-weight: 600; }
          .rx-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
          .rx-name { font-weight: 600; }

          /* Diagnosis */
          .dx-list { list-style: none; }
          .dx-item { padding: 6px 0; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .dx-code { font-family: monospace; font-size: 11px; background: #f0f0f0; padding: 1px 6px; border-radius: 3px; color: #333; white-space: nowrap; }
          .dx-primary { font-size: 9px; font-weight: 700; background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 8px; }

          /* Summary (bilingual) */
          .summary-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin-bottom: 12px; }
          .summary-lang { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 8px; }
          .summary-text { font-size: 13px; line-height: 1.8; color: #222; }
          .summary-ar { direction: rtl; text-align: right; font-size: 14px; }

          /* Footer */
          .footer { margin-top: 50px; padding-top: 16px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-clinic { font-size: 11px; color: #666; line-height: 1.6; }
          .sig-block { text-align: center; }
          .sig-line-draw { width: 200px; border-top: 1px solid #333; margin: 40px auto 4px; }
          .sig-name { font-size: 11px; font-weight: 700; color: #333; }
          .sig-specialty { font-size: 10px; color: #888; }

          /* Print button */
          .print-btn { position: fixed; top: 16px; right: 16px; background: #1a1a1a; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; z-index: 100; }
          .print-btn:hover { background: #333; }

          @media print {
            .print-btn { display: none !important; }
            body { background: #fff; }
            .page { padding: 20px; max-width: 100%; }
          }
        `}</style>
      </head>
      <body>
        <button className="print-btn" onClick={() => window.print()}>Print / Save PDF</button>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="header-left">
              {clinic?.logo_url && (
                <img src={clinic.logo_url} alt="Clinic logo" className="clinic-logo" />
              )}
              <div className="clinic-name">{clinic?.name ?? "Clinic"}</div>
              {clinic?.address && <div className="clinic-sub">{clinic.address}</div>}
              {clinic?.phone && <div className="clinic-sub">Tel: {clinic.phone}</div>}
            </div>
            <div className="header-right">
              <div className="doc-type">{titles[type] ?? "Report"}</div>
              <div className="doc-date">{printDate}</div>
            </div>
          </div>

          {/* Patient strip */}
          <div className="patient-strip">
            <div>
              <div className="pf-label">Patient</div>
              <div className="pf-value">{patient?.full_name}</div>
            </div>
            {age !== null && (
              <div>
                <div className="pf-label">Age</div>
                <div className="pf-value">{age} yrs</div>
              </div>
            )}
            <div>
              <div className="pf-label">Gender</div>
              <div className="pf-value" style={{textTransform:"capitalize"}}>{patient?.gender ?? "—"}</div>
            </div>
            <div>
              <div className="pf-label">Blood type</div>
              <div className="pf-value" style={{color:"#dc2626"}}>{patient?.blood_type ?? "—"}</div>
            </div>
            {patient?.allergies && (
              <div className="allergies-row">
                <span className="pf-label" style={{marginBottom:0}}>Allergies:</span>
                {patient.allergies.split(",").map((a: string) => (
                  <span key={a} className="allergy-badge">{a.trim()}</span>
                ))}
              </div>
            )}
          </div>

          {/* Vitals */}
          {(visit.heart_rate || visit.blood_pressure || visit.temperature || visit.oxygen_saturation) && (
            <div className="section">
              <div className="section-title">Vitals</div>
              <div className="vitals-grid">
                {visit.heart_rate && <div className="vital-card"><div className="vital-label">Heart rate</div><div className="vital-value">{visit.heart_rate}<span className="vital-unit">bpm</span></div></div>}
                {visit.blood_pressure && <div className="vital-card"><div className="vital-label">Blood pressure</div><div className="vital-value">{visit.blood_pressure}</div></div>}
                {visit.temperature && <div className="vital-card"><div className="vital-label">Temperature</div><div className="vital-value">{visit.temperature}<span className="vital-unit">°C</span></div></div>}
                {visit.oxygen_saturation && <div className="vital-card"><div className="vital-label">O₂ saturation</div><div className="vital-value">{visit.oxygen_saturation}<span className="vital-unit">%</span></div></div>}
                {visit.resp_rate && <div className="vital-card"><div className="vital-label">Resp. rate</div><div className="vital-value">{visit.resp_rate}<span className="vital-unit">/min</span></div></div>}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {diagnoses && diagnoses.length > 0 && (
            <div className="section">
              <div className="section-title">Diagnosis</div>
              <ul className="dx-list">
                {diagnoses.map((d, i) => (
                  <li key={i} className="dx-item">
                    {d.icd_code && <span className="dx-code">{d.icd_code}</span>}
                    <span>{d.description}</span>
                    {d.is_primary && <span className="dx-primary">Primary</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical Note (SOAP) */}
          {type === "note" && (visit.clinical_note || visit.voice_notes) && (
            <div className="section">
              <div className="section-title">Clinical Note</div>
              {soapSections.length > 0 ? (
                soapSections.map((sec) => (
                  <div key={sec.label} className="soap-block">
                    <div className="soap-tag">{sec.label}</div>
                    <div className="soap-body">{sec.text}</div>
                  </div>
                ))
              ) : (
                <div className="soap-body">{visit.clinical_note || visit.voice_notes}</div>
              )}
              {visit.key_clinical_points && (
                <div className="soap-block" style={{marginTop:"12px"}}>
                  <div className="soap-tag">Key Points</div>
                  <div className="soap-body">{visit.key_clinical_points}</div>
                </div>
              )}
            </div>
          )}

          {/* Prescription */}
          {(type === "note" || type === "prescription") && prescriptions && prescriptions.length > 0 && (
            <div className="section">
              <div className="section-title">Medications</div>
              <table className="rx-table">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Dose</th>
                    <th>Instructions</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx, i) => (
                    <tr key={i}>
                      <td className="rx-name">{rx.medication_name}</td>
                      <td>{[rx.dose, rx.unit].filter(Boolean).join(" ") || "—"}</td>
                      <td>{rx.instructions || "—"}</td>
                      <td>{rx.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Labs */}
          {type === "note" && labs && labs.length > 0 && (
            <div className="section">
              <div className="section-title">Labs & Imaging</div>
              <table className="rx-table">
                <thead><tr><th>Type</th><th>Name</th><th>Date</th><th>Findings</th></tr></thead>
                <tbody>
                  {labs.map((lab, i) => (
                    <tr key={i}>
                      <td style={{textTransform:"capitalize"}}>{lab.type}</td>
                      <td className="rx-name">{lab.name}</td>
                      <td>{lab.lab_date || "—"}</td>
                      <td>{lab.findings || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Patient-Friendly Summary */}
          {type === "summary" && visit.patient_summary && (() => {
            const text = visit.patient_summary;
            const arabicStart = text.indexOf("ملخص بالعربية:");
            const englishText = arabicStart > -1 ? text.slice(0, arabicStart) : text;
            const arabicText = arabicStart > -1 ? text.slice(arabicStart + "ملخص بالعربية:".length).trim() : "";
            const cleanEn = englishText.replace(/English Summary:/i, "").trim();
            return (
              <>
                {cleanEn && (
                  <div className="summary-box">
                    <div className="summary-lang">English Summary</div>
                    <div className="summary-text">{cleanEn}</div>
                  </div>
                )}
                {arabicText && (
                  <div className="summary-box">
                    <div className="summary-lang" style={{textAlign:"right"}}>ملخص بالعربية</div>
                    <div className="summary-text summary-ar">{arabicText}</div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Footer */}
          <div className="footer">
            <div className="footer-clinic">
              <div style={{fontWeight:600}}>{clinic?.name}</div>
              {clinic?.address && <div>{clinic.address}</div>}
              {clinic?.phone && <div>Tel: {clinic.phone}</div>}
              <div style={{marginTop:"4px",color:"#aaa"}}>Date: {printDate}</div>
            </div>
            <div className="sig-block">
              <div className="sig-line-draw"></div>
              <div className="sig-name">{doctor?.full_name}</div>
              {doctor?.specialty && <div className="sig-specialty">{doctor.specialty}</div>}
            </div>
          </div>
        </div>

      </body>
    </html>
  );
}
