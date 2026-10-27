
export interface CriticalPathTask {
  id: number;
  name: string;
  duration: number;
  status: "Pending" | "In Progress" | "Completed";
  dependencies: number[];
}

export interface TaskSchedule {
  task_id: number;
  task_name: string;
  duration: number;
  earliest_start: number;
  earliest_finish: number;
  latest_start: number;
  latest_finish: number;
  slack: number;
  is_critical: boolean;
}

export interface CriticalPathResult {
  project_duration: number;
  critical_path: number[];
  tasks: TaskSchedule[];
}

export function calculateCriticalPath(
  inputTasks: CriticalPathTask[]
): CriticalPathResult {
  const tasks = new Map<number, CriticalPathTask>();

  for (const task of inputTasks) {
    if (
      !Number.isInteger(task.id) ||
      !Number.isInteger(task.duration) ||
      task.duration < 1 ||
      tasks.has(task.id)
    ) {
      throw new Error("Invalid task data for critical path analysis.");
    }

    tasks.set(task.id, task);
  }

  // Every dependency must refer to a task in this project.
  for (const task of inputTasks) {
    for (const dependencyId of task.dependencies) {
      if (!tasks.has(dependencyId)) {
        throw new Error(
          `Task ${task.id} has an invalid dependency: ${dependencyId}.`
        );
      }

      if (dependencyId === task.id) {
        throw new Error("A task cannot depend on itself.");
      }
    }
  }

  // Sort tasks topologically: prerequisites must come first.
  const visiting = new Set<number>();
  const visited = new Set<number>();
  const order: number[] = [];

  function visit(taskId: number): void {
    if (visiting.has(taskId)) {
      throw new Error("Cannot analyse a project with circular dependencies.");
    }

    if (visited.has(taskId)) return;

    visiting.add(taskId);

    const task = tasks.get(taskId)!;

    for (const dependencyId of task.dependencies) {
      visit(dependencyId);
    }

    visiting.delete(taskId);
    visited.add(taskId);
    order.push(taskId);
  }

  for (const task of inputTasks) {
    visit(task.id);
  }

  // Forward pass: calculate earliest start and finish.
  const earliestStart = new Map<number, number>();
  const earliestFinish = new Map<number, number>();

  for (const taskId of order) {
    const task = tasks.get(taskId)!;

    const start = Math.max(
      0,
      ...task.dependencies.map(
        (dependencyId) => earliestFinish.get(dependencyId)!
      )
    );

    earliestStart.set(taskId, start);
    earliestFinish.set(taskId, start + task.duration);
  }

  const projectDuration = Math.max(0, ...earliestFinish.values());

  // Build reverse edges so each task knows which tasks depend on it.
  const dependents = new Map<number, number[]>();

  for (const task of inputTasks) {
    dependents.set(task.id, []);
  }

  for (const task of inputTasks) {
    for (const dependencyId of task.dependencies) {
      dependents.get(dependencyId)!.push(task.id);
    }
  }

  // Backward pass: calculate latest finish and latest start.
  const latestStart = new Map<number, number>();
  const latestFinish = new Map<number, number>();

  for (const taskId of [...order].reverse()) {
    const task = tasks.get(taskId)!;
    const nextTasks = dependents.get(taskId)!;

    const finish =
      nextTasks.length === 0
        ? projectDuration
        : Math.min(
            ...nextTasks.map(
              (nextId) => latestStart.get(nextId)!
            )
          );

    latestFinish.set(taskId, finish);
    latestStart.set(taskId, finish - task.duration);
  }

  // Zero slack means a task is on a critical path.
  const schedules: TaskSchedule[] = inputTasks.map((task) => {
    const es = earliestStart.get(task.id)!;
    const ef = earliestFinish.get(task.id)!;
    const ls = latestStart.get(task.id)!;
    const lf = latestFinish.get(task.id)!;
    const slack = ls - es;

    return {
      task_id: task.id,
      task_name: task.name,
      duration: task.duration,
      earliest_start: es,
      earliest_finish: ef,
      latest_start: ls,
      latest_finish: lf,
      slack,
      is_critical: slack === 0,
    };
  });

  // Return one critical path, from a starting task to a project-ending task.
  const criticalPath: number[] = [];
  let current = inputTasks.find(
    (task) =>
      earliestStart.get(task.id) === 0 &&
      latestStart.get(task.id) === 0
  );

  while (current) {
    criticalPath.push(current.id);

    const next = (dependents.get(current.id) ?? [])
      .map((id) => tasks.get(id)!)
      .find(
        (task) =>
          earliestStart.get(task.id) === earliestFinish.get(current!.id) &&
          latestStart.get(task.id) === earliestStart.get(task.id)
      );

    if (!next) break;
    current = next;
  }

  return {
    project_duration: projectDuration,
    critical_path: criticalPath,
    tasks: schedules,
  };
}
