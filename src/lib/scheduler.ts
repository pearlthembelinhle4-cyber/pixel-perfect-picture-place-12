export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null; // YYYY-MM-DD
  durationMin: number;
  preferredTime: "any" | "morning" | "afternoon";
  completed: boolean;
  order: number;
  source?: "meeting" | "manual";
  createdAt: number;
}

export interface Availability {
  startHour: number; // e.g. 9
  endHour: number; // e.g. 17
  workDays: number[]; // 0=Sun..6=Sat
  breakMin: number; // break after each session
}

export interface Block {
  kind: "task" | "break";
  taskId?: string;
  title: string;
  date: string;
  start: number; // minutes from midnight
  end: number;
  priority?: Priority;
  lateForDeadline?: boolean;
}

export interface Conflict {
  taskId: string;
  title: string;
  reason: string;
}

export interface Schedule {
  days: { date: string; blocks: Block[] }[];
  conflicts: Conflict[];
}

const P: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Sort by deadline (earliest first, none last), then priority, then manual order. */
export function prioritize(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.dueDate ?? "9999-12-31";
    const db = b.dueDate ?? "9999-12-31";
    if (da !== db) return da < db ? -1 : 1;
    if (P[a.priority] !== P[b.priority]) return P[a.priority] - P[b.priority];
    return a.order - b.order;
  });
}

/**
 * Builds a schedule only inside the user's availability. Tasks that don't fit
 * in the planning window, or would finish after their deadline, are reported as conflicts.
 */
export function buildSchedule(
  tasks: Task[],
  avail: Availability,
  startDate: Date,
  numDays: number,
): Schedule {
  const days: Schedule["days"] = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < numDays; i++) {
    if (avail.workDays.includes(cursor.getDay())) days.push({ date: toISO(cursor), blocks: [] });
    cursor.setDate(cursor.getDate() + 1);
  }
  const free = days.map(() => avail.startHour * 60);
  const dayEnd = avail.endHour * 60;
  const capacity = dayEnd - avail.startHour * 60;
  const conflicts: Conflict[] = [];
  const todayISO = toISO(startDate);

  for (const t of prioritize(tasks.filter((x) => !x.completed))) {
    if (t.durationMin > capacity) {
      conflicts.push({ taskId: t.id, title: t.title, reason: `Needs ${t.durationMin} min but your working day is only ${capacity} min. Split it into smaller tasks.` });
      continue;
    }
    if (t.dueDate && t.dueDate < todayISO) {
      conflicts.push({ taskId: t.id, title: t.title, reason: `Deadline ${t.dueDate} has already passed. Move the deadline or mark it done.` });
      continue;
    }
    let placed = false;
    for (let d = 0; d < days.length && !placed; d++) {
      let start = free[d];
      if (t.preferredTime === "afternoon") start = Math.max(start, 12 * 60);
      if (t.preferredTime === "morning" && start + t.durationMin > 12 * 60) continue;
      const end = start + t.durationMin;
      if (end > dayEnd) continue;
      if (t.dueDate && days[d].date > t.dueDate) break; // past the deadline
      days[d].blocks.push({ kind: "task", taskId: t.id, title: t.title, date: days[d].date, start, end, priority: t.priority });
      free[d] = end;
      if (avail.breakMin > 0 && end + avail.breakMin <= dayEnd) {
        days[d].blocks.push({ kind: "break", title: "Break", date: days[d].date, start: end, end: end + avail.breakMin });
        free[d] = end + avail.breakMin;
      }
      placed = true;
    }
    if (!placed) {
      conflicts.push({
        taskId: t.id,
        title: t.title,
        reason: t.dueDate
          ? `Not enough free time before the ${t.dueDate} deadline. Move its deadline, shorten it, or lower other tasks' priority.`
          : `Not enough free time in this plan. Try the weekly view or extend your working hours.`,
      });
    }
  }
  for (const d of days) {
    const last = d.blocks[d.blocks.length - 1];
    if (last?.kind === "break") d.blocks.pop();
  }
  return { days, conflicts };
}
