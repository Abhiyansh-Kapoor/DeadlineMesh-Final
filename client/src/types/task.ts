
export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  id: number;
  project_id: number;
  name: string;
  description: string;
  duration: number;
  start_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  dependencies: number[];
  is_blocked?: boolean;
  blocked_by?: number[];
}

export interface TaskInput {
  name: string;
  description: string;
  duration: number;
  start_date: string;
  status: TaskStatus;
  priority: TaskPriority;
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

export interface CriticalPathAnalysis {
  project_duration: number;
  critical_path: number[];
  tasks: TaskSchedule[];
}


export interface WhatIfSimulationResult {
  original: CriticalPathAnalysis;
  simulated: CriticalPathAnalysis;
  task_id: number;
  added_duration: number;
  original_project_duration: number;
  simulated_project_duration: number;
  project_delay: number;
}
