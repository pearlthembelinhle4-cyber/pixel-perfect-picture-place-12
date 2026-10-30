import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Smart Productivity" },
      { name: "description", content: "Set your name, working hours and break length." },
      { property: "og:title", content: "Settings — AI Smart Productivity" },
      { property: "og:description", content: "Set your name, working hours and break length." },
    ],
  }),
  component: SettingsPage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SettingsPage() {
  const avail = useStore((s) => s.availability);
  const userName = useStore((s) => s.userName);
  const [name, setName] = useState(userName);
  const [a, setA] = useState(avail);
  useEffect(() => { setName(userName); setA(avail); }, [userName, avail]);

  const save = () => {
    if (a.endHour <= a.startHour) return toast.error("End time must be after start time.");
    if (a.workDays.length === 0) return toast.error("Choose at least one working day.");
    actions.setUserName(name.trim());
    actions.setAvailability(a);
    toast.success("Settings saved");
  };

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Your data is stored on this device only." />
      <div className="grid max-w-2xl gap-6">
        <Panel title="Profile">
          <div className="space-y-1.5"><Label htmlFor="name">Your name (used in greetings and email sign-offs)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
        </Panel>
        <Panel title="Availability">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label htmlFor="sh">Start hour</Label><Input id="sh" type="number" min={0} max={23} value={a.startHour} onChange={(e) => setA({ ...a, startHour: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label htmlFor="eh">End hour</Label><Input id="eh" type="number" min={1} max={24} value={a.endHour} onChange={(e) => setA({ ...a, endHour: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label htmlFor="br">Break (min)</Label><Input id="br" type="number" min={0} max={60} value={a.breakMin} onChange={(e) => setA({ ...a, breakMin: Number(e.target.value) })} /></div>
          </div>
          <Label className="mt-4 block">Working days</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = a.workDays.includes(i);
              return <button key={d} aria-pressed={on} onClick={() => setA({ ...a, workDays: on ? a.workDays.filter((x) => x !== i) : [...a.workDays, i] })}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{d}</button>;
            })}
          </div>
        </Panel>
        <div className="flex gap-2">
          <Button onClick={save}>Save settings</Button>
          <Button variant="outline" onClick={() => { if (confirm("Delete all tasks, activity and settings on this device?")) { actions.resetAll(); toast.success("All data cleared"); } }}>Clear all data</Button>
        </div>
      </div>
    </AppShell>
  );
}
