import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, RefreshCw, Pencil, Eraser, Wand2, Check } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateEmail, type GeneratedEmail } from "@/lib/ai.functions";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — AI Smart Productivity" },
      { name: "description", content: "Generate professional emails in a formal, friendly or persuasive tone." },
      { property: "og:title", content: "Smart Email Generator" },
      { property: "og:description", content: "Generate professional emails in a formal, friendly or persuasive tone." },
    ],
  }),
  component: EmailPage,
});

type Tone = "formal" | "friendly" | "persuasive";
const TONES: { v: Tone; label: string; desc: string }[] = [
  { v: "formal", label: "Formal", desc: "Professional and respectful" },
  { v: "friendly", label: "Friendly", desc: "Warm and conversational" },
  { v: "persuasive", label: "Persuasive", desc: "Convincing, action-oriented" },
];

const toText = (e: GeneratedEmail) => `Subject: ${e.subject}\n\n${e.greeting}\n\n${e.body}\n\n${e.closing}`;

function EmailPage() {
  const draft = useStore((s) => s.emailDraft);
  const userName = useStore((s) => s.userName);
  const [form, setForm] = useState({ recipient: "", subject: "", keyInfo: "" });
  const [tone, setTone] = useState<Tone>("formal");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (draft) {
      setForm(draft);
      actions.setEmailDraft(null);
      toast.success("Meeting details added to the email form");
    }
  }, [draft]);

  const run = async () => {
    const e: Record<string, string> = {};
    if (!form.recipient.trim()) e.recipient = "Who is this email for?";
    if (!form.subject.trim()) e.subject = "Add a subject or purpose.";
    if (!form.keyInfo.trim()) e.keyInfo = "Add the key information to include.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await generateEmail({ data: { ...form, tone, length, senderName: userName || undefined } });
      if (!res.ok) { setError(res.error); return; }
      setText(toText(res.data));
      setEditing(false);
      actions.log("email", `Drafted email to ${form.recipient}`);
      toast.success("Email generated");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell>
      <PageHeader title="Smart Email Generator" subtitle="Describe what you need. The AI only uses the facts you give it." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Email details">
          <div className="space-y-4">
            <Field label="Recipient" error={errors.recipient}>
              <Input id="recipient" placeholder="e.g. Ms. Dlamini, Head of Finance" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
            </Field>
            <Field label="Subject or purpose" error={errors.subject}>
              <Input id="subject" placeholder="e.g. Request to move project review" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Key information to include" error={errors.keyInfo}>
              <Textarea id="keyInfo" rows={6} placeholder="Facts, dates and requests the email should mention" value={form.keyInfo} onChange={(e) => setForm({ ...form, keyInfo: e.target.value })} />
            </Field>
            <div>
              <Label>Tone</Label>
              <div role="radiogroup" className="mt-2 grid grid-cols-3 gap-2">
                {TONES.map((t) => (
                  <button key={t.v} role="radio" aria-checked={tone === t.v} onClick={() => setTone(t.v)}
                    className={cn("rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tone === t.v ? "border-primary bg-secondary" : "hover:bg-muted")}>
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Length</Label>
              <div role="radiogroup" className="mt-2 flex gap-2">
                {(["short", "medium", "long"] as const).map((l) => (
                  <button key={l} role="radio" aria-checked={length === l} onClick={() => setLength(l)}
                    className={cn("rounded-full border px-4 py-1.5 text-sm capitalize transition", length === l ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={run} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Wand2 />}Generate Email</Button>
              <Button variant="outline" onClick={() => { setForm({ recipient: "", subject: "", keyInfo: "" }); setErrors({}); setText(""); setError(null); }}><Eraser />Clear Form</Button>
            </div>
          </div>
        </Panel>

        <Panel title="Your email">
          {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {loading && !text ? (
            <div className="flex items-center gap-2 py-16 text-muted-foreground justify-center"><Loader2 className="h-4 w-4 animate-spin" />Writing your email…</div>
          ) : !text ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Your generated email will appear here.</p>
          ) : (
            <>
              {editing ? (
                <Textarea aria-label="Edit email" rows={18} value={text} onChange={(e) => setText(e.target.value)} />
              ) : (
                <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">{text}</div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={copy}>{copied ? <Check /> : <Copy />}Copy Email</Button>
                <Button variant="outline" onClick={() => setEditing((e) => !e)}><Pencil />{editing ? "Done editing" : "Edit"}</Button>
                <Button variant="outline" onClick={run} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}Regenerate</Button>
              </div>
            </>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactElement<{ id: string }> }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={children.props.id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
