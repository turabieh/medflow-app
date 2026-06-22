import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintTrigger } from "@/components/secretary/print-trigger";

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; patientId?: string }>;
}) {
  const { type, patientId } = await searchParams;

  if (!patientId || !type) notFound();

  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*, insurance_companies(name)")
    .eq("id", patientId)
    .single();

  if (!patient) notFound();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, name_ar, logo_url")
    .limit(1)
    .single();

  // Get the most recent finalized/done appointment
  const { data: lastAppt } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, visit_type, doctor_id, users(full_name), appointment_symptoms(symptoms_catalog(name))")
    .eq("patient_id", patientId)
    .in("status", ["done", "finalized"])
    .order("appt_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const doctor = lastAppt
    ? (Array.isArray(lastAppt.users) ? lastAppt.users[0] : lastAppt.users)
    : null;

  const symptoms = (lastAppt?.appointment_symptoms ?? [])
    .map((s: { symptoms_catalog: { name: string } | { name: string }[] | null }) => {
      const cat = Array.isArray(s.symptoms_catalog) ? s.symptoms_catalog[0] : s.symptoms_catalog;
      return cat?.name ?? "";
    })
    .filter(Boolean);

  const printDate = new Date().toLocaleDateString("en", {
    year: "numeric", month: "long", day: "numeric",
  });

  const insuranceCompany = Array.isArray(patient.insurance_companies)
    ? patient.insurance_companies[0]
    : patient.insurance_companies;

  return (
    <html>
      <head>
        <title>{`${type} - ${patient.full_name}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
          .clinic-name { font-size: 20px; font-weight: bold; }
          .doc-title { font-size: 16px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; color: #444; }
          .print-date { font-size: 11px; color: #666; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
          .row { display: flex; gap: 16px; margin-bottom: 6px; }
          .field { flex: 1; }
          .label { font-size: 10px; color: #666; }
          .value { font-size: 12px; font-weight: 500; }
          .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; display: flex; justify-content: space-between; }
          .signature-line { width: 180px; border-top: 1px solid #111; margin-top: 40px; text-align: center; font-size: 10px; color: #666; padding-top: 4px; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        `}</style>
      </head>
      <body>
        <PrintTrigger />

        <div className="header">
          {clinic?.logo_url && (
            <img src={clinic.logo_url} alt="Clinic logo" style={{height:"60px",objectFit:"contain",marginBottom:"8px"}} />
          )}
          <div className="clinic-name">{clinic?.name ?? "Clinic"}</div>
          <div className="doc-title">
            {type === "summary" && "Patient Visit Summary"}
            {type === "confirmation" && "Appointment Confirmation"}
            {type === "invoice" && "Invoice / Bill"}
            {type === "prescription" && "Prescription"}
            {type === "referral" && "Doctor's Referral Letter"}
          </div>
          <div className="print-date">{printDate}</div>
        </div>

        <div className="section">
          <div className="section-title">Patient information</div>
          <div className="row">
            <div className="field"><div className="label">Full name</div><div className="value">{patient.full_name}</div></div>
            {patient.full_name_ar && <div className="field"><div className="label">الاسم</div><div className="value" dir="rtl">{patient.full_name_ar}</div></div>}
          </div>
          <div className="row">
            <div className="field"><div className="label">Phone</div><div className="value">{patient.phone}</div></div>
            {patient.dob && <div className="field"><div className="label">Date of birth</div><div className="value">{patient.dob}</div></div>}
            {patient.gender && <div className="field"><div className="label">Gender</div><div className="value" style={{textTransform:"capitalize"}}>{patient.gender}</div></div>}
          </div>
          {insuranceCompany && (
            <div className="row">
              <div className="field"><div className="label">Insurance</div><div className="value">{insuranceCompany.name}</div></div>
              {patient.insurance_policy_number && <div className="field"><div className="label">Policy number</div><div className="value">{patient.insurance_policy_number}</div></div>}
            </div>
          )}
        </div>

        {lastAppt && (
          <div className="section">
            <div className="section-title">Visit details</div>
            <div className="row">
              <div className="field"><div className="label">Date</div><div className="value">{lastAppt.appt_date}</div></div>
              <div className="field"><div className="label">Time</div><div className="value">{lastAppt.start_time?.slice(0,5) ?? "—"}</div></div>
              <div className="field"><div className="label">Type</div><div className="value" style={{textTransform:"capitalize"}}>{lastAppt.visit_type}</div></div>
            </div>
            {doctor && (
              <div className="row">
                <div className="field"><div className="label">Doctor</div><div className="value">{doctor.full_name}</div></div>
              </div>
            )}
            {symptoms.length > 0 && (
              <div className="row">
                <div className="field"><div className="label">Presenting symptoms</div><div className="value">{symptoms.join(", ")}</div></div>
              </div>
            )}
          </div>
        )}

        {type === "invoice" && (
          <div className="section">
            <div className="section-title">Billing</div>
            <p style={{color:"#666",fontSize:"11px"}}>Invoice details will be completed by billing staff. Procedures and amounts to be filled in.</p>
            <div style={{marginTop:"16px",border:"1px solid #ddd",borderRadius:"4px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"8px",padding:"8px",borderBottom:"1px solid #ddd",fontWeight:"bold",fontSize:"11px"}}>
                <span>Description</span><span>Qty</span><span>Amount (JOD)</span>
              </div>
              {[1,2,3].map((i) => (
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"8px",padding:"8px 8px",borderBottom:"1px solid #eee",fontSize:"11px"}}>
                  <span style={{borderBottom:"1px dotted #ccc",minHeight:"16px"}}></span>
                  <span style={{borderBottom:"1px dotted #ccc",width:"40px"}}></span>
                  <span style={{borderBottom:"1px dotted #ccc",width:"60px"}}></span>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",padding:"8px",fontWeight:"bold",fontSize:"12px"}}>
                <span style={{textAlign:"right"}}>Total:</span>
                <span style={{borderBottom:"1px solid #111",width:"60px"}}></span>
              </div>
            </div>
          </div>
        )}

        {type === "prescription" && (
          <div className="section">
            <div className="section-title">Prescribed medications</div>
            <p style={{color:"#666",fontSize:"11px",marginBottom:"16px"}}>To be completed by the physician.</p>
            {[1,2,3,4].map((i) => (
              <div key={i} style={{borderBottom:"1px dotted #ccc",marginBottom:"20px",paddingBottom:"4px",fontSize:"11px",color:"#999"}}>
                {i}. _____________________________________________________ Dose: __________ Freq: __________ Duration: __________
              </div>
            ))}
          </div>
        )}

        {type === "referral" && (
          <div className="section">
            <div className="section-title">Referral details</div>
            <p style={{marginBottom:"12px",lineHeight:"1.8"}}>
              Dear colleague, we are referring the above-named patient to your care.
            </p>
            <div style={{marginBottom:"8px"}}>
              <div className="label">Referred to specialist / department:</div>
              <div style={{borderBottom:"1px dotted #ccc",height:"24px",marginTop:"4px"}}></div>
            </div>
            <div style={{marginBottom:"8px"}}>
              <div className="label">Reason for referral:</div>
              <div style={{borderBottom:"1px dotted #ccc",height:"24px",marginTop:"4px"}}></div>
              <div style={{borderBottom:"1px dotted #ccc",height:"24px",marginTop:"8px"}}></div>
            </div>
          </div>
        )}

        <div className="footer">
          <div className="signature-line">Doctor&apos;s signature</div>
          <div className="signature-line">Clinic stamp</div>
        </div>
      </body>
    </html>
  );
}
