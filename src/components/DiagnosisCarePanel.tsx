import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Task = { id: string; title: string; instructions: string | null; task_type: string; due_at: string; status: 'pending' | 'done' | 'skipped' };
type PlanData = { care_plan: Record<string, unknown> };

export default function DiagnosisCarePanel({ planId, userId }: { planId: string; userId: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [p, t] = await Promise.all([
      supabase.from('crop_care_plans').select('care_plan').eq('id', planId).eq('user_id', userId).single(),
      supabase.from('crop_care_tasks').select('id,title,instructions,task_type,due_at,status').eq('plan_id', planId).eq('user_id', userId).order('due_at', { ascending: true }),
    ]);
    if (p.error) setError('The saved care plan could not be loaded. Please refresh and try again.');
    else setPlan(p.data as PlanData);
    if (t.error) setError('The care plan loaded, but its activity calendar could not be loaded.');
    else setTasks((t.data || []) as Task[]);
    setLoading(false);
  }, [planId, userId]);

  useEffect(() => { void load(); }, [load]);

  const updateTask = async (task: Task, status: 'done' | 'skipped') => {
    setBusyId(task.id); setError('');
    const { error: updateError } = await supabase.from('crop_care_tasks')
      .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', task.id).eq('user_id', userId);
    if (updateError) setError('Could not update this activity. Please try again.');
    else setTasks(current => current.map(item => item.id === task.id ? { ...item, status } : item));
    setBusyId(null);
  };

  const guidance = plan?.care_plan?.kato_guidance;
  const pending = tasks.filter(task => task.status === 'pending');
  const dateText = (value: string) => new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return <section className="space-y-3">
    <div className="rounded-2xl border border-[#dce5d8] bg-white p-4">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7eddf] text-[#285b40]"><CalendarDays className="h-4 w-4"/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-[#1d2d27]">Treatment and care plan</h3><p className="text-xs text-[#718074]">{pending.length} activities still to do</p></div><button onClick={() => void load()} aria-label="Refresh care plan" className="rounded-lg p-2 text-[#718074]"><RefreshCw className="h-4 w-4"/></button></div>
      {loading ? <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-[#285b40]"/></div> :
        typeof guidance === 'string' && guidance.trim() ?
          <div className="mt-4 border-t border-[#edf0e9] pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#718074]">Kato's guidance</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-[#43564a]">{guidance}</p></div> :
          <p className="mt-4 border-t border-[#edf0e9] pt-3 text-sm leading-relaxed text-[#718074]">Your scan is saved. Kato's full care guidance is not available yet. You can still use the inspection activities below and ask Kato about this plant.</p>}
    </div>
    <div className="rounded-2xl border border-[#dce5d8] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#1d2d27]">Treatment calendar</h3>
      <p className="mt-1 text-xs text-[#718074]">Activities are scheduled from the scan time. Complete each check as you do it.</p>
      {loading ? <div className="py-5 text-center text-xs text-[#718074]">Loading activities…</div> :
        tasks.length === 0 ? <p className="mt-3 text-xs text-[#879087]">No activities have been scheduled for this diagnosis yet.</p> :
        <div className="mt-3 space-y-2">{tasks.map(task => <div key={task.id} className="flex items-start gap-2 rounded-xl bg-[#f4f6f0] p-3">
          <button disabled={task.status !== 'pending' || busyId === task.id} onClick={() => void updateTask(task, 'done')} aria-label="Mark activity complete" className="mt-0.5 text-[#477653] disabled:opacity-50">{task.status === 'done' ? <CheckCircle2 className="h-5 w-5"/> : <Circle className="h-5 w-5"/>}</button>
          <div className="min-w-0 flex-1"><p className={`text-sm font-medium ${task.status === 'done' ? 'text-[#879087] line-through' : 'text-[#263b2d]'}`}>{task.title}</p><p className="mt-1 text-[11px] text-[#718074]">{dateText(task.due_at)} · {task.status}</p>{task.instructions && <p className="mt-1 text-xs leading-relaxed text-[#718074]">{task.instructions}</p>}</div>
          {task.status === 'pending' && <button disabled={busyId === task.id} onClick={() => void updateTask(task, 'skipped')} className="text-[11px] text-[#879087] disabled:opacity-50">Skip</button>}
        </div>)}</div>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-[#fff3e9] p-3 text-xs text-[#8f3e25]">{error}</p>}
  </section>;
}
