
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, CheckSquare, Clock } from "lucide-react";
import { apiRequest } from "../lib/api";
import type { Project } from "../types/project";
import type {
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
  CriticalPathAnalysis,
  WhatIfSimulationResult,
} from "../types/task";


export default function ProjectTasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [criticalPath, setCriticalPath] =
  useState<CriticalPathAnalysis | null>(null);
  const [loadingCriticalPath, setLoadingCriticalPath] = useState(false);
  const [criticalPathError, setCriticalPathError] = useState("");
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  const [simulationTaskId, setSimulationTaskId] = useState("");
  const [simulationDelay, setSimulationDelay] = useState("1");
  const [simulationResult, setSimulationResult] =
    useState<WhatIfSimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState("");
  const [loadingSimulation, setLoadingSimulation] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  const [form, setForm] = useState<TaskInput>({
    name: "",
    description: "",
    duration: 1,
    start_date: new Date().toISOString().slice(0, 10),
    status: "Pending",
    priority: "Medium",
    dependencies: [],
  });

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const [projectResponse, taskResponse] = await Promise.all([
        apiRequest<{ projects: Project[] }>("/projects"),
        apiRequest<{ tasks: Task[] }>(`/tasks/project/${projectId}`),
      ]);

      const foundProject = projectResponse.projects.find(
        (item) => String(item.id) === projectId
      );

      if (!foundProject) {
        setProject(null);
        setError("Project not found or you do not have access to it.");
        return;
      }

      setProject(foundProject);
      setTasks(taskResponse.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load project tasks.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  
async function loadCriticalPath() {
  if (!projectId || loadingCriticalPath) return;

  setLoadingCriticalPath(true);
  setCriticalPathError("");
  setShowCriticalPath(true);

  try {
    const response = await apiRequest<{ analysis: CriticalPathAnalysis }>(
      `/projects/${projectId}/critical-path`
    );

    setCriticalPath(response.analysis);
  } catch (err) {
    setCriticalPathError(
      err instanceof Error
        ? err.message
        : "Could not calculate the critical path."
    );
  } finally {
    setLoadingCriticalPath(false);
  }
}

  async function runWhatIfSimulation() {
    if (!projectId || loadingSimulation) return;

    const taskId = Number(simulationTaskId);
    const addedDuration = Number(simulationDelay);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      setSimulationError("Please select a task.");
      return;
    }

    if (
      !Number.isInteger(addedDuration) ||
      addedDuration < 1 ||
      addedDuration > 365
    ) {
      setSimulationError("Enter a delay between 1 and 365 days.");
      return;
    }

    setLoadingSimulation(true);
    setSimulationError("");
    setSimulationResult(null);

    try {
      const response = await apiRequest<{
        simulation: WhatIfSimulationResult;
      }>(`/projects/${projectId}/what-if/delay`, {
        method: "POST",
        body: JSON.stringify({
          task_id: taskId,
          added_duration: addedDuration,
        }),
      });

      setSimulationResult(response.simulation);
    } catch (err) {
      setSimulationError(
        err instanceof Error
          ? err.message
          : "Could not simulate the task delay."
      );
    } finally {
      setLoadingSimulation(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateForm() {
    setEditingTask(null);
    setForm({
      name: "",
      description: "",
      duration: 1,
      start_date: new Date().toISOString().slice(0, 10),
      status: "Pending",
      priority: "Medium",
      dependencies: [],
    });
    setShowForm(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setForm({
      name: task.name,
      description: task.description ?? "",
      duration: task.duration,
      start_date: task.start_date.slice(0, 10),
      status: task.status,
      priority: task.priority,
      dependencies: task.dependencies ?? [],
    });
    setShowForm(true);
  }

  async function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || saving) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        duration: Number(form.duration),
        start_date: form.start_date,
        status: form.status,
        priority: form.priority,
        dependencies: form.dependencies,
        };

      if (editingTask) {
        await apiRequest<{ task: Task }>(`/tasks/${editingTask.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<{ task: Task }>(`/tasks/project/${projectId}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingTask(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.name}" permanently?`)) return;

    setError("");

    try {
      await apiRequest(`/tasks/${task.id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    }
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    setError("");

    try {
      await apiRequest(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    }
  }

  const completed = tasks.filter((task) => task.status === "Completed").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  if (loading) {
    return <div className="loading-screen">Loading project tasks...</div>;
  }

  return (
    <main className="task-page">
      <header className="task-page-titlebar">
        <span>DEADLINEMESH.EXE — TASK MANAGER</span>
        <button className="task-window-close" onClick={() => navigate("/dashboard")}>
          ×
        </button>
      </header>

      <div className="task-page-content">
        <button className="task-back-button" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={16} /> Back to Projects
        </button>

        {error && <div className="task-error">{error}</div>}

        {project && (
          <>
            <section className="task-project-heading">
              <div>
                <p className="task-eyebrow">PROJECT #{project.id}</p>
                <h1>{project.name}</h1>
                <p>{project.description || "No project description."}</p>
              </div>

              
                <div className="task-heading-actions">
                <button
                    className="task-secondary-button"
                    onClick={() => void loadCriticalPath()}
                    disabled={loadingCriticalPath}
                >
                    {loadingCriticalPath ? "Analyzing..." : "Critical Path"}
                </button>
                <button
                    className="task-secondary-button"
                    onClick={() => {
                      setShowSimulation(true);
                      setSimulationError("");
                      setSimulationResult(null);
                      setSimulationTaskId("");
                      setSimulationDelay("1");
                    }}
                    type="button"
                >
                    What-if Delay
                </button>

                <button className="task-primary-button" onClick={openCreateForm}>
                    <Plus size={17} /> New Task
                </button>
                </div>

            </section>

            <section className="task-stats">
              <div className="task-stat">
                <CheckSquare size={20} />
                <div>
                  <strong>{tasks.length}</strong>
                  <span>Total tasks</span>
                </div>
              </div>
              <div className="task-stat">
                <Clock size={20} />
                <div>
                  <strong>{tasks.filter((task) => task.status === "In Progress").length}</strong>
                  <span>In progress</span>
                </div>
              </div>
              <div className="task-stat">
                <CheckSquare size={20} />
                <div>
                  <strong>{completed}</strong>
                  <span>Completed</span>
                </div>
              </div>
            </section>

            <section className="task-progress-panel">
              <div className="task-progress-label">
                <strong>PROJECT COMPLETION</strong>
                <span>{progress}%</span>
              </div>
              <div className="task-progress-track">
                <div className="task-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="task-list-panel">
              <div className="task-list-heading">
                <h2>PROJECT TASKS</h2>
                <button className="task-refresh-button" onClick={() => void loadData()}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="task-empty">
                  <CheckSquare size={34} />
                  <h3>No tasks yet</h3>
                  <p>Create your first task to start planning this project.</p>
                  <button className="task-primary-button" onClick={openCreateForm}>
                    <Plus size={16} /> Create First Task
                  </button>
                </div>
              ) : (
                <div className="task-list">
                  {tasks.map((task) => (
                    <article className="task-card" key={task.id}>
                      <div className="task-card-main">
                        <div className="task-card-title">
                        <h3>{task.name}</h3>
                        <span className={`task-priority priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                        </span>
                        {task.is_blocked && task.status !== "Completed" && (
                            <span className="task-blocked-badge">BLOCKED</span>
                        )}
                        </div>
                        <p>{task.description || "No description."}</p>

                            {task.dependencies && task.dependencies.length > 0 && (
                            <div className="task-dependency-display">
                                <strong>DEPENDS ON: </strong>
                                {task.dependencies.map((dependencyId, index) => {
                                const dependencyTask = tasks.find(
                                    (item) => item.id === dependencyId
                                );

                                return (
                                    <span key={dependencyId}>
                                    {index > 0 && ", "}
                                    {dependencyTask
                                        ? `#${dependencyTask.id} — ${dependencyTask.name}`
                                        : `Task #${dependencyId}`}
                                    </span>
                                );
                                })}
                            </div>
                            )}

                            <div className="task-metadata">
                          <span>#{task.id}</span>
                          <span>{task.duration} day{task.duration !== 1 ? "s" : ""}</span>
                          <span>Starts {task.start_date.slice(0, 10)}</span>
                        </div>
                      </div>

                      <div className="task-card-actions">
                        <select
                          aria-label={`Status for ${task.name}`}
                          value={task.status}
                          onChange={(event) =>
                            void updateStatus(task, event.target.value as TaskStatus)
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button onClick={() => openEditForm(task)}>Edit</button>
                        <button className="task-delete-button" onClick={() => void deleteTask(task)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            
{showCriticalPath && (
  <section className="task-critical-path-panel">
    <div className="task-list-heading">
      <h2>CRITICAL PATH ANALYSIS</h2>
      <button
        className="task-refresh-button"
        onClick={() => setShowCriticalPath(false)}
      >
        Close
      </button>
    </div>

    {loadingCriticalPath && <p>Calculating critical path...</p>}

    {criticalPathError && (
      <div className="task-error">{criticalPathError}</div>
    )}

    {criticalPath && !loadingCriticalPath && !criticalPathError && (
      <>
        <div className="task-critical-summary">
          <strong>PROJECT DURATION</strong>
          <span>{criticalPath.project_duration} days</span>
        </div>

        <div className="task-critical-sequence">
          <strong>CRITICAL PATH</strong>
          <p>
            {criticalPath.critical_path.length > 0
              ? criticalPath.critical_path
                  .map((id) => {
                    const task = tasks.find((item) => item.id === id);
                    return task ? `${task.name} (#${id})` : `Task #${id}`;
                  })
                  .join(" → ")
              : "No tasks in the critical path."}
          </p>
        </div>

        <div className="task-critical-table-wrapper">
          <table className="task-critical-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Duration</th>
                <th>ES</th>
                <th>EF</th>
                <th>LS</th>
                <th>LF</th>
                <th>Slack</th>
                <th>Critical</th>
              </tr>
            </thead>
            <tbody>
              {criticalPath.tasks.map((item) => (
                <tr
                  key={item.task_id}
                  className={item.is_critical ? "task-critical-row" : ""}
                >
                  <td>{item.task_name}</td>
                  <td>{item.duration}</td>
                  <td>{item.earliest_start}</td>
                  <td>{item.earliest_finish}</td>
                  <td>{item.latest_start}</td>
                  <td>{item.latest_finish}</td>
                  <td>{item.slack}</td>
                  <td>{item.is_critical ? "YES" : "NO"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="task-critical-legend">
          ES = Earliest Start · EF = Earliest Finish · LS = Latest Start ·
          LF = Latest Finish
        </p>
      </>
    )}
  </section>
)}

            {showSimulation && (
              <section className="task-critical-path-panel">
                <div className="task-list-heading">
                  <h2>WHAT-IF DELAY SIMULATION</h2>
                  <button
                    className="task-refresh-button"
                    type="button"
                    onClick={() => setShowSimulation(false)}
                  >
                    Close
                  </button>
                </div>

                <p>
                  Simulate a task delay to estimate its impact without changing
                  the saved project data.
                </p>

                <div className="task-form-grid">
                  <label>
                    Task to delay
                    <select
                      value={simulationTaskId}
                      onChange={(event) => {
                        setSimulationTaskId(event.target.value);
                        setSimulationResult(null);
                        setSimulationError("");
                      }}
                    >
                      <option value="">Select a task</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          #{task.id} — {task.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Additional delay (days)
                    <input
                      type="number"
                      min={1}
                      max={365}
                      step={1}
                      value={simulationDelay}
                      onChange={(event) => {
                        setSimulationDelay(event.target.value);
                        setSimulationResult(null);
                        setSimulationError("");
                      }}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 14 }}>
                  <button
                    className="task-primary-button"
                    type="button"
                    onClick={() => void runWhatIfSimulation()}
                    disabled={loadingSimulation || tasks.length === 0}
                  >
                    {loadingSimulation ? "Simulating..." : "Simulate Delay"}
                  </button>
                </div>

                {simulationError && (
                  <div className="task-error" style={{ marginTop: 12 }}>
                    {simulationError}
                  </div>
                )}

                {simulationResult && (
                  <>
                    <div className="task-critical-summary">
                      <div>
                        <strong>ORIGINAL DURATION</strong>
                        <p>{simulationResult.original_project_duration} days</p>
                      </div>
                      <div>
                        <strong>SIMULATED DURATION</strong>
                        <p>{simulationResult.simulated_project_duration} days</p>
                      </div>
                      <div>
                        <strong>PROJECT DELAY</strong>
                        <p>
                          {simulationResult.project_delay > 0
                            ? `+${simulationResult.project_delay}`
                            : simulationResult.project_delay}{" "}
                          days
                        </p>
                      </div>
                    </div>

                    <div className="task-critical-sequence">
                      <strong>ORIGINAL CRITICAL PATH</strong>
                      <p>
                        {simulationResult.original.critical_path
                          .map((id) => {
                            const item = tasks.find((task) => task.id === id);
                            return item ? `${item.name} (#${id})` : `Task #${id}`;
                          })
                          .join(" → ") || "No critical path."}
                      </p>
                    </div>

                    <div className="task-critical-sequence">
                      <strong>SIMULATED CRITICAL PATH</strong>
                      <p>
                        {simulationResult.simulated.critical_path
                          .map((id) => {
                            const item = tasks.find((task) => task.id === id);
                            return item ? `${item.name} (#${id})` : `Task #${id}`;
                          })
                          .join(" → ") || "No critical path."}
                      </p>
                    </div>

                    <p className="task-critical-legend">
                      Task #{simulationResult.task_id} was assigned an
                      additional {simulationResult.added_duration} day(s).
                      This is a simulation only; saved task data is unchanged.
                    </p>
                  </>
                )}
              </section>
            )}

          </>
        )}
      </div>

      {showForm && (
        <div className="task-modal-overlay">
          <form className="task-modal" onSubmit={saveTask}>
            <header className="task-modal-titlebar">
              {editingTask ? "EDIT TASK" : "CREATE NEW TASK"}
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </header>

            <div className="task-modal-fields">
              <label>
                Task name *
                <input
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Build authentication system"
                />
              </label>

              <label>
                Description
                <textarea
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="What needs to be done?"
                  rows={3}
                />
              </label>

              <div className="task-form-grid">
                <label>
                  Duration (days) *
                  <input
                    type="number"
                    required
                    min={1}
                    max={365}
                    value={form.duration}
                    onChange={(event) =>
                      setForm({ ...form, duration: Number(event.target.value) })
                    }
                  />
                </label>

                <label>
                  Start date *
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(event) =>
                      setForm({ ...form, start_date: event.target.value })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as TaskStatus })
                    }
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value as TaskPriority })
                    }
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>
              <label className="task-dependencies-field">
                Depends on
                <select
                    multiple
                    value={form.dependencies.map(String)}
                    onChange={(event) => {
                    const selectedIds = Array.from(
                        event.target.selectedOptions,
                        (option) => Number(option.value)
                    );

                    setForm({ ...form, dependencies: selectedIds });
                    }}
                >
                    {tasks
                    .filter((task) => task.id !== editingTask?.id)
                    .map((task) => (
                        <option key={task.id} value={task.id}>
                        #{task.id} — {task.name}
                        </option>
                    ))}
                </select>
                <small>
                    Select every task that must be completed before this task can begin.
                    Use Ctrl (Windows) or Cmd (Mac) to select multiple tasks.
                </small>
                </label>
            </div>

            <footer className="task-modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="task-primary-button" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
