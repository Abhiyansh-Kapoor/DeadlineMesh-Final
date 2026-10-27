import type { Task } from "../types/task";
import { addDays, dayNumber } from "./dates";

export interface ScheduledTask {
  task: Task;
  start: string;
  end: string;
  endExclusive: string;
  level: number;
}

export function scheduleTasks(tasks: Task[]): ScheduledTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const result = new Map<number, ScheduledTask>();
  const visiting = new Set<number>();

  function schedule(task: Task): ScheduledTask {
    const cached = result.get(task.id);
    if (cached) return cached;
    if (visiting.has(task.id)) throw new Error("Circular task dependencies cannot be scheduled.");
    visiting.add(task.id);
    const prerequisites = task.dependencies.map((id) => {
      const dependency = byId.get(id);
      if (!dependency) throw new Error("A task has a missing prerequisite.");
      return schedule(dependency);
    });
    const start = prerequisites.reduce(
      (latest, item) => item.endExclusive > latest ? item.endExclusive : latest,
      task.start_date.slice(0, 10)
    );
    const scheduled = {
      task,
      start,
      end: addDays(start, task.duration - 1),
      endExclusive: addDays(start, task.duration),
      level: prerequisites.length ? Math.max(...prerequisites.map((item) => item.level)) + 1 : 0,
    };
    visiting.delete(task.id);
    result.set(task.id, scheduled);
    return scheduled;
  }

  tasks.forEach(schedule);
  return [...result.values()].sort((a, b) => dayNumber(a.start) - dayNumber(b.start) || a.task.id - b.task.id);
}
