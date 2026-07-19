"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Doctor { id: string; full_name: string; specialty: string | null; }

export default function SecretaryNewPatientPage() {
  const router = useRouter();

  // EN name parts
  const [firstName,   setFirstName]   = useState("");
  const [middleName,  setMiddleName]  = useState("");
  const [lastName,    setLastName]    = useState("");
  // AR name parts
  const [firstNameAr, setFirstNameAr] = useState("");
  const [middleNameAr,setMiddleNameAr]= useState("");
  const [lastNameAr,  setLastNameAr]  = useState("");

  const [phone,     setPhone]     = useState("");
  const [dob,       setDob]       = useState("");
  const [gender,    setGender]    = useState("");
  const [address,   setAddress]   = useState("");
  const [doctorId,  setDoctorId]  = useState("");
  const [doctors,   setDoctors]   = useState<Doctor[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [referralSource,       setReferralSource]       = useState("");
  const [referralSourceDetail, setReferralSourceDetail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("users").select("id, full_name, specialty")
      .eq("role", "doctor").eq("is_active", true).order("full_name")
      .then(({ data }) => {
        setDoctors(data ?? []);
        if (data?.length === 1) setDoctorId(data[0].id);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) { setError("First name is required."); return; }
    if (!phone.trim())     { setError("Phone number is required."); return; }

    setLoading(true); setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

    const { data: patient, error: pe } = await supabase.from("patients").insert({
      clinic_id:        profile?.clinic_id,
      first_name:       firstName.trim(),
      middle_name:      middleName.trim() || null,
      last_name:        lastName.trim() || null,
      first_name_ar:    firstNameAr.trim() || null,
      middle_name_ar:   middleNameAr.trim() || null,
      last_name_ar:     lastNameAr.trim() || null,
      phone:            phone.trim(),
      dob:              dob || null,
      gender:           gender || null,
      address:          address.trim() || null,
      preferred_doctor_id:      doctorId || null,
      referral_source:          referralSource || null,
      referral_source_detail:   referralSourceDetail.trim() || null,
    }).select("id").single();

    setLoading(false);
    if (pe || !patient) { setError(pe?.message ?? "Could not save patient."); return; }
    router.push(`/secretary/patients/${patient.id}`);
  }

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";
  const lbl = "mb-1 block text-xs font-medium text-neutral-600";

  // Preview computed full name
  const previewEN = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const previewAR = [firstNameAr, middleNameAr, lastNameAr].filter(Boolean).join(" ");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/secretary/patients" className="text-sm text-neutral-500 hover:text-neutral-700">← Patients</Link>
        <span className="text-neutral-300">/</span>
        <span className="text-sm text-neutral-700">New Patient</span>
      </div>

      <h1 className="mb-6 text-lg font-medium text-neutral-900">Add New Patient</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

        {/* Assign Doctor */}
        {doctors.length > 0 && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <label className="mb-1.5 block text-sm font-semibold text-indigo-900">Assigned Doctor</label>
            <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
              className="w-full rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">— No specific doctor —</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}{d.specialty ? ` · ${d.specialty}` : ""}</option>
              ))}
            </select>
          </div>
        )}

        {/* English Name */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-900">Name (English)</h2>
            {previewEN && <span className="text-xs text-neutral-500">Preview: <strong>{previewEN}</strong></span>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required
                placeholder="Ahmad" className={inp} />
            </div>
            <div>
              <label className={lbl}>Middle Name <span className="text-neutral-400">(optional)</span></label>
              <input value={middleName} onChange={e => setMiddleName(e.target.value)}
                placeholder="Mahmoud" className={inp} />
            </div>
            <div>
              <label className={lbl}>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Hassan" className={inp} />
            </div>
          </div>
        </div>

        {/* Arabic Name */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-900">الاسم (عربي)</h2>
            {previewAR && <span className="text-xs text-neutral-500 font-medium" dir="rtl">{previewAR}</span>}
          </div>
          <div className="grid grid-cols-3 gap-3" dir="rtl">
            <div>
              <label className={`${lbl} text-right`}>الاسم الأول *</label>
              <input value={firstNameAr} onChange={e => setFirstNameAr(e.target.value)}
                placeholder="أحمد" className={`${inp} text-right`} />
            </div>
            <div>
              <label className={`${lbl} text-right`}>الاسم الأوسط <span className="text-neutral-400">(اختياري)</span></label>
              <input value={middleNameAr} onChange={e => setMiddleNameAr(e.target.value)}
                placeholder="محمود" className={`${inp} text-right`} />
            </div>
            <div>
              <label className={`${lbl} text-right`}>اسم العائلة</label>
              <input value={lastNameAr} onChange={e => setLastNameAr(e.target.value)}
                placeholder="حسن" className={`${inp} text-right`} />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Contact & Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Phone *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                placeholder="+962 7x xxx xxxx" className={inp} />
            </div>
            <div>
              <label className={lbl}>Date of Birth</label>
              <JordanDateInput value={dob} onChange={setDob} className={inp} />
            </div>
            <div>
              <label className={lbl}>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className={inp}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)}
                placeholder="City, Street" className={inp} />
            </div>
          </div>
        </div>


        {/* Referral Source */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Referral Source</h2>
          <p className="mb-3 text-xs text-neutral-500">How did the patient hear about the clinic?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label key="physician" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="physician"
                      checked={referralSource === "physician"}
                      onChange={() => { setReferralSource("physician"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Physician</span>
                  </label>
                  <label key="hospital" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="hospital"
                      checked={referralSource === "hospital"}
                      onChange={() => { setReferralSource("hospital"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Hospital</span>
                  </label>
                  <label key="another_clinic" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="another_clinic"
                      checked={referralSource === "another_clinic"}
                      onChange={() => { setReferralSource("another_clinic"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Another Clinic</span>
                  </label>
                  <label key="insurance" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="insurance"
                      checked={referralSource === "insurance"}
                      onChange={() => { setReferralSource("insurance"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Insurance Company</span>
                  </label>
                  <label key="existing_patient" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="existing_patient"
                      checked={referralSource === "existing_patient"}
                      onChange={() => { setReferralSource("existing_patient"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Existing Patient</span>
                  </label>
                  <label key="friend_family" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="friend_family"
                      checked={referralSource === "friend_family"}
                      onChange={() => { setReferralSource("friend_family"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Friend / Family</span>
                  </label>
                  <label key="google_search" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="google_search"
                      checked={referralSource === "google_search"}
                      onChange={() => { setReferralSource("google_search"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Google Search</span>
                  </label>
                  <label key="google_maps" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="google_maps"
                      checked={referralSource === "google_maps"}
                      onChange={() => { setReferralSource("google_maps"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Google Maps</span>
                  </label>
                  <label key="website" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="website"
                      checked={referralSource === "website"}
                      onChange={() => { setReferralSource("website"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Clinic Website</span>
                  </label>
                  <label key="facebook" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="facebook"
                      checked={referralSource === "facebook"}
                      onChange={() => { setReferralSource("facebook"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Facebook</span>
                  </label>
                  <label key="instagram" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="instagram"
                      checked={referralSource === "instagram"}
                      onChange={() => { setReferralSource("instagram"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Instagram</span>
                  </label>
                  <label key="linkedin" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="linkedin"
                      checked={referralSource === "linkedin"}
                      onChange={() => { setReferralSource("linkedin"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">LinkedIn</span>
                  </label>
                  <label key="youtube" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="youtube"
                      checked={referralSource === "youtube"}
                      onChange={() => { setReferralSource("youtube"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">YouTube</span>
                  </label>
                  <label key="tiktok" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="tiktok"
                      checked={referralSource === "tiktok"}
                      onChange={() => { setReferralSource("tiktok"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">TikTok</span>
                  </label>
                  <label key="newspaper" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="newspaper"
                      checked={referralSource === "newspaper"}
                      onChange={() => { setReferralSource("newspaper"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Newspaper</span>
                  </label>
                  <label key="radio" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="radio"
                      checked={referralSource === "radio"}
                      onChange={() => { setReferralSource("radio"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Radio</span>
                  </label>
                  <label key="tv" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="tv"
                      checked={referralSource === "tv"}
                      onChange={() => { setReferralSource("tv"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">TV</span>
                  </label>
                  <label key="walk_in" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="walk_in"
                      checked={referralSource === "walk_in"}
                      onChange={() => { setReferralSource("walk_in"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Walk-in</span>
                  </label>
                  <label key="other" className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="referralSource" value="other"
                      checked={referralSource === "other"}
                      onChange={() => { setReferralSource("other"); setReferralSourceDetail(""); }}
                      className="accent-neutral-800" />
                    <span className="text-sm text-neutral-700">Other</span>
                  </label>
          </div>
          {/* Detail field for sources that need a name */}
          {(["physician", "hospital", "another_clinic", "insurance", "existing_patient", "other"].includes(referralSource)) && (
            <div className="mt-3">
              <label className={lbl}>
                {referralSource === "physician" && "Physician Name"}
                {referralSource === "hospital" && "Hospital Name"}
                {referralSource === "another_clinic" && "Clinic Name"}
                {referralSource === "insurance" && "Insurance Company Name"}
                {referralSource === "existing_patient" && "Patient Name (referrer)"}
                {referralSource === "other" && "Please specify"}
              </label>
              <input
                value={referralSourceDetail}
                onChange={e => setReferralSourceDetail(e.target.value)}
                placeholder="Enter name..."
                className={inp}
              />
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
          {loading ? "Saving..." : "Save Patient"}
        </button>
      </form>
    </div>
  );
}
