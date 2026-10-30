import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Pencil, Eraser, Download, Sparkles, ListPlus, Mail } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { summarizeMeeting, type MeetingSummary } from "@/lib/ai.functions";
import { actions } from "@/lib/store";
import { toISO } from "@/lib/scheduler";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — AI Smart Productivity" },
      { name: "description", content: "Turn meeting notes into decisions, action items, owners and deadlines." },
      { property: "og:title", content: "Meeting Notes Summarizer" },
      { property: "og:description", content: "Turn meeting notes into decisions, action items, owners and deadlines." },
    ],
  }),
  component: MeetingsPage,
});

function toMarkdown(s: MeetingSummary) {
  const list = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join("\n") : "- None recorded");
  return `# Meeting Summary

## Meeting Overview
${s.overview}

## Key Discussion Points
${list(s.discussionPoints)}

## Decisions Made
${list(s.decisions)}

## Action Items & Responsibilities
${s.actionItems.length ? s.actionItems.map((a) => `- ${a.task} — Owner: ${a.owner} — Deadline: ${a.deadline}`).join("\n") : "- None recorded"}

## Deadlines
${list(s.deadlines)}

## Follow-Up Questions
${list(s.followUps)}
`;
}

function MeetingsPage() {
  const nav = useNavigate();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<"tasks" | "email" | null>(null);

  const run = async () => {
    if (notes.trim().length < 20) { setError("Paste at least a few sentences of meeting notes."); return; }
    setLoading(true); setError(null);
    try {
      const res = await summarizeMeeting({ data: { notes, today: toISO(new Date()) } });
      if (!res.ok) { setError(res.error); return; }
      setSummary(res.data);
      setText(toMarkdown(res.data));
      setPicked(new Set(res.data.actionItems.map((_, i) => i)));
      setEditing(false);
      actions.log("meeting", `Summarised meeting (${res.data.actionItems.length} action items)`);
      toast.success("Summary ready");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally { setLoading(false); }
  };

  const exportFile = () => {
    const blob = new Blob([text], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meeting-summary-${toISO(new Date())}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Summary exported");
  };

  const transfer = () => {
    if (!summary) return;
    const items = summary.actionItems.filter((_, i) => picked.has(i));
    actions.addTasks(items.map((a) => ({
      title: a.task,
      description: `From meeting. Owner: ${a.owner}. Deadline: ${a.deadline}.`,
      priority: a.deadlineISO ? "high" : "medium",
      dueDate: a.deadlineISO && /^\d{4}-\d{2}-\d{2}$/.test(a.deadlineISO) ? a.deadlineISO : null,
      durationMin: 60,
      preferredTime: "any",
      source: "meeting",
    })));
    actions.log("task", `Added ${items.length} meeting action items to planner`);
    toast.success(`${items.length} task${items.length === 1 ? "" : "s"} added to your planner`);
    nav({ to: "/planner" });
  };

  const toEmail = () => {
    if (!summary) return;
    actions.setEmailDraft({
      recipient: "Meeting attendees",
      subject: "Meeting follow-up: decisions and action items",
      keyInfo: `Decisions:\n${summary.decisions.map((d) => `- ${d}`).join("\n") || "- None recorded"}\n\nAction items:\n${summary.actionItems.map((a) => `- ${a.task} (owner: ${a.owner}, deadline: ${a.deadline})`).join("\n") || "- None"}`,
    });
    nav({ to: "/email" });
  };

  const togglePick = (i: number) => setPicked((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <AppShell>
      <PageHeader title="Meeting Notes Summarizer" subtitle="Paste notes or a transcript. Missing details are marked as Unspecified, never invented." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Meeting notes" className="lg:col-span-2">
          <Textarea aria-label="Meeting notes" rows={16} placeholder="Paste your meeting notes or transcript here…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="mt-2 text-xs text-muted-foreground">{notes.length.toLocaleString()} / 40,000 characters</p>
          {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={run} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Sparkles />}Summarize Notes</Button>
            <Button variant="outline" onClick={() => { setNotes(""); setSummary(null); setText(""); setError(null); }}><Eraser />Clear Notes</Button>
          </div>
        </Panel>

        <div className="space-y-6 lg:col-span-3">
          {loading && <Panel><div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Reading your notes…</div></Panel>}
          {!loading && !summary && <Panel><p className="py-16 text-center text-sm text-muted-foreground">Your summary will appear here.</p></Panel>}
          {!loading && summary && (
            <>
              <Panel title="Summary" action={
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(text); toast.success("Summary copied"); }}><Copy />Copy Summary</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}><Pencil />{editing ? "Done" : "Edit Summary"}</Button>
                  <Button size="sm" variant="ghost" onClick={exportFile}><Download />Export Summary</Button>
                </div>
              }>
                {editing ? (
                  <Textarea aria-label="Edit summary" rows={20} value={text} onChange={(e) => setText(e.target.value)} />
                ) : (
                  <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">{text}</div>
                )}
              </Panel>

              <Panel title="Action items" action={<span className="text-xs text-muted-foreground">Review and choose which to send</span>}>
                {summary.actionItems.length === 0 ? <p className="text-sm text-muted-foreground">No action items were found in these notes.</p> : (
                  <ul className="space-y-2">
                    {summary.actionItems.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <Checkbox id={`ai-${i}`} checked={picked.has(i)} onCheckedChange={() => togglePick(i)} className="mt-0.5" />
                        <label htmlFor={`ai-${i}`} className="flex-1 text-sm">
                          <div className="font-medium">{a.task}</div>
                          <div className="text-xs text-muted-foreground">Owner: {a.owner} · Deadline: {a.deadline}</div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={picked.size === 0} onClick={() => setConfirm("tasks")}><ListPlus />Add {picked.size} to Task Planner</Button>
                  <Button variant="outline" onClick={() => setConfirm("email")}><Mail />Draft follow-up email</Button>
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "tasks" ? "Add these action items to your planner?" : "Use meeting details in an email?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "tasks"
                ? `${picked.size} task(s) will be added with a default 60-minute duration. You can edit them afterwards.`
                : "The decisions and action items from this meeting will be filled into the email form. Nothing is sent."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm === "tasks" ? transfer : toEmail}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
