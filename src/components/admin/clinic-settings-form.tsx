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
    setSaving(true);
    setError(null);
    setSaved(false);

    // Convert logo to base64 if a new one was selected
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
    <form onSubmit={handleSave} className="max-w-lg space-y-5 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved successfully.</div>}

      {/* Logo */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900">Clinic Logo</label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Clinic logo" className="h-16 w-16 rounded-lg object-contain border border-neutral-200" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-2xl">
              🏥
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              id="logo-upload"
              className="hidden"
              onChange={handleLogoChange}
            />
            <label htmlFor="logo-upload"
              className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
              Upload logo
            </label>
            <p className="mt-1 text-xs text-neutral-400">PNG, JPG or SVG. Will appear on print documents.</p>
          </div>
        </div>
      </div>

      {/* Clinic name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Clinic name (English)</label>
          <input type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Clinic name (Arabic)</label>
          <input type="text" value={clinicNameAr} onChange={(e) => setClinicNameAr(e.target.value)}
            dir="rtl"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Currency */}
      <div>
        <label className="mb-1 block text-xs text-neutral-600">Currency</label>
        <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-400">Used for payment collection and financial reports.</p>
      </div>

      <button type="submit" disabled={saving}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
