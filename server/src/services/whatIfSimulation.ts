
import {
  calculateCriticalPath,
  type CriticalPathTask,
  type CriticalPathResult,
} from "./criticalPath";

export interface WhatIfSimulationResult {
  original: CriticalPathResult;
  simulated: CriticalPathResult;
  task_id: number;
  added_duration: number;
  original_project_duration: number;
  simulated_project_duration: number;
  project_delay: number;
}

export function simulateTaskDelay(
  tasks: CriticalPathTask[],
  taskId: number,
  addedDuration: number
): WhatIfSimulationResult {
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new Error("A valid task ID is required.");
  }

  if (
    !Number.isInteger(addedDuration) ||
    addedDuration < 1 ||
    addedDuration > 365
  ) {
    throw new Error(
      "Added duration must be a whole number between 1 and 365 days."
    );
  }

  const targetTask = tasks.find((task) => task.id === taskId);

  if (!targetTask) {
    throw new Error("The selected task does not exist in this project.");
  }

  // Calculate the original schedule without modifying the input tasks.
  const original = calculateCriticalPath(tasks);

  // Create a separate task list for the simulation.
  const simulatedTasks = tasks.map((task) =>
    task.id === taskId
      ? { ...task, duration: task.duration + addedDuration }
      : { ...task }
  );

  const simulated = calculateCriticalPath(simulatedTasks);

  return {
    original,
    simulated,
    task_id: taskId,
    added_duration: addedDuration,
    original_project_duration: original.project_duration,
    simulated_project_duration: simulated.project_duration,
    project_delay:
      simulated.project_duration - original.project_duration,
  };
}
