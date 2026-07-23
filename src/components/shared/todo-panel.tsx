"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface TodoItem {
  id: string; title: string; notes: string | null;
  priority: "low"|"normal"|"high"; status: "pending"|"done";
  assigned_to: string|null; created_by: string;
  created_at: string; assignedName?: string; createdByName?: string;
}
interface User { id: string; full_name: string; role: string; }
const PR = {
  high:   { label:"High",   dot:"🔴", bg:"#fff1f2", border:"#fca5a5", text:"#991b1b" },
  normal: { label:"Normal", dot:"🟡", bg:"#fffde7", border:"#fcd34d", text:"#78350F" },
  low:    { label:"Low",    dot:"🟢", bg:"#f0fdf4", border:"#86efac", text:"#14532d" },
};
export function TodoPanel({ currentUserId, clinicId, currentUserName }:
  { currentUserId:string; currentUserRole:string; clinicId:string; currentUserName:string; }) {
  const sb = createClient();
  const [open,setOpen]               = useState(false);
  const [items,setItems]             = useState<TodoItem[]>([]);
  const [users,setUsers]             = useState<User[]>([]);
  const [loading,setLoading]         = useState(false);
  const [showForm,setShowForm]       = useState(false);
  const [showDone,setShowDone]       = useState(false);
  const [newTitle,setNewTitle]       = useState("");
  const [newNotes,setNewNotes]       = useState("");
  const [newPriority,setNewPriority] = useState<"low"|"normal"|"high">("normal");
  const [newAssignee,setNewAssignee] = useState(currentUserId);
  const [adding,setAdding]           = useState(false);
  const [notifCount,setNotifCount]   = useState(0);
  const audioCtxRef = typeof window !== "undefined" ? { current: null as any } : { current: null };
  const [toast,setToast]           = useState<string|null>(null);
  const [templates,setTemplates]     = useState<{id:string;title:string;default_priority:string;default_assignee_role:string|null}[]>([]);

  async function loadTemplates() {
    const { data } = await sb.from("todo_templates").select("id,title,default_priority,default_assignee_role")
      .eq("clinic_id",clinicId).eq("is_active",true).order("sort_order");
    setTemplates(data??[]);
  }
  async function load() {
    setLoading(true);
    const [{ data:td },{ data:ud }] = await Promise.all([
      sb.from("todo_items").select("*").eq("clinic_id",clinicId).order("created_at",{ascending:false}),
      sb.from("users").select("id,full_name,role").eq("clinic_id",clinicId).eq("is_active",true),
    ]);
    const um=new Map((ud??[]).map((u:any)=>[u.id,u.full_name]));
    setUsers(ud??[]);
    setItems((td??[]).map((t:any)=>({...t,assignedName:t.assigned_to?um.get(t.assigned_to)??"—":"",createdByName:um.get(t.created_by)??"—"})));
    setLoading(false);
  }
  async function loadNotifs() {
    const {count}=await sb.from("todo_notifications").select("*",{count:"exact",head:true}).eq("user_id",currentUserId).eq("is_read",false);
    setNotifCount(count??0);
  }
  useEffect(()=>{ loadNotifs(); },[]);

  // Auto-refresh every 30 seconds when panel is open
  useEffect(()=>{
    if (!open) return;
    const interval = setInterval(()=>{ load(); }, 30000);
    return ()=>clearInterval(interval);
  },[open]);

  function unlockAudio() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const buf = ctx.createBuffer(1,1,22050);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
    } catch(e) {}
  }

  function playNotifSound() {
    try {
      // Use a data URI beep so no external file needed
      const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"+
        "dvT18A"+"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      audio.volume = 0.5;
      audio.play().catch(()=>{
        // Fallback: AudioContext beep
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.setValueAtTime(900, ctx.currentTime+0.15);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime+0.5);
        } catch(e2) {}
      });
    } catch(e) {}
  }
  useEffect(()=>{ load(); loadTemplates(); },[]);  // load on mount always
  useEffect(()=>{ if(open) { load(); loadTemplates(); } },[open]);
  useEffect(()=>{
    const ch=sb.channel("todo-realtime-"+clinicId)
      .on("postgres_changes",
        {event:"INSERT",schema:"public",table:"todo_notifications"},
        (payload:any)=>{
          // Only process if this notification is for current user
          if (payload?.new?.user_id !== currentUserId) return;
          loadNotifs();
          load();
          const msg = payload?.new?.message;
          if (msg) { setToast(msg); setTimeout(()=>setToast(null),6000); playNotifSound(); }
        })
      .on("postgres_changes",
        {event:"INSERT",schema:"public",table:"todo_items"},
        (payload:any)=>{
          if (payload?.new?.clinic_id !== clinicId) return;
          load(); loadNotifs();
        })
      .on("postgres_changes",
        {event:"UPDATE",schema:"public",table:"todo_items"},
        (payload:any)=>{
          if (payload?.new?.clinic_id !== clinicId) return;
          load();
        })
      .subscribe();
    return ()=>{ sb.removeChannel(ch); };
  },[]);

  async function addTodo() {
    if (!newTitle.trim()) return;
    setAdding(true);
    const {data:ins}=await sb.from("todo_items").insert({
      clinic_id:clinicId,title:newTitle.trim(),notes:newNotes.trim()||null,
      priority:newPriority,status:"pending",assigned_to:newAssignee||currentUserId,created_by:currentUserId,
    }).select().single();
    if (ins&&newAssignee&&newAssignee!==currentUserId) {
      await sb.from("todo_notifications").insert({todo_id:ins.id,user_id:newAssignee,message:currentUserName+" assigned you: "+newTitle.trim()});
    }
    setNewTitle("");setNewNotes("");setNewPriority("normal");setNewAssignee(currentUserId);setShowForm(false);setAdding(false);
    load();
  }
  async function toggleDone(item:TodoItem) {
    const isDone=item.status==="done";
    await sb.from("todo_items").update({status:isDone?"pending":"done",done_at:isDone?null:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id);
    if (!isDone&&item.created_by!==currentUserId) {
      await sb.from("todo_notifications").insert({todo_id:item.id,user_id:item.created_by,message:currentUserName+" completed: "+item.title});
    }
    load();
  }
  async function followUp(item:TodoItem) {
    // Send a follow-up notification to the assignee
    if (!item.assigned_to) return;
    await sb.from("todo_notifications").insert({
      todo_id:item.id, user_id:item.assigned_to,
      message:"🔔 Follow-up from "+currentUserName+": \""+item.title+"\" — please update the status.",
    });
    alert("Follow-up sent to "+item.assignedName);
  }
  async function deleteTodo(id:string) {
    await sb.from("todo_items").delete().eq("id",id).eq("created_by",currentUserId);
    load();
  }
  async function markRead() {
    if (notifCount===0) return;
    await sb.from("todo_notifications").update({is_read:true}).eq("user_id",currentUserId).eq("is_read",false);
    setNotifCount(0);
  }

  const pending=items.filter(t=>t.status==="pending").sort((a,b)=>({high:0,normal:1,low:2}[a.priority]??1)-({high:0,normal:1,low:2}[b.priority]??1));
  const done=items.filter(t=>t.status==="done");

  return (
    <>
      {toast&&(
        <div style={{
          position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:1100,
          background:"#1f2937", color:"white", borderRadius:12,
          padding:"12px 20px", fontSize:13, fontWeight:600,
          boxShadow:"0 8px 30px rgba(0,0,0,0.25)",
          maxWidth:340, textAlign:"center", lineHeight:1.4,
          animation:"fadeIn 0.2s ease",
        }}>
          🔔 {toast}
          <button onClick={()=>setToast(null)} style={{
            marginLeft:10, background:"none", border:"none",
            color:"#9ca3af", cursor:"pointer", fontSize:14,
          }}>✕</button>
        </div>
      )}
      <button onClick={()=>{ setOpen(o=>!o); if(!open) markRead(); unlockAudio(); }}
        style={{position:"fixed",top:56,right:16,zIndex:1000,width:40,height:40,borderRadius:"50%",
          background:"linear-gradient(135deg,#F59E0B,#D97706)",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
          border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
        <span style={{fontSize:17}}>{open?"✕":"📝"}</span>
        {(pending.length>0||notifCount>0)&&(
          <span style={{position:"absolute",top:-5,right:-5,background:notifCount>0?"#ef4444":"#92400E",color:"white",borderRadius:"50%",
            minWidth:20,height:20,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>
            {notifCount>0?notifCount:pending.length}
          </span>
        )}
      </button>

      {open&&(
        <div style={{position:"fixed",top:106,right:16,zIndex:999,width:380,maxHeight:560,
          borderRadius:16,background:"#FFFDE7",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
          border:"1.5px solid #FCD34D",display:"flex",flexDirection:"column",overflow:"hidden"}}>

          <div style={{background:"linear-gradient(135deg,#FCD34D,#F59E0B)",padding:"14px 16px",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>📝</span>
              <span style={{fontSize:17,fontWeight:800,color:"#3B1A00"}}>To-Do List</span>
              {pending.length>0&&(
                <span style={{background:"#92400E",color:"#FEF3C7",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>
                  {pending.length} pending
                </span>
              )}
            </div>
            <button onClick={()=>setShowForm(f=>!f)} style={{background:"#92400E",color:"#FEF3C7",border:"none",
              borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              {showForm?"Cancel":"+ New Task"}
            </button>
          </div>

          {showForm&&(
            <div style={{padding:14,background:"#FFFBEB",borderBottom:"1px solid #FDE68A",flexShrink:0}}>
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&addTodo()}
                placeholder="What needs to be done?" autoFocus
                style={{width:"100%",borderRadius:8,border:"1.5px solid #FCD34D",padding:"10px 12px",
                  fontSize:13,outline:"none",background:"white",marginBottom:8,boxSizing:"border-box",color:"#1f2937"}}/>
              <textarea value={newNotes} onChange={e=>setNewNotes(e.target.value)}
                placeholder="Add notes (optional)..." rows={2}
                style={{width:"100%",borderRadius:8,border:"1.5px solid #FCD34D",padding:"8px 12px",
                  fontSize:12,outline:"none",background:"white",marginBottom:8,resize:"none",boxSizing:"border-box",color:"#374151"}}/>
              <p style={{fontSize:11,fontWeight:700,color:"#78350F",margin:"0 0 6px"}}>Priority</p>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {(["high","normal","low"] as const).map(pr=>(
                  <button key={pr} onClick={()=>setNewPriority(pr)} style={{
                    flex:1,borderRadius:8,padding:"8px 6px",fontSize:12,fontWeight:700,cursor:"pointer",
                    border:"2px solid "+(newPriority===pr?PR[pr].border:"#e5e7eb"),
                    background:newPriority===pr?PR[pr].bg:"white",
                    color:newPriority===pr?PR[pr].text:"#6b7280"}}>
                    {PR[pr].dot} {PR[pr].label}
                  </button>
                ))}
              </div>
              <p style={{fontSize:11,fontWeight:700,color:"#78350F",margin:"0 0 6px"}}>Assign to</p>
              <select value={newAssignee} onChange={e=>setNewAssignee(e.target.value)}
                style={{width:"100%",borderRadius:8,border:"1.5px solid #FCD34D",padding:"8px 10px",
                  fontSize:12,outline:"none",background:"white",marginBottom:10,boxSizing:"border-box",color:"#374151"}}>
                <option value={currentUserId}>Myself</option>
                {users.filter(u=>u.id!==currentUserId).map(u=>(
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
              <button onClick={addTodo} disabled={adding||!newTitle.trim()} style={{
                width:"100%",borderRadius:8,background:adding||!newTitle.trim()?"#d1d5db":"#D97706",
                color:"white",border:"none",padding:"10px",fontSize:13,fontWeight:700,
                cursor:adding||!newTitle.trim()?"not-allowed":"pointer"}}>
                {adding?"Saving...":"Save Task"}
              </button>
            </div>
          )}

          <QuickAdd templates={templates} clinicId={clinicId} currentUserId={currentUserId} onAdded={load}/>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
            {loading&&<p style={{textAlign:"center",color:"#6b7280",fontSize:13,padding:20}}>Loading...</p>}
            {!loading&&pending.length===0&&!showForm&&(
              <div style={{textAlign:"center",padding:"30px 0"}}>
                <div style={{fontSize:32,marginBottom:10}}>🎉</div>
                <p style={{color:"#6b7280",fontSize:13,fontWeight:500}}>No pending tasks!</p>
              </div>
            )}
            {pending.map(t=>(
              <NoteCard key={t.id} item={t} currentUserId={currentUserId}
                onToggle={()=>toggleDone(t)} onDelete={()=>deleteTodo(t.id)} onFollowUp={()=>followUp(t)}/>
            ))}
            {done.length>0&&(
              <>
                <button onClick={()=>setShowDone(d=>!d)} style={{width:"100%",background:"none",border:"none",
                  color:"#6b7280",fontSize:12,cursor:"pointer",padding:"10px 4px",textAlign:"center",fontWeight:600}}>
                  ✅ {done.length} completed {showDone?"▲":"▼"}
                </button>
                {showDone&&<div style={{opacity:0.6}}>{done.map(t=>(
                  <NoteCard key={t.id} item={t} currentUserId={currentUserId}
                    onToggle={()=>toggleDone(t)} onDelete={()=>deleteTodo(t.id)} onFollowUp={()=>followUp(t)}/>
                ))}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function NoteCard({item,currentUserId,onToggle,onDelete,onFollowUp}:{
  item:TodoItem;currentUserId:string;onToggle:()=>void;onDelete:()=>void;onFollowUp:()=>void;
}) {
  const [exp,setExp]=useState(false);
  const isDone=item.status==="done";
  const isOwn=item.created_by===currentUserId;
  const isAssignedToMe=item.assigned_to===currentUserId||(!item.assigned_to&&isOwn);
  const pr=PR[item.priority];
  return (
    <div style={{borderRadius:12,padding:"14px 16px",marginBottom:12,
      background:isDone?"#f3f4f6":pr.bg,
      border:"1.5px solid "+(isDone?"#e5e7eb":pr.border),
      boxShadow:isDone?"none":"0 2px 10px rgba(0,0,0,0.07)"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{flexShrink:0,marginTop:2}}>
          {isDone?(
            <button onClick={onToggle} title="Mark as pending" style={{background:"#10b981",border:"none",borderRadius:6,
              padding:"6px 14px",fontSize:13,fontWeight:700,color:"white",cursor:"pointer",whiteSpace:"nowrap"}}>
              ✓ Done
            </button>
          ):isAssignedToMe?(
            <button onClick={onToggle} style={{background:"white",border:"2px solid #d1d5db",borderRadius:6,
              padding:"6px 14px",fontSize:13,fontWeight:700,color:"#374151",cursor:"pointer",whiteSpace:"nowrap"}}>
              Done
            </button>
          ):(
            <span style={{fontSize:10,color:"#9ca3af",whiteSpace:"nowrap"}}>Assigned</span>
          )}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:15,fontWeight:700,margin:"0 0 6px",lineHeight:1.4,
            textDecoration:isDone?"line-through":"none",color:isDone?"#4b5563":"#111827"}}>
            {item.title}
          </p>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,
              background:pr.bg,color:pr.text,border:"1px solid "+pr.border}}>
              {pr.dot} {pr.label}
            </span>
            <span style={{fontSize:12,color:"#4b5563",fontWeight:500}}>by {item.createdByName}</span>
            {item.assigned_to&&item.assigned_to!==item.created_by&&(
              <span style={{fontSize:12,color:"#4b5563",fontWeight:500}}>→ {item.assignedName}</span>
            )}
          </div>
          {item.notes&&(
            <div onClick={()=>setExp(e=>!e)} style={{marginTop:8,padding:"8px 10px",borderRadius:8,
              cursor:"pointer",background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.08)"}}>
              <p style={{fontSize:13,color:"#374151",margin:0,lineHeight:1.6,
                overflow:exp?"visible":"hidden",display:exp?"block":"-webkit-box",
                WebkitLineClamp:exp?undefined:2,WebkitBoxOrient:"vertical" as any}}>
                {item.notes}
              </p>
              {item.notes.length>80&&(
                <p style={{fontSize:10,color:"#d97706",marginTop:4,fontWeight:600}}>
                  {exp?"▲ Show less":"▼ Show more"}
                </p>
              )}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
          {isOwn&&(
            <button onClick={onDelete}
              style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:6,
                color:"#dc2626",cursor:"pointer",fontSize:11,padding:"3px 8px",fontWeight:700,lineHeight:1}}
              title="Delete task">🗑</button>
          )}
          {isOwn&&!isDone&&item.assigned_to&&item.assigned_to!==currentUserId&&(
            <button onClick={onFollowUp}
              style={{background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:6,
                color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"3px 6px",fontWeight:700,lineHeight:1,whiteSpace:"nowrap"}}
              title="Send follow-up">↩ Follow up</button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAdd({ templates, clinicId, currentUserId, onAdded }:{
  templates:{id:string;title:string;default_priority:string;default_assignee_role:string|null}[];
  clinicId:string; currentUserId:string; onAdded:()=>void;
}) {
  const sb = createClient();
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<string|null>(null);
  const [comment, setComment]   = useState("");
  const [saving, setSaving]     = useState(false);

  if (templates.length===0) return null;

  const selectedTemplate = templates.find(t=>t.id===selected);

  async function save() {
    if (!selectedTemplate) return;
    setSaving(true);
    await sb.from("todo_items").insert({
      clinic_id:clinicId, title:selectedTemplate.title,
      notes:comment.trim()||null,
      priority:selectedTemplate.default_priority as any,
      status:"pending", assigned_to:currentUserId, created_by:currentUserId,
    });
    setSaving(false);
    setSelected(null); setComment(""); setOpen(false);
    onAdded();
  }

  return (
    <div style={{borderBottom:"1px solid #FDE68A",background:"#FFFBEB",flexShrink:0}}>
      {/* Toggle button */}
      <button onClick={()=>{ setOpen(o=>!o); setSelected(null); setComment(""); }}
        style={{
          width:"100%", padding:"8px 12px", background:"none", border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
        <span style={{fontSize:11,fontWeight:700,color:"#78350F"}}>⚡ Quick Add from Templates</span>
        <span style={{fontSize:12,color:"#92400E",fontWeight:700}}>{open?"▲":"▼"}</span>
      </button>

      {open&&(
        <div style={{padding:"0 12px 10px"}}>
          {/* Dropdown select */}
          <select value={selected??""} onChange={e=>{ setSelected(e.target.value||null); setComment(""); }}
            style={{
              width:"100%", borderRadius:8, border:"1.5px solid #FCD34D",
              padding:"8px 10px", fontSize:12, outline:"none",
              background:"white", color:"#374151", marginBottom:8, boxSizing:"border-box",
            }}>
            <option value="">— Select a task template —</option>
            {templates.map(t=>{
              const dot = t.default_priority==="high"?"🔴":t.default_priority==="low"?"🟢":"🟡";
              return <option key={t.id} value={t.id}>{dot} {t.title}</option>;
            })}
          </select>

          {/* Comment field — shown after selecting */}
          {selected&&(
            <>
              <input value={comment} onChange={e=>setComment(e.target.value)}
                placeholder="Add details: patient name, insurance company..."
                autoFocus
                onKeyDown={e=>e.key==="Enter"&&save()}
                style={{
                  width:"100%", borderRadius:8, border:"1.5px solid #FCD34D",
                  padding:"8px 10px", fontSize:12, outline:"none",
                  background:"white", color:"#374151", marginBottom:8, boxSizing:"border-box",
                }}/>
              <div style={{display:"flex",gap:6}}>
                <button onClick={save} disabled={saving}
                  style={{flex:1,borderRadius:8,background:saving?"#d1d5db":"#D97706",
                    color:"white",border:"none",padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {saving?"Saving...":"Add Task"}
                </button>
                <button onClick={()=>{ setSelected(null); setComment(""); }}
                  style={{borderRadius:8,background:"none",border:"1px solid #e5e7eb",
                    color:"#6b7280",padding:"8px 12px",fontSize:12,cursor:"pointer"}}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
