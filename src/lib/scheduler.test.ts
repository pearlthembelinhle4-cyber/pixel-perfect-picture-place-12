import { describe, it, expect } from "vitest";
import { buildSchedule, prioritize, type Task } from "./scheduler";

const base = (p: Partial<Task>): Task => ({
  id: p.id ?? "x", title: p.title ?? "T", description: "", priority: "medium", dueDate: null,
  durationMin: 60, preferredTime: "any", completed: false, order: 0, createdAt: 0, ...p,
});
const avail = { startHour: 9, endHour: 12, workDays: [0, 1, 2, 3, 4, 5, 6], breakMin: 0 };
const mon = new Date(2026, 10, 2); // Monday

describe("scheduler", () => {
  it("orders by deadline then priority", () => {
    const r = prioritize([base({ id: "a", priority: "low", dueDate: "2026-11-03" }), base({ id: "b", priority: "high" }), base({ id: "c", priority: "high", dueDate: "2026-11-03" })]);
    expect(r.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
  it("never schedules outside availability", () => {
    const s = buildSchedule([base({ id: "a", durationMin: 120 }), base({ id: "b", durationMin: 120 })], avail, mon, 1);
    const blocks = s.days[0].blocks;
    expect(blocks.every((b) => b.start >= 540 && b.end <= 720)).toBe(true);
    expect(s.conflicts.map((c) => c.taskId)).toEqual(["b"]);
  });
  it("flags tasks that cannot finish by their deadline", () => {
    const s = buildSchedule([base({ id: "a", durationMin: 180, dueDate: "2026-11-02" }), base({ id: "b", durationMin: 60, dueDate: "2026-11-02" })], avail, mon, 7);
    expect(s.conflicts.map((c) => c.taskId)).toEqual(["b"]);
  });
  it("skips completed tasks and non-work days", () => {
    const s = buildSchedule([base({ id: "a", completed: true })], { ...avail, workDays: [1] }, mon, 7);
    expect(s.days.length).toBe(1);
    expect(s.days[0].blocks.length).toBe(0);
  });
});
