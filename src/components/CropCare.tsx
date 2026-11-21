import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarDays, CheckCircle2, Circle, Sprout, ClipboardCheck, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

type Plan = { id:string; crop_name:string; district_name:string; issue_name:string; status:'active'|'recovered'|'paused'; diagnosis_status:string; care_plan:Record<string,unknown>; started_at:string; next_review_at:string|null };
type Task = { id:string; plan_id:string; title:string; instructions:string|null; task_type:string; due_at:string; status:'pending'|'done'|'skipped' };
type Checkin = { id:string; plan_id:string; health_status:string; notes:string|null; observed_at:string };

const field = 'w-full rounded-xl border border-[#e4dac7] bg-white px-3 py-3 text-sm text-[#1d2d27] outline-none focus:border-[#719579]';
const button = 'rounded-xl bg-[#174432] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';

export default function CropCare({userId}:{userId:string}) {
  const [plans,setPlans]=useState<Plan[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [checkins,setCheckins]=useState<Checkin[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [expanded,setExpanded]=useState<string|null>(null);
  const [showTask,setShowTask]=useState<string|null>(null);
  const [taskTitle,setTaskTitle]=useState('');
  const [taskDate,setTaskDate]=useState(new Date(Date.now()+86400000).toISOString().slice(0,10));
  const [health,setHealth]=useState('unknown');
  const [checkNote,setCheckNote]=useState('');
  const [remindersEnabled,setRemindersEnabled]=useState(false);
  const [reminderPermission,setReminderPermission]=useState('default');
  const [reminderBusy,setReminderBusy]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true); setError('');
    const p=await supabase.from('crop_care_plans').select('id,crop_name,district_name,issue_name,status,diagnosis_status,care_plan,started_at,next_review_at').eq('user_id',userId).order('created_at',{ascending:false});
    if(p.error){setError('Could not load your crop-care plans. Check your connection and try again.');setLoading(false);return;}
    const rows=(p.data||[]) as Plan[]; setPlans(rows);
    if(rows.length){
      const ids=rows.map(x=>x.id);
      const [t,c]=await Promise.all([
        supabase.from('crop_care_tasks').select('id,plan_id,title,instructions,task_type,due_at,status').in('plan_id',ids).order('due_at',{ascending:true}),
        supabase.from('crop_care_checkins').select('id,plan_id,health_status,notes,observed_at').in('plan_id',ids).order('observed_at',{ascending:false})
      ]);
      if(t.error||c.error) setError('Some monitoring records could not be loaded.');
      setTasks((t.data||[]) as Task[]); setCheckins((c.data||[]) as Checkin[]);
    } else {setTasks([]);setCheckins([]);}
    setLoading(false);
  },[userId]);
  useEffect(()=>{void load();},[load]);

  useEffect(()=>{let alive=true;void (async()=>{const {data}=await supabase.from('crop_care_reminder_preferences').select('reminders_enabled,browser_permission').eq('user_id',userId).maybeSingle();if(alive&&data){setRemindersEnabled(data.reminders_enabled);setReminderPermission(data.browser_permission);}})();return()=>{alive=false;};},[userId]);

  const enableReminders=async()=>{setReminderBusy(true);setError('');let permission='unsupported';if('Notification' in window)permission=await Notification.requestPermission();const enabled=permission==='granted';const {error:saveError}=await supabase.from('crop_care_reminder_preferences').upsert({user_id:userId,reminders_enabled:enabled,browser_permission:permission,consented_at:enabled?new Date().toISOString():null,updated_at:new Date().toISOString()});if(saveError)setError('Your reminder preference could not be saved. Please try again.');else{setRemindersEnabled(enabled);setReminderPermission(permission);if(enabled){void navigator.serviceWorker?.ready.then(registration=>registration.showNotification('Omulimi reminders are on',{body:'Crop reminders will appear when Omulimi is open on this device.'})).catch(()=>new Notification('Omulimi reminders are on',{body:'Crop reminders are enabled.'}));}}setReminderBusy(false);};

  useEffect(()=>{if(!remindersEnabled||!('Notification' in window)||Notification.permission!=='granted')return;const notifyDue=()=>{tasks.filter(t=>t.status==='pending'&&new Date(t.due_at).getTime()<=Date.now()).forEach(task=>{const key='omulimi-reminder-'+task.id;if(localStorage.getItem(key))return;void navigator.serviceWorker?.ready.then(registration=>registration.showNotification('Crop check due',{body:task.title,tag:key})).catch(()=>new Notification('Crop check due',{body:task.title,tag:key}));localStorage.setItem(key,'sent');});};notifyDue();const timer=window.setInterval(notifyDue,5*60*1000);return()=>window.clearInterval(timer);},[tasks,remindersEnabled]);

  const addTask=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!showTask||!taskTitle.trim())return;setBusy(true);setError('');
    const {error:err}=await supabase.from('crop_care_tasks').insert({plan_id:showTask,user_id:userId,title:taskTitle.trim(),task_type:'inspect',due_at:new Date(taskDate+'T09:00:00').toISOString(),status:'pending'});
    if(err)setError('Could not add this reminder. Please try again.');else{setTaskTitle('');setShowTask(null);await load();}
    setBusy(false);
  };
  const updateTask=async(task:Task,status:'done'|'skipped')=>{
    setBusy(true);const {error:err}=await supabase.from('crop_care_tasks').update({status,completed_at:status==='done'?new Date().toISOString():null}).eq('id',task.id).eq('user_id',userId);
    if(err)setError('Could not update this task.');else await load();setBusy(false);
  };
  const addCheckin=async(planId:string)=>{
    setBusy(true);setError('');
    const {error:err}=await supabase.from('crop_care_checkins').insert({plan_id:planId,user_id:userId,health_status:health,notes:checkNote.trim()||null});
    if(err)setError('Could not save your check-in.');else{setCheckNote('');setHealth('unknown');await load();}setBusy(false);
  };
  const dueTasks=tasks.filter(t=>t.status==='pending');
  const dateText=(v:string)=>new Date(v).toLocaleDateString([], {day:'numeric',month:'short',year:'numeric'});
  const statusLabel=(s:string)=>s==='improving'?'Improving':s==='unchanged'?'No change':s==='worsening'?'Getting worse':'Not sure';

  return <div className="px-4 py-5 sm:px-6 space-y-5">
    <section className="rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4">
      <h2 className="font-semibold text-[#1d2d27]">Crop reminders</h2>
      <p className="mt-1 text-xs text-[#657267]">Would you like Omulimi to remind you when your crops need attention?</p>
      {remindersEnabled?<p className="mt-3 text-sm font-semibold text-[#285b40]">Reminders are enabled on this device.</p>:<button onClick={()=>void enableReminders()} disabled={reminderBusy} className="mt-3 rounded-xl bg-[#174432] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{reminderBusy?'Saving…':'Allow reminders'}</button>}
      {reminderPermission==='denied'&&<p className="mt-2 text-xs text-[#9a5b35]">Notifications are blocked in your browser settings. Enable them there, then try again.</p>}
      <p className="mt-2 text-[11px] text-[#879188]">Device notifications are checked while Omulimi is open. Background reminders while the app is closed need a push service, which is not connected yet.</p>
    </section>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-[#719579]">Farm supervision</p><h1 className="mt-1 text-2xl font-semibold text-[#1d2d27]" style={{fontFamily:'Fraunces, Georgia, serif'}}>Crop care</h1><p className="mt-1 text-sm text-[#657267]">Keep track of crop checks and care activities.</p></header>
    <section className="rounded-2xl bg-[#174432] p-4 text-white"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#e8d6a8]"/><span className="text-sm font-semibold">Upcoming activities</span></div><p className="mt-2 text-3xl font-semibold">{dueTasks.length}</p><p className="text-xs text-white/70">Tasks still to complete</p></section>
    {error&&<div role="alert" className="flex gap-2 rounded-xl bg-[#fff3e9] p-3 text-sm text-[#8f3e25]"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#1d2d27]">Your crop-care plans</h2><span className="text-xs text-[#879188]">Linked to scans</span></div>
    {loading?<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-[#285b40]"/></div>:plans.length===0?<div className="rounded-2xl border border-dashed border-[#d8cdb9] bg-[#faf7ef] p-6 text-center"><Sprout className="mx-auto h-8 w-8 text-[#719579]"/><p className="mt-3 font-semibold text-[#1d2d27]">No care plans yet</p><p className="mt-1 text-sm text-[#657267]">Scan a supported crop to create its care plan automatically.</p></div>:<div className="space-y-3">{plans.map(plan=>{const planTasks=tasks.filter(t=>t.plan_id===plan.id);const planChecks=checkins.filter(c=>c.plan_id===plan.id);const open=expanded===plan.id;return <article key={plan.id} className="overflow-hidden rounded-2xl border border-[#e4dac7] bg-[#faf7ef]"><button onClick={()=>setExpanded(open?null:plan.id)} className="flex w-full items-center gap-3 p-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7eddf]"><Sprout className="h-5 w-5 text-[#285b40]"/></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#1d2d27]">{plan.care_plan?.summary as string||plan.issue_name}</span><span className="mt-1 block text-xs text-[#657267]">{plan.crop_name} · {plan.district_name} · {plan.diagnosis_status==='unconfirmed'?'Not confirmed':''}</span></span><span className="text-[#719579]">{open?<ChevronUp/>:<ChevronDown/>}</span></button>{open&&<div className="border-t border-[#e4dac7] p-4 space-y-4"><div className="flex items-center justify-between"><span className="text-xs text-[#657267]">Started {dateText(plan.started_at)}</span><button onClick={()=>setShowTask(showTask===plan.id?null:plan.id)} className="text-xs font-semibold text-[#285b40]">+ Add task</button></div>{showTask===plan.id&&<form onSubmit={addTask} className="space-y-2"><input className={field} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="What should you check?" required/><input className={field} type="date" value={taskDate} onChange={e=>setTaskDate(e.target.value)} required/><button className={button} disabled={busy}>Add task</button></form>}<div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#879188]">Tasks</h3>{planTasks.length===0?<p className="text-xs text-[#879188]">No tasks scheduled yet.</p>:<div className="space-y-2">{planTasks.map(task=><div key={task.id} className="flex items-start gap-2 rounded-xl bg-white p-3"><button disabled={busy||task.status!=='pending'} onClick={()=>void updateTask(task,'done')} aria-label="Mark task complete" className="mt-0.5 text-[#719579]"><CheckCircle2 className="h-5 w-5"/></button><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${task.status==='done'?'text-[#879188] line-through':'text-[#1d2d27]'}`}>{task.title}</p><p className="mt-1 text-[11px] text-[#879188]">{dateText(task.due_at)} · {task.status}</p></div>{task.status==='pending'&&<button onClick={()=>void updateTask(task,'skipped')} className="text-[11px] text-[#879188]">Skip</button>}</div>)}</div>}</div><div className="rounded-xl bg-[#e7eddf] p-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-[#174432]"><ClipboardCheck className="h-4 w-4"/>Crop check-in</h3><p className="mt-1 text-xs text-[#52645a]">Record what you observe. This tracks progress; it does not certify crop health.</p><select className={`${field} mt-3`} value={health} onChange={e=>setHealth(e.target.value)}><option value="unknown">Not sure</option><option value="improving">Improving</option><option value="unchanged">No change</option><option value="worsening">Getting worse</option></select><textarea className={`${field} mt-2`} rows={2} value={checkNote} onChange={e=>setCheckNote(e.target.value)} placeholder="What did you notice?"/><button disabled={busy} onClick={()=>void addCheckin(plan.id)} className="mt-2 rounded-xl bg-[#174432] px-4 py-2.5 text-xs font-semibold text-white">Save check-in</button></div>{planChecks.length>0&&<div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#879188]">Progress history</h3><div className="space-y-2">{planChecks.map(c=><div key={c.id} className="border-l-2 border-[#b9c9b2] pl-3"><p className="text-xs font-semibold text-[#1d2d27]">{statusLabel(c.health_status)} · {dateText(c.observed_at)}</p>{c.notes&&<p className="mt-1 text-xs text-[#657267]">{c.notes}</p>}</div>)}</div></div>}</div>}</article>})}</div>}
    {dueTasks.length>0&&<section><h2 className="mb-2 text-lg font-semibold text-[#1d2d27]">Next to do</h2><div className="space-y-2">{dueTasks.slice(0,5).map(t=><div key={t.id} className="flex items-center gap-3 rounded-xl bg-[#faf7ef] p-3"><Circle className="h-4 w-4 text-[#719579]"/><span className="min-w-0 flex-1 text-sm text-[#1d2d27]">{t.title}</span><span className="text-[10px] text-[#879188]">{dateText(t.due_at)}</span></div>)}</div></section>}
    <p className="text-[11px] leading-relaxed text-[#879188]">Omulimi records your observations and planned activities. For uncertain or worsening crop problems, contact a qualified agricultural extension worker.</p>
  </div>;
}
