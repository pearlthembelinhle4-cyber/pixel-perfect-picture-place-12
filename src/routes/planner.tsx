import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, AlertTriangle, Coffee, Save, X } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actions, useStore } from "@/lib/store";
import { buildSchedule, fmtTime, type Priority, type Task } from "@/lib/scheduler";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — AI Smart Productivity" },
      { name: "description", content: "Prioritise tasks and build realistic daily or weekly schedules with breaks." },
      { property: "og:title", content: "AI Task Planner and Scheduler" },
      { property: "og:description", content: "Prioritise tasks and build realistic daily or weekly schedules with breaks." },
    ],
  }),
  component: PlannerPage,
});

type Draft = { title: string; description: string; priority: Priority; dueDate: string; durationMin: string; preferredTime: Task["preferredTime"] };
const empty: Draft = { title: "", description: "", priority: "medium", dueDate: "", durationMin: "60", preferredTime: "any" };
const PRI_STYLE: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-foreground border-warning/40",
  low: "bg-secondary text-secondary-foreground border-border",
};

function PlannerPage() {
  const tasks = useStore((s) => s.tasks);
  const avail = useStore((s) => s.availability);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [fPri, setFPri] = useState<"all" | Priority>("all");
  const [fStatus, setFStatus] = useState<"all" | "pending" | "done">("all");

  const schedule = useMemo(() => buildSchedule(tasks, avail, new Date(), view === "day" ? 1 : 7), [tasks, avail, view]);
  const list = [...tasks].sort((a, b) => a.order - b.order).filter((t) =>
    (fPri === "all" || t.priority === fPri) && (fStatus === "all" || (fStatus === "done" ? t.completed : !t.completed)));

  const save = () => {
    const dur = Number(draft.durationMin);
    if (!draft.title.trim()) return setErr("Give the task a title.");
    if (!Number.isFinite(dur) || dur < 5 || dur > 720) return setErr("Duration must be between 5 and 720 minutes.");
    setErr(null);
    const data = { title: draft.title.trim(), description: draft.description.trim(), priority: draft.priority, dueDate: draft.dueDate || null, durationMin: Math.round(dur), preferredTime: draft.preferredTime };
    if (editId) { actions.updateTask(editId, data); toast.success("Task updated"); }
    else { actions.addTasks([{ ...data, source: "manual" }]); actions.log("task", `Added task "${data.title}"`); toast.success("Task added"); }
    setDraft(empty); setEditId(null);
  };

  const edit = (t: Task) => {
    setEditId(t.id);
    setDraft({ title: t.title, description: t.description, priority: t.priority, dueDate: t.dueDate ?? "", durationMin: String(t.durationMin), preferredTime: t.preferredTime });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell>
      <PageHeader title="AI Task Planner" subtitle={`Schedules only use your working hours: ${avail.startHour}:00–${avail.endHour}:00 (change in Settings).`} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Panel title={editId ? "Edit task" : "Add a task"}>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="t-title">Task title</Label><Input id="t-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="t-desc">Description</Label><Textarea id="t-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Priority</Label>
                  <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v as Priority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                  </Select></div>
                <div className="space-y-1.5"><Label htmlFor="t-due">Due date</Label><Input id="t-due" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="t-dur">Duration (min)</Label><Input id="t-dur" type="number" min={5} max={720} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Preferred time</Label>
                  <Select value={draft.preferredTime} onValueChange={(v) => setDraft({ ...draft, preferredTime: v as Task["preferredTime"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="any">Any time</SelectItem><SelectItem value="morning">Morning</SelectItem><SelectItem value="afternoon">Afternoon</SelectItem></SelectContent>
                  </Select></div>
              </div>
              {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
              <div className="flex gap-2">
                <Button onClick={save}>{editId ? <Save /> : <Plus />}{editId ? "Save changes" : "Add task"}</Button>
                {editId && <Button variant="outline" onClick={() => { setEditId(null); setDraft(empty); }}><X />Cancel</Button>}
              </div>
            </div>
          </Panel>

          <Panel title={`Tasks (${list.length})`}>
            <div className="mb-3 flex flex-wrap gap-2">
              <Select value={fPri} onValueChange={(v) => setFPri(v as typeof fPri)}>
                <SelectTrigger className="h-8 w-[130px]" aria-label="Filter by priority"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={(v) => setFStatus(v as typeof fStatus)}>
                <SelectTrigger className="h-8 w-[130px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="done">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            {list.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet. Add one above or send action items from a meeting.</p> : (
              <ul className="space-y-2">
                {list.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox aria-label={`Mark ${t.title} complete`} checked={t.completed} className="mt-0.5"
                      onCheckedChange={(c) => { actions.updateTask(t.id, { completed: !!c }); if (c) { actions.log("task", `Completed "${t.title}"`); toast.success("Nice work — task completed"); } }} />
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm font-medium", t.completed && "text-muted-foreground line-through")}>{t.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className={cn("capitalize", PRI_STYLE[t.priority])}>{t.priority}</Badge>
                        <span>{t.durationMin} min</span>{t.dueDate && <span>· due {t.dueDate}</span>}{t.source === "meeting" && <span>· from meeting</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <IconBtn label="Move up" onClick={() => actions.move(t.id, -1)}><ArrowUp /></IconBtn>
                      <IconBtn label="Move down" onClick={() => actions.move(t.id, 1)}><ArrowDown /></IconBtn>
                      <IconBtn label="Edit" onClick={() => edit(t)}><Pencil /></IconBtn>
                      <IconBtn label="Delete" onClick={() => { actions.deleteTask(t.id); toast.success("Task deleted"); }}><Trash2 /></IconBtn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <Panel title="Your schedule" action={
            <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
              <TabsList><TabsTrigger value="day">Today</TabsTrigger><TabsTrigger value="week">Next 7 days</TabsTrigger></TabsList>
            </Tabs>
          }>
            <p className="mb-4 text-xs text-muted-foreground">Ordered by deadline, then priority, then your manual order. Breaks of {avail.breakMin} min are added between sessions.</p>
            {schedule.conflicts.length > 0 && (
              <div role="alert" className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" />{schedule.conflicts.length} task(s) don't fit</div>
                <ul className="space-y-1 text-sm">{schedule.conflicts.map((c) => <li key={c.taskId}><strong>{c.title}:</strong> {c.reason}</li>)}</ul>
              </div>
            )}
            {schedule.days.length === 0 ? <p className="text-sm text-muted-foreground">No working days in this range. Check your working days in Settings.</p> : (
              <div className="space-y-6">
                {schedule.days.map((d) => (
                  <div key={d.date}>
                    <h3 className="mb-2 text-sm font-semibold text-primary">{new Date(d.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</h3>
                    {d.blocks.length === 0 ? <p className="text-sm text-muted-foreground">Free day.</p> : (
                      <ol className="space-y-1.5">
                        {d.blocks.map((b, i) => (
                          <li key={i} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", b.kind === "break" ? "text-muted-foreground" : "border bg-secondary/50")}>
                            <span className="w-24 shrink-0 font-mono text-xs">{fmtTime(b.start)}–{fmtTime(b.end)}</span>
                            {b.kind === "break" ? <span className="flex items-center gap-1.5"><Coffee className="h-3.5 w-3.5" />Break</span> : (
                              <span className="flex flex-1 items-center justify-between gap-2"><span>{b.title}</span><Badge variant="outline" className={cn("capitalize", PRI_STYLE[b.priority!])}>{b.priority}</Badge></span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={label} title={label} onClick={onClick}>{children}</Button>;
}
