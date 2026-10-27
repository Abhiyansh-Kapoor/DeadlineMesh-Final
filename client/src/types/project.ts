
export interface Project {
  id: number;
  name: string;
  description: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_count?: number;
}

export interface ProjectInput {
  name: string;
  description: string;
  deadline: string | null;
}
