import { useSyncExternalStore } from "react";
import type { Availability, Task } from "./scheduler";

export interface Activity {
  id: string;
  type: "email" | "meeting" | "task";
  text: string;
  at: number;
}

interface State {
  tasks: Task[];
  activity: Activity[];
  availability: Availability;
  userName: string;
  emailDraft: { recipient: string; subject: string; keyInfo: string } | null;
}

const KEY = "aisp-state-v1";
const initial: State = {
  tasks: [],
  activity: [],
  availability: { startHour: 9, endHour: 17, workDays: [1, 2, 3, 4, 5], breakMin: 10 },
  userName: "",
  emailDraft: null,
};

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
}

function set(fn: (s: State) => State) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full */
  }
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      l();
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(initial),
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const actions = {
  log(type: Activity["type"], text: string) {
    set((s) => ({ ...s, activity: [{ id: uid(), type, text, at: Date.now() }, ...s.activity].slice(0, 30) }));
  },
  addTasks(ts: Omit<Task, "id" | "order" | "createdAt" | "completed">[]) {
    set((s) => {
      const max = s.tasks.reduce((m, t) => Math.max(m, t.order), 0);
      const added = ts.map((t, i) => ({ ...t, id: uid(), order: max + i + 1, createdAt: Date.now(), completed: false }));
      return { ...s, tasks: [...s.tasks, ...added] };
    });
  },
  updateTask(id: string, patch: Partial<Task>) {
    set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  },
  deleteTask(id: string) {
    set((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  move(id: string, dir: -1 | 1) {
    set((s) => {
      const sorted = [...s.tasks].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((t) => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return s;
      const a = sorted[i].order;
      sorted[i] = { ...sorted[i], order: sorted[j].order };
      sorted[j] = { ...sorted[j], order: a };
      return { ...s, tasks: sorted };
    });
  },
  setAvailability(a: Availability) {
    set((s) => ({ ...s, availability: a }));
  },
  setUserName(n: string) {
    set((s) => ({ ...s, userName: n }));
  },
  setEmailDraft(d: State["emailDraft"]) {
    set((s) => ({ ...s, emailDraft: d }));
  },
  resetAll() {
    set(() => initial);
  },
};
