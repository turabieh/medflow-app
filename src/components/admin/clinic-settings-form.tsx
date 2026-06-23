"use client";

import { useState } from "react";
import { saveClinicSettings } from "@/lib/actions/clinic-settings";

interface ClinicSettingsFormProps {
  clinic: {
    id: string;
    name: string;
    name_ar: string | null;
    slug: string;
    logo_url: string | null;
    address: string | null;
    address_ar: string | null;
    phone: string | null;
    phone2: string | null;
    email: string | null;
    website: string | null;
    tagline: string | null;
    tagline_ar: string | null;
  };
  currency: string;
}

const CURRENCIES = [
  { code: "JOD", label: "Jordanian Dinar (JOD)" },
  { code: "SAR", label: "Saudi Riyal (SAR)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "KWD", label: "Kuwaiti Dinar (KWD)" },
  { code: "QAR", label: "Qatari Riyal (QAR)" },
  { code: "BHD", label: "Bahraini Dinar (BHD)" },
  { code: "OMR", label: "Omani Rial (OMR)" },
  { code: "EGP", label: "Egyptian Pound (EGP)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
];

export function ClinicSettingsForm({ clinic, currency }: ClinicSettingsFormProps) {
  const [clinicName, setClinicName] = useState(clinic.name);
  const [clinicNameAr, setClinicNameAr] = useState(clinic.name_ar ?? "");
  const [tagline, setTagline] = useState(clinic.tagline ?? "");
  const [taglineAr, setTaglineAr] = useState(clinic.tagline_ar ?? "");
  const [address, setAddress] = useState(clinic.address ?? "");
  const [addressAr, setAddressAr] = useState(clinic.address_ar ?? "");
  const [phone, setPhone] = useState(clinic.phone ?? "");
  const [phone2, setPhone2] = useState(clinic.phone2 ?? "");
  const [email, setEmail] = useState(clinic.email ?? "");
  const [website, setWebsite] = useState(clinic.website ?? "");
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(clinic.logo_url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);

    let logoBase64: string | undefined;
    let logoMimeType: string | undefined;
    if (logoFile) {
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(logoFile);
      });
      logoMimeType = logoFile.type;
    }

    const result = await saveClinicSettings({
      clinicId: clinic.id,
      name: clinicName,
      nameAr: clinicNameAr || undefined,
      tagline: tagline || undefined,
      taglineAr: taglineAr || undefined,
      address: address || undefined,
      addressAr: addressAr || undefined,
      phone: phone || undefined,
      phone2: phone2 || undefined,
      email: email || undefined,
      website: website || undefined,
      currency: selectedCurrency,
      logoBase64,
      logoMimeType,
    });

    setSaving(false);
    if (!result.success) { setError(result.error ?? "Could not save."); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-5 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved.</div>}

      {/* Logo */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900">Clinic Logo</label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="h-16 w-auto max-w-[140px] rounded-lg border border-neutral-200 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-2xl">🏥</div>
          )}
          <div>
            <input type="file" accept="image/*" id="logo-upload" className="hidden" onChange={handleLogoChange} />
            <label htmlFor="logo-upload" className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
              Upload logo
            </label>
            <p className="mt-1 text-xs text-neutral-400">PNG, JPG or SVG. Appears on all reports.</p>
          </div>
        </div>
      </div>

      {/* Clinic names */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900">Clinic Name</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">English</label>
            <input type="text" required value={clinicName} onChange={e => setClinicName(e.target.value)}
              placeholder="Maali Neurology Clinic"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Arabic — اسم العيادة</label>
            <input type="text" value={clinicNameAr} onChange={e => setClinicNameAr(e.target.value)}
              placeholder="عيادة معالي للأعصاب" dir="rtl"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900">Tagline <span className="text-xs font-normal text-neutral-400">(shown under clinic name on reports)</span></label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">English</label>
            <input type="text" value={tagline} onChange={e => setTagline(e.target.value)}
              placeholder="Specialist Neurology Clinic"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Arabic</label>
            <input type="text" value={taglineAr} onChange={e => setTaglineAr(e.target.value)}
              placeholder="عيادة متخصصة في أمراض الأعصاب" dir="rtl"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900">Address</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">English</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
              placeholder="123 Medical Street, Amman, Jordan"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Arabic — العنوان</label>
            <textarea value={addressAr} onChange={e => setAddressAr(e.target.value)} rows={2}
              placeholder="١٢٣ شارع الطب، عمان، الأردن" dir="rtl"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900">Contact Information</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Primary phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+962 6 123 4567"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Secondary phone / Fax</label>
            <input type="tel" value={phone2} onChange={e => setPhone2(e.target.value)}
              placeholder="+962 6 765 4321"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="info@clinic.com"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Website</label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="https://clinic.com"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-900">Currency</label>
        <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>

      <button type="submit" disabled={saving}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
