"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const REPORT_TYPES = [
  "NCS","EEG","MRI","CT Scan","Lab Results",
  "Referral Letter","Previous Report","X-Ray","Ultrasound","Other"
];

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  report_type: string | null;
  notes: string | null;
  created_at: string;
  visit_id: string | null;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export function AttachmentsTab({
  visitId, patientId, clinicId
}: { visitId: string; patientId: string; clinicId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState<string|null>(null);
  const [success, setSuccess]         = useState<string|null>(null);
  const [filterType, setFilterType]   = useState("all");
  const [reportType, setReportType]   = useState("Other");
  const [notes, setNotes]             = useState("");
  const [showUpload, setShowUpload]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  async function loadAttachments() {
    setLoading(true);
    const { data } = await supabase
      .from("visit_attachments")
      .select("*")
      .eq("patient_id", patientId)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });
    setAttachments(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAttachments(); }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a file."); return; }
    if (file.size > 10*1024*1024) { setError("File must be under 10MB."); return; }
    if (!["application/pdf","image/jpeg","image/png"].includes(file.type)) {
      setError("Only PDF, JPG, PNG allowed."); return;
    }

    setUploading(true); setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${clinicId}/${patientId}/${visitId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("visit-attachments")
      .upload(path, file, { upsert: false });

    if (upErr) { setError(upErr.message); setUploading(false); return; }

    const { error: dbErr } = await supabase.from("visit_attachments").insert({
      clinic_id:   clinicId,
      patient_id:  patientId,
      visit_id:    visitId,
      uploaded_by: user?.id,
      file_name:   file.name,
      file_path:   path,
      file_size:   file.size,
      file_type:   file.type,
      report_type: reportType,
      notes:       notes.trim() || null,
    });

    setUploading(false);
    if (dbErr) { setError(dbErr.message); return; }

    setSuccess("File uploaded successfully.");
    setNotes(""); setReportType("Other"); setShowUpload(false);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setSuccess(null), 3000);
    loadAttachments();
  }

  async function handleView(attachment: Attachment) {
    const { data } = await supabase.storage
      .from("visit-attachments")
      .createSignedUrl(attachment.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(attachment: Attachment) {
    if (!confirm(`Delete "${attachment.file_name}"?`)) return;
    await supabase.storage.from("visit-attachments").remove([attachment.file_path]);
    await supabase.from("visit_attachments").delete().eq("id", attachment.id);
    loadAttachments();
  }

  const filtered = filterType === "all"
    ? attachments
    : attachments.filter(a => a.report_type === filterType);

  const thisVisit   = attachments.filter(a => a.visit_id === visitId);
  const otherVisits = attachments.filter(a => a.visit_id !== visitId);

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <div className="p-4 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Patient Attachments</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{attachments.length} file{attachments.length!==1?"s":""} total</p>
        </div>
        <button onClick={() => setShowUpload(o=>!o)}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
          {showUpload ? "✕ Cancel" : "⬆ Upload file"}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Upload new file</h4>

          {error   && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}
          {success && <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{success}</div>}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Report type</label>
            <select value={reportType} onChange={e=>setReportType(e.target.value)} className={inp}>
              {REPORT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">File <span className="text-neutral-400">(PDF, JPG, PNG · max 10MB)</span></label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"/>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Notes <span className="text-neutral-400">(optional)</span></label>
            <input value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="e.g. Left arm NCS — abnormal findings"
              className={inp}/>
          </div>

          <button onClick={handleUpload} disabled={uploading}
            className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {/* Filter */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={()=>setFilterType("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filterType==="all"?"bg-neutral-900 text-white":"border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
            All ({attachments.length})
          </button>
          {REPORT_TYPES.filter(t=>attachments.some(a=>a.report_type===t)).map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filterType===t?"bg-neutral-900 text-white":"border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
              {t} ({attachments.filter(a=>a.report_type===t).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400 py-8 text-center">Loading...</p>
      ) : attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-2xl mb-2">📎</p>
          <p className="text-sm font-medium text-neutral-700">No attachments yet</p>
          <p className="text-xs text-neutral-400 mt-1">Upload NCS, EEG, MRI reports and other files</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* This visit */}
          {thisVisit.length > 0 && filterType === "all" && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">This visit</p>
              <div className="space-y-2">
                {thisVisit.map(a => <AttachmentRow key={a.id} a={a} onView={handleView} onDelete={handleDelete}/>)}
              </div>
            </div>
          )}

          {/* Other visits */}
          {filterType === "all" && otherVisits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Previous visits</p>
              <div className="space-y-2">
                {otherVisits.map(a => <AttachmentRow key={a.id} a={a} onView={handleView} onDelete={handleDelete}/>)}
              </div>
            </div>
          )}

          {/* Filtered view */}
          {filterType !== "all" && (
            <div className="space-y-2">
              {filtered.map(a => <AttachmentRow key={a.id} a={a} onView={handleView} onDelete={handleDelete}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentRow({ a, onView, onDelete }: {
  a: Attachment;
  onView: (a:Attachment)=>void;
  onDelete: (a:Attachment)=>void;
}) {
  const isPdf = a.file_type === "application/pdf";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-300 transition-colors">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-lg">
        {isPdf ? "📄" : "🖼"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">{a.file_name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {a.report_type && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {a.report_type}
            </span>
          )}
          <span className="text-[10px] text-neutral-400">{formatDate(a.created_at)}</span>
          {a.file_size && <span className="text-[10px] text-neutral-400">{formatSize(a.file_size)}</span>}
        </div>
        {a.notes && <p className="text-xs text-neutral-500 mt-1 truncate">{a.notes}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={()=>onView(a)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
          View
        </button>
        <button onClick={()=>onDelete(a)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>
    </div>
  );
}
