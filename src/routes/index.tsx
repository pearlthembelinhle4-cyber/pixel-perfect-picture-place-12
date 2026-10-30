import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, FileText, CalendarCheck, CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { toISO } from "@/lib/scheduler";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Smart Productivity Assistant" },
      { name: "description", content: "Write emails, summarise meetings and plan your week from one AI-powered dashboard." },
      { property: "og:title", content: "AI Smart Productivity Assistant" },
      { property: "og:description", content: "Write emails, summarise meetings and plan your week from one AI-powered dashboard." },
    ],
  }),
  component: Dashboard,
});

const TOOLS = [
  { to: "/email", title: "Write an email", desc: "Formal, friendly or persuasive drafts", icon: Mail },
  { to: "/meetings", title: "Summarise a meeting", desc: "Decisions, action items, deadlines", icon: FileText },
  { to: "/planner", title: "Plan my tasks", desc: "Daily and weekly schedules", icon: CalendarCheck },
] as const;

function Dashboard() {
  const tasks = useStore((s) => s.tasks);
  const activity = useStore((s) => s.activity);
  const name = useStore((s) => s.userName);
  const today = toISO(new Date());
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.length - pending.length;
  const todays = pending.filter((t) => t.dueDate === today);
  const upcoming = pending.filter((t) => t.dueDate && t.dueDate >= today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)).slice(0, 5);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <div className="mb-8 overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground sm:p-10">
        <p className="text-sm opacity-80">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{greet}{name ? `, ${name}` : ""}.</h1>
        <p className="mt-2 max-w-xl opacity-90">
          {todays.length ? `You have ${todays.length} task${todays.length > 1 ? "s" : ""} due today.` : "Nothing due today. A good moment to plan ahead."}
        </p>
        <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
          {[["Pending", pending.length], ["Completed", done], ["Due today", todays.length]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur">
              <div className="text-2xl font-bold">{v}</div>
              <div className="text-xs opacity-80">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {TOOLS.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to} className="group rounded-xl border bg-card p-5 shadow-card transition hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{desc}</p>
            <ArrowRight className="mt-3 h-4 w-4 text-primary transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Today's tasks">
          {todays.length === 0 ? <Empty text="No tasks due today." /> : (
            <ul className="space-y-2">{todays.map((t) => <li key={t.id} className="flex items-center gap-2 text-sm"><Circle className="h-4 w-4 text-ring" />{t.title}</li>)}</ul>
          )}
        </Panel>
        <Panel title="Upcoming deadlines">
          {upcoming.length === 0 ? <Empty text="No upcoming deadlines." /> : (
            <ul className="space-y-3">{upcoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{t.title}</span>
                <Badge variant="secondary" className="shrink-0"><Clock className="mr-1 h-3 w-3" />{t.dueDate}</Badge>
              </li>))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activity">
          {activity.length === 0 ? <Empty text="Your activity will appear here." /> : (
            <ul className="space-y-3">{activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div><div>{a.text}</div><div className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</div></div>
              </li>))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
