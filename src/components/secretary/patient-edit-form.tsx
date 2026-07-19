"use client";

import { useState } from "react";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { updatePatient } from "@/lib/actions/patients";

interface InsuranceCompany { id: string; name: string; }

interface PatientEditFormProps {
  patient: {
    id: string;
    full_name: string;
    full_name_ar: string | null;
    mrn: string | null;
    referral_source: string | null;
    referral_source_detail: string | null;
    first_name: string;
    middle_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    middle_name_ar: string | null;
    last_name_ar: string | null;
    phone: string;
    phone2: string | null;
    phone2_relation: string | null;
    dob: string | null;
    gender: string | null;
    address: string | null;
    email: string | null;
    blood_type: string | null;
    allergies: string | null;
    insurance_company_id: string | null;
    insurance_policy_number: string | null;
    insurance_expiry_date: string | null;
    preferred_doctor_id: string | null;
  };
  insuranceCompanies: InsuranceCompany[];
  doctors?: { id: string; full_name: string; specialty: string | null }[];
}

export function PatientEditForm({ patient, insuranceCompanies, doctors = [] }: PatientEditFormProps) {
  const [mrn,                setMrn]                = useState((patient as any).mrn ?? "");
  const [referralSource,       setReferralSource]       = useState(patient.referral_source ?? "");
  const [referralSourceDetail, setReferralSourceDetail] = useState(patient.referral_source_detail ?? "");
  const [firstName,    setFirstName]    = useState(patient.first_name ?? patient.full_name);
  const [middleName,   setMiddleName]   = useState(patient.middle_name ?? "");
  const [lastName,     setLastName]     = useState(patient.last_name ?? "");
  const [firstNameAr,  setFirstNameAr]  = useState(patient.first_name_ar ?? "");
  const [middleNameAr, setMiddleNameAr] = useState(patient.middle_name_ar ?? "");
  const [lastNameAr,   setLastNameAr]   = useState(patient.last_name_ar ?? "");
  const [phone, setPhone] = useState(patient.phone);
  const [phone2, setPhone2] = useState(patient.phone2 ?? "");
  const [phone2Relation, setPhone2Relation] = useState(patient.phone2_relation ?? "");
  const [dob, setDob] = useState(patient.dob ?? "");
  const [gender, setGender] = useState(patient.gender ?? "");
  const [address, setAddress] = useState(patient.address ?? "");
  const [email, setEmail] = useState(patient.email ?? "");
  const [bloodType, setBloodType] = useState(patient.blood_type ?? "");
  const [allergies, setAllergies] = useState(patient.allergies ?? "");
  const [insuranceCompanyId, setInsuranceCompanyId] = useState(patient.insurance_company_id ?? "");
  const [preferredDoctorId, setPreferredDoctorId] = useState(patient.preferred_doctor_id ?? "");
  const [policyNumber, setPolicyNumber] = useState(patient.insurance_policy_number ?? "");
  const [expiryDate, setExpiryDate] = useState(patient.insurance_expiry_date ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updatePatient(patient.id, {
      mrn:                    mrn.trim() || undefined,
      referral_source:        referralSource || null,
      referral_source_detail: referralSourceDetail.trim() || null,
      first_name:     firstName.trim(),
      middle_name:    middleName.trim() || null,
      last_name:      lastName.trim() || null,
      first_name_ar:  firstNameAr.trim() || null,
      middle_name_ar: middleNameAr.trim() || null,
      last_name_ar:   lastNameAr.trim() || null,
      phone,
      phone2: phone2 || undefined,
      phone2_relation: phone2Relation || undefined,
      dob: dob || undefined,
      gender: (gender as "male" | "female") || undefined,
      address: address || undefined,
      email: email || undefined,
      blood_type: bloodType || undefined,
      allergies: allergies || undefined,
      insurance_company_id: insuranceCompanyId || undefined,
      insurance_policy_number: policyNumber || undefined,
      insurance_expiry_date: expiryDate || undefined,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Could not save.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium text-neutral-900">Patient information</h2>

      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {saved && <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved successfully.</div>}

      {/* English name — 3 parts */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-neutral-700">Name (English)</p>
          {[firstName,middleName,lastName].filter(Boolean).join(" ") && (
            <span className="text-xs text-neutral-400">
              {[firstName,middleName,lastName].filter(Boolean).join(" ")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">First Name *</label>
            <input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ahmad"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">Middle Name</label>
            <input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Mahmoud"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">Last Name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Hassan"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500" />
          </div>
        </div>
      </div>

      {/* Arabic name — 3 parts */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-neutral-700">الاسم (عربي)</p>
          {[firstNameAr,middleNameAr,lastNameAr].filter(Boolean).join(" ") && (
            <span className="text-xs text-neutral-400" dir="rtl">
              {[firstNameAr,middleNameAr,lastNameAr].filter(Boolean).join(" ")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2" dir="rtl">
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500 text-right">الاسم الأول *</label>
            <input value={firstNameAr} onChange={e => setFirstNameAr(e.target.value)} placeholder="أحمد"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-right outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500 text-right">الاسم الأوسط</label>
            <input value={middleNameAr} onChange={e => setMiddleNameAr(e.target.value)} placeholder="محمود"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-right outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500 text-right">اسم العائلة</label>
            <input value={lastNameAr} onChange={e => setLastNameAr(e.target.value)} placeholder="حسن"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-right outline-none focus:border-neutral-500" />
          </div>
        </div>
      </div>


      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Phone</label>
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Date of birth</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Alt. phone</label>
          <input type="tel" value={phone2} onChange={(e) => setPhone2(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Relation</label>
          <input type="text" value={phone2Relation} onChange={(e) => setPhone2Relation(e.target.value)}
            placeholder="e.g. Spouse"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Blood type</label>
          <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <BilingualInput label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-neutral-600">MRN <span className="font-normal text-neutral-400">(Medical Record #)</span></label>
        <input type="text" value={mrn} onChange={e => setMrn(e.target.value)}
          placeholder="MRN-001234"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono mb-3" />
        <label className="mb-1 block text-xs text-neutral-600">Allergies</label>
        <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. Penicillin, Aspirin"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      <div className="mb-4 rounded-md bg-neutral-50 p-3">
        <p className="mb-2 text-xs font-medium text-neutral-600">Insurance (optional)</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Company</label>
            <select value={insuranceCompanyId} onChange={(e) => setInsuranceCompanyId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
              <option value="">No insurance</option>
              {insuranceCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Policy number</label>
            <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="INS-12345678"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Expiry date</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
        </div>
      </div>

      {/* Referral Source */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-neutral-700">Referral Source</label>
        <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="physician"
                checked={referralSource==="physician"}
                onChange={()=>{setReferralSource("physician");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Physician</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="hospital"
                checked={referralSource==="hospital"}
                onChange={()=>{setReferralSource("hospital");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Hospital</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="another_clinic"
                checked={referralSource==="another_clinic"}
                onChange={()=>{setReferralSource("another_clinic");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Another Clinic</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="insurance"
                checked={referralSource==="insurance"}
                onChange={()=>{setReferralSource("insurance");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Insurance Company</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="existing_patient"
                checked={referralSource==="existing_patient"}
                onChange={()=>{setReferralSource("existing_patient");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Existing Patient</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="friend_family"
                checked={referralSource==="friend_family"}
                onChange={()=>{setReferralSource("friend_family");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Friend / Family</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="google_search"
                checked={referralSource==="google_search"}
                onChange={()=>{setReferralSource("google_search");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Google Search</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="google_maps"
                checked={referralSource==="google_maps"}
                onChange={()=>{setReferralSource("google_maps");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Google Maps</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="website"
                checked={referralSource==="website"}
                onChange={()=>{setReferralSource("website");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Clinic Website</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="facebook"
                checked={referralSource==="facebook"}
                onChange={()=>{setReferralSource("facebook");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Facebook</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="instagram"
                checked={referralSource==="instagram"}
                onChange={()=>{setReferralSource("instagram");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Instagram</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="linkedin"
                checked={referralSource==="linkedin"}
                onChange={()=>{setReferralSource("linkedin");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">LinkedIn</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="youtube"
                checked={referralSource==="youtube"}
                onChange={()=>{setReferralSource("youtube");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">YouTube</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="tiktok"
                checked={referralSource==="tiktok"}
                onChange={()=>{setReferralSource("tiktok");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">TikTok</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="newspaper"
                checked={referralSource==="newspaper"}
                onChange={()=>{setReferralSource("newspaper");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Newspaper</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="radio"
                checked={referralSource==="radio"}
                onChange={()=>{setReferralSource("radio");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Radio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="tv"
                checked={referralSource==="tv"}
                onChange={()=>{setReferralSource("tv");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">TV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="walk_in"
                checked={referralSource==="walk_in"}
                onChange={()=>{setReferralSource("walk_in");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Walk-in</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editRefSrc" value="other"
                checked={referralSource==="other"}
                onChange={()=>{setReferralSource("other");setReferralSourceDetail("");}}
                className="accent-neutral-800 w-3 h-3"/>
              <span className="text-xs text-neutral-700">Other</span>
            </label>
        </div>
        {["physician","hospital","another_clinic","insurance","existing_patient","other"].includes(referralSource) && (
          <input value={referralSourceDetail} onChange={e=>setReferralSourceDetail(e.target.value)}
            placeholder="Enter name..."
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"/>
        )}
      </div>
      <button type="submit" disabled={saving}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
