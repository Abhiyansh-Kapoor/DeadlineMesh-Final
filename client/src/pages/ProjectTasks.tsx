import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { addDays, dayNumber, formatDay, todayLocal } from "../lib/dates";
import { scheduleTasks, type ScheduledTask } from "../lib/schedule";
import Modal from "../components/Modal";
import type { Project } from "../types/project";
import type { CriticalPathAnalysis, Task, TaskInput, TaskStatus, WhatIfSimulationResult } from "../types/task";

type Section = "tasks" | "dependencies" | "timeline" | "analysis" | "simulation";
const sectionNames: Record<Section, string> = {
  tasks: "Tasks",
  dependencies: "Dependencies",
  timeline: "Timeline",
  analysis: "Critical path & risk",
  simulation: "What-if simulation",
};
const sections = Object.keys(sectionNames) as Section[];

function emptyTask(): TaskInput {
  return { name: "", description: "", duration: 1, start_date: todayLocal(), status: "Pending", priority: "Medium", dependencies: [] };
}

export default function ProjectTasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysis, setAnalysis] = useState<CriticalPathAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<Section>("tasks");
  const [editing, setEditing] = useState<Task | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [form, setForm] = useState<TaskInput>(emptyTask);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [timelineMode, setTimelineMode] = useState<"all" | "30 days">("all");
  const [timelinePage, setTimelinePage] = useState(0);
  const [simulationTaskId, setSimulationTaskId] = useState("");
  const [simulationDays, setSimulationDays] = useState("1");
  const [simulation, setSimulation] = useState<WhatIfSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectResponse, taskResponse, analysisResponse] = await Promise.all([
        apiRequest<{ projects: Project[] }>("/projects"),
        apiRequest<{ tasks: Task[] }>("/tasks/project/" + projectId),
        apiRequest<{ analysis: CriticalPathAnalysis }>("/projects/" + projectId + "/critical-path"),
      ]);
      const found = projectResponse.projects.find((item) => String(item.id) === projectId);
      if (!found) throw new Error("Project not found or you do not have access.");
      setProject(found);
      setTasks(taskResponse.tasks);
      setAnalysis(analysisResponse.analysis);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const scheduled = useMemo(() => {
    try { return scheduleTasks(tasks); } catch { return [] as ScheduledTask[]; }
  }, [tasks]);
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selected = selectedTaskId ? byId.get(selectedTaskId) : undefined;
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const blocked = tasks.filter((task) => task.is_blocked && task.status !== "Completed").length;
  const formHasIncompletePrerequisites = form.dependencies.some((id) =>
    tasks.some((task) => task.id === id && task.status !== "Completed")
  );
  const progress = tasks.length ? Math.round(completed * 100 / tasks.length) : 0;

  function openCreate() {
    setEditing(null);
    setForm(emptyTask());
    setFormError("");
    setTaskModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({ name: task.name, description: task.description, duration: task.duration, start_date: task.start_date.slice(0, 10), status: task.status, priority: task.priority, dependencies: task.dependencies });
    setFormError("");
    setTaskModalOpen(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setFormError("");
    try {
      await apiRequest(
        editing ? "/tasks/" + editing.id : "/tasks/project/" + projectId,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) }
      );
      setTaskModalOpen(false);
      setNotice(editing ? "Task updated." : "Task created.");
      setSimulation(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Task could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    try {
      await apiRequest("/tasks/" + task.id, { method: "PATCH", body: JSON.stringify({ status }) });
      setNotice(task.name + " is now " + status.toLowerCase() + ".");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status could not be changed.");
    }
  }

  async function removeTask(task: Task) {
    try {
      await apiRequest("/tasks/" + task.id, { method: "DELETE" });
      setNotice("Task deleted.");
      if (selectedTaskId === task.id) setSelectedTaskId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task could not be deleted.");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function runSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    setSimulating(true);
    setError("");
    try {
      const response = await apiRequest<{ simulation: WhatIfSimulationResult }>(
        "/projects/" + projectId + "/what-if/delay",
        { method: "POST", body: JSON.stringify({ task_id: Number(simulationTaskId), added_duration: Number(simulationDays) }) }
      );
      setSimulation(response.simulation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation could not be completed.");
    } finally {
      setSimulating(false);
    }
  }

  const firstDay = scheduled.length ? scheduled.reduce((day, item) => item.start < day ? item.start : day, scheduled[0].start) : todayLocal();
  const lastDay = scheduled.length ? scheduled.reduce((day, item) => item.endExclusive > day ? item.endExclusive : day, scheduled[0].endExclusive) : addDays(firstDay, 1);
  const fullDays = Math.max(1, dayNumber(lastDay) - dayNumber(firstDay));
  const maxPage = Math.max(0, Math.ceil(fullDays / 30) - 1);
  const viewStart = timelineMode === "all" ? firstDay : addDays(firstDay, timelinePage * 30);
  const viewEnd = timelineMode === "all" ? lastDay : addDays(viewStart, 30);
  const viewDays = Math.max(1, dayNumber(viewEnd) - dayNumber(viewStart));
  const dayWidth = Math.max(34, Math.min(52, 1050 / viewDays));
  const timelineWidth = Math.max(760, Math.ceil(190 + viewDays * dayWidth));
  const ticks = [0, 1, 2, 3, 4].map((index) => addDays(viewStart, Math.round((viewDays - 1) * index / 4)));

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <Link className="brand" to="/dashboard" aria-label="DeadlineMesh home"><span className="brand-mark" aria-hidden="true">▣</span><span>DeadlineMesh.exe</span></Link>
        <nav aria-label="Main navigation"><Link className="header-link" to="/dashboard">All projects</Link></nav>
      </header>
      <main id="main" className="container">
        <Link className="back-link" to="/dashboard">← Back to projects</Link>
        {loading && !project ? <p role="status">Loading project…</p> : project && <>
          <div className="page-intro">
            <div><p className="eyebrow">Project workspace</p><h1>{project.name}</h1><p className="lead">{project.description || "Plan and track this project's work."}</p><p className="deadline">Target deadline: <strong>{formatDay(project.deadline)}</strong></p></div>
            <button type="button" className="button button-primary" onClick={openCreate}>+ New task</button>
          </div>
          {error && <div className="message message-error" role="alert"><span>{error}</span><button type="button" className="message-close" aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
          {notice && <div className="message message-success" role="status"><span>{notice}</span><button type="button" className="message-close" aria-label="Dismiss notice" onClick={() => setNotice("")}>×</button></div>}
          <section className="stats" aria-label="Project summary">
            <div className="stat"><strong>{tasks.length}</strong><span>Tasks</span></div>
            <div className="stat"><strong>{progress}%</strong><span>Complete</span></div>
            <div className="stat"><strong>{blocked}</strong><span>Blocked</span></div>
            <div className="stat"><strong>{analysis?.project_duration ?? 0} days</strong><span>Minimum work duration</span></div>
          </section>
          <nav className="section-nav" aria-label="Project sections">
            {sections.map((item) => <button key={item} type="button" className={section === item ? "section-link active" : "section-link"} aria-pressed={section === item} onClick={() => setSection(item)}>{sectionNames[item]}</button>)}
          </nav>

          {section === "tasks" && <section className="panel" aria-labelledby="tasks-title">
            <div className="panel-header"><div><h2 id="tasks-title">Tasks</h2><p>Manage each task and update its progress.</p></div><button className="button button-quiet" type="button" onClick={() => void load()}>Refresh</button></div>
            {tasks.length === 0 ? <div className="empty-state"><h3>No tasks yet</h3><p>Add your first task to start planning.</p><button className="button button-primary" type="button" onClick={openCreate}>Create task</button></div> : <ul className="task-list">
              {tasks.map((task) => <li className="task-card" key={task.id}>
                <div className="task-card-main">
                  <div className="task-title-row"><h3>{task.name}</h3><span className={"badge badge-" + task.priority.toLowerCase()}>{task.priority} priority</span>{task.is_blocked && task.status !== "Completed" && <span className="badge badge-danger">Blocked</span>}</div>
                  <p>{task.description || "No description added."}</p>
                  <dl className="task-meta"><div><dt>Duration</dt><dd>{task.duration} {task.duration === 1 ? "day" : "days"}</dd></div><div><dt>Start date</dt><dd>{formatDay(task.start_date)}</dd></div></dl>
                  {task.dependencies.length > 0 && <p className="depends">Depends on: {task.dependencies.map((id) => byId.get(id)?.name ?? "Deleted task").join(", ")}</p>}
                </div>
                <div className="task-actions">
                  <label htmlFor={"status-" + task.id}>Status</label>
                  <select id={"status-" + task.id} value={task.status} onChange={(event) => void updateStatus(task, event.target.value as TaskStatus)}><option>Pending</option><option>In Progress</option><option disabled={Boolean(task.is_blocked && task.status !== "Completed")}>Completed</option></select>
                  {task.is_blocked && task.status !== "Completed" && <small className="status-hint">Complete prerequisites before completing this task.</small>}
                  <button type="button" className="button button-quiet" onClick={() => openEdit(task)}>Edit</button>
                  <button type="button" className="button button-danger-quiet" onClick={() => setDeleteTarget(task)}>Delete</button>
                </div>
              </li>)}
            </ul>}
          </section>}

          {section === "dependencies" && <section className="panel" aria-labelledby="dependencies-title">
            <div className="panel-header"><div><h2 id="dependencies-title">Task dependencies</h2></div></div>
            {tasks.length === 0 ? <p className="empty-state">Add tasks to build a dependency map.</p> : <>
              <div className="dependency-map" style={{ gridTemplateColumns: "repeat(" + (Math.max(...scheduled.map((item) => item.level)) + 1) + ", minmax(190px, 1fr))" }}>
                {Array.from({ length: Math.max(...scheduled.map((item) => item.level)) + 1 }, (_, level) => <div className="dependency-column" key={level}><h3>{level === 0 ? "Start" : "Step " + (level + 1)}</h3>{scheduled.filter((item) => item.level === level).map(({ task }) => <button type="button" className={selectedTaskId === task.id ? "dependency-node selected" : "dependency-node"} key={task.id} aria-pressed={selectedTaskId === task.id} onClick={() => setSelectedTaskId(task.id)}><strong>{task.name}</strong><span>{task.duration} {task.duration === 1 ? "day" : "days"} · {task.status}</span><small>{task.dependencies.length ? "After " + task.dependencies.map((id) => byId.get(id)?.name ?? "deleted task").join(", ") : "No prerequisites"}</small></button>)}</div>)}
              </div>
              {selected && <div className="detail-box"><h3>{selected.name}</h3><p>{selected.dependencies.length ? "Needs: " + selected.dependencies.map((id) => byId.get(id)?.name ?? "deleted task").join(", ") : "This task can start without a prerequisite."}</p><p>{selected.is_blocked ? "Blocked by: " + (selected.blocked_by ?? []).map((id) => byId.get(id)?.name ?? "deleted task").join(", ") : "No incomplete prerequisites."}</p><button type="button" className="button button-quiet" onClick={() => openEdit(selected)}>Edit dependencies</button></div>}
            </>}
          </section>}

          {section === "timeline" && <section className="panel" aria-labelledby="timeline-title">
            <div className="panel-header"><div><h2 id="timeline-title">Interactive timeline</h2><p>Bars show scheduled dates. A task starts after its prerequisites finish, or on its chosen start date if later.</p></div></div>
            {scheduled.length === 0 ? <p className="empty-state">Add tasks to see a timeline.</p> : <>
              <div className="timeline-controls"><label htmlFor="timeline-range">View</label><select id="timeline-range" value={timelineMode} onChange={(event) => { setTimelineMode(event.target.value as "all" | "30 days"); setTimelinePage(0); }}><option value="all">Entire project</option><option value="30 days">30 days at a time</option></select>{timelineMode === "30 days" && <><button type="button" className="button button-quiet" disabled={timelinePage === 0} onClick={() => setTimelinePage((page) => page - 1)}>Previous 30 days</button><button type="button" className="button button-quiet" disabled={timelinePage >= maxPage} onClick={() => setTimelinePage((page) => page + 1)}>Next 30 days</button></>}</div>
              <p className="timeline-dates">Showing {formatDay(viewStart)} to {formatDay(addDays(viewEnd, -1))}</p>
              <div className="timeline" role="group" aria-label="Task timeline">
                <div className="timeline-row timeline-axis" style={{ width: `max(100%, ${timelineWidth}px)`, minWidth: timelineWidth }}><span>Task</span><div className="timeline-track">{ticks.map((tick, index) => <span key={index} style={{ left: index * 25 + "%" }}>{formatDay(tick)}</span>)}</div></div>
                {scheduled.map((item) => {
                  const left = Math.max(0, dayNumber(item.start) - dayNumber(viewStart));
                  const right = Math.min(viewDays, dayNumber(item.endExclusive) - dayNumber(viewStart));
                  const visible = right > left;
                  return <div className="timeline-row" style={{ width: `max(100%, ${timelineWidth}px)`, minWidth: timelineWidth }} key={item.task.id}><span className="timeline-name">{item.task.name}</span><div className="timeline-track">{visible && <button type="button" className={selectedTaskId === item.task.id ? "timeline-bar selected" : "timeline-bar"} style={{ left: left * 100 / viewDays + "%", width: Math.max(1, (right - left) * 100 / viewDays) + "%" }} onClick={() => setSelectedTaskId(item.task.id)} aria-label={item.task.name + ": " + formatDay(item.start) + " to " + formatDay(item.end)} title={item.task.name + ": " + formatDay(item.start) + " to " + formatDay(item.end)} />}</div></div>;
                })}
              </div>
              {selected && <div className="detail-box"><h3>{selected.name}</h3><p>{scheduled.find((item) => item.task.id === selected.id)?.start && "Scheduled " + formatDay(scheduled.find((item) => item.task.id === selected.id)!.start) + " to " + formatDay(scheduled.find((item) => item.task.id === selected.id)!.end)}. {selected.duration} {selected.duration === 1 ? "day" : "days"}.</p><p>{selected.dependencies.length ? "After " + selected.dependencies.map((id) => byId.get(id)?.name ?? "deleted task").join(", ") : "No prerequisites."}</p></div>}
            </>}
          </section>}

          {section === "analysis" && <section className="panel" aria-labelledby="analysis-title">
            <div className="panel-header"><div><h2 id="analysis-title">Critical path and schedule risk</h2><p>Zero slack tasks can move the project's earliest finish if delayed.</p></div></div>
            {analysis && <><div className="analysis-summary"><div><strong>{analysis.project_duration} days</strong><span>Minimum work duration</span></div><div><strong>{analysis.tasks.filter((item) => item.is_critical).length}</strong><span>Critical tasks</span></div><div><strong>{blocked}</strong><span>Blocked tasks</span></div></div><p className="path-summary"><strong>One critical path:</strong> {analysis.critical_path.map((id) => byId.get(id)?.name ?? "Deleted task").join(" → ") || "No tasks yet"}</p><div className="table-scroll"><table><caption>Task schedule in days from project start</caption><thead><tr><th scope="col">Task</th><th scope="col">Duration</th><th scope="col">Earliest start</th><th scope="col">Earliest finish</th><th scope="col">Latest start</th><th scope="col">Latest finish</th><th scope="col">Slack</th><th scope="col">Risk</th></tr></thead><tbody>{analysis.tasks.map((item) => <tr key={item.task_id}><th scope="row">{item.task_name}</th><td>{item.duration}</td><td>{item.earliest_start}</td><td>{item.earliest_finish}</td><td>{item.latest_start}</td><td>{item.latest_finish}</td><td>{item.slack}</td><td>{item.is_critical ? "Critical" : item.slack <= 2 ? "Low slack" : "Has slack"}</td></tr>)}</tbody></table></div><p className="form-hint">These are relative work-day offsets based on dependencies and durations. The calendar timeline also respects each task's chosen start date.</p></>}
          </section>}

          {section === "simulation" && <section className="panel" aria-labelledby="simulation-title">
            <div className="panel-header"><div><h2 id="simulation-title">What-if delay simulation</h2><p>Explore a delay without changing any saved task.</p></div></div>
            <form className="simulation-form" onSubmit={runSimulation}><div><label htmlFor="simulation-task">Task to delay *</label><select id="simulation-task" required value={simulationTaskId} onChange={(event) => setSimulationTaskId(event.target.value)}><option value="">Choose a task</option>{tasks.map((task) => <option value={task.id} key={task.id}>{task.name}</option>)}</select></div><div><label htmlFor="simulation-days">Extra days *</label><input id="simulation-days" type="number" min={1} max={365} step={1} required value={simulationDays} onChange={(event) => setSimulationDays(event.target.value)} /></div><button className="button button-primary" type="submit" disabled={simulating || tasks.length === 0}>{simulating ? "Calculating…" : "Simulate delay"}</button></form>
            {simulation && <div className="simulation-result" role="status"><h3>Predicted impact</h3><p>Original duration: <strong>{simulation.original_project_duration} days</strong></p><p>Simulated duration: <strong>{simulation.simulated_project_duration} days</strong></p><p>Project delay: <strong>{simulation.project_delay} days</strong></p><p>New critical path: {simulation.simulated.critical_path.map((id) => byId.get(id)?.name ?? "Deleted task").join(" → ")}</p><p className="form-hint">This result is temporary. The task duration in the database has not changed.</p></div>}
          </section>}
        </>}
        {!loading && !project && <div className="message message-error" role="alert">{error || "Project not found."}</div>}
      </main>
      <footer className="site-footer">DeadlineMesh · Project scheduling</footer>
      {taskModalOpen && <Modal title={editing ? "Edit task" : "Create task"} onClose={() => setTaskModalOpen(false)}>
        <form className="modal-form" onSubmit={saveTask}>
          <div className="modal-body">
            <p className="form-hint">Fields marked * are required. A prerequisite must finish before this task can start.</p>
            {formError && <div className="message message-error" role="alert"><span>{formError}</span><button type="button" className="message-close" aria-label="Dismiss form error" onClick={() => setFormError("")}>×</button></div>}
            <label htmlFor="task-name">Task name *</label><input id="task-name" autoFocus required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <label htmlFor="task-description">Description</label><textarea id="task-description" rows={3} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div className="form-grid"><div><label htmlFor="task-duration">Duration in days *</label><input id="task-duration" type="number" required min={1} max={365} step={1} value={form.duration} onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })} /></div><div><label htmlFor="task-start">Earliest start date *</label><input id="task-start" type="date" required value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></div><div><label htmlFor="task-status">Status</label><select id="task-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}><option>Pending</option><option>In Progress</option><option disabled={formHasIncompletePrerequisites}>Completed</option></select>{formHasIncompletePrerequisites && <small className="status-hint">Complete prerequisites before completing this task.</small>}</div><div><label htmlFor="task-priority">Priority</label><select id="task-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskInput["priority"] })}><option>Low</option><option>Medium</option><option>High</option></select></div></div>
            <fieldset className="dependency-field"><legend>Prerequisites</legend><p className="form-hint">Select every task that must finish first.</p>{tasks.filter((task) => task.id !== editing?.id).length === 0 ? <p>No other tasks available yet.</p> : <div className="checkbox-list">{tasks.filter((task) => task.id !== editing?.id).map((task) => <label key={task.id}><input type="checkbox" checked={form.dependencies.includes(task.id)} onChange={(event) => setForm({ ...form, dependencies: event.target.checked ? [...form.dependencies, task.id] : form.dependencies.filter((id) => id !== task.id) })} />{task.name}</label>)}</div>}</fieldset>
          </div>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setTaskModalOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create task"}</button></div>
        </form>
      </Modal>}
      {deleteTarget && <Modal title="Delete task?" onClose={() => setDeleteTarget(null)}>
        <div className="modal-body"><div className="message message-error"><strong>{deleteTarget.name}</strong> will be permanently deleted.</div><p>Any dependency links involving this task will also be removed. This action cannot be undone.</p></div>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="button button-danger-quiet" onClick={() => void removeTask(deleteTarget)}>Delete task</button></div>
      </Modal>}
    </div>
  );
}
