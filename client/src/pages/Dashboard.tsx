import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatDay } from "../lib/dates";
import Modal from "../components/Modal";
import type { Project } from "../types/project";

const blank = { name: "", description: "", deadline: "" };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{ projects: Project[] }>("/projects");
      setProjects(response.projects);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Projects could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({ name: project.name, description: project.description, deadline: project.deadline?.slice(0, 10) ?? "" });
    setFormError("");
    setModalOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const response = await apiRequest<{ project: Project }>(
        editing ? "/projects/" + editing.id : "/projects",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), deadline: form.deadline || null }),
        }
      );
      setModalOpen(false);
      setNotice(editing ? "Project updated." : "Project created.");
      if (editing) {
        setProjects((items) => items.map((item) => item.id === editing.id ? { ...item, ...response.project } : item));
      } else {
        setProjects((items) => [response.project, ...items]);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Project could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(project: Project) {
    if (!window.confirm('Delete "' + project.name + '" and all its tasks? This cannot be undone.')) return;
    try {
      await apiRequest("/projects/" + project.id, { method: "DELETE" });
      setProjects((items) => items.filter((item) => item.id !== project.id));
      setNotice("Project deleted.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project could not be deleted.");
    }
  }

  const shown = projects.filter((project) => (project.name + " " + project.description).toLowerCase().includes(query.toLowerCase()));
  const taskCount = projects.reduce((sum, project) => sum + Number(project.task_count ?? 0), 0);
  const doneCount = projects.reduce((sum, project) => sum + Number(project.completed_count ?? 0), 0);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <Link className="brand" to="/dashboard" aria-label="DeadlineMesh home"><span className="brand-mark" aria-hidden="true">▣</span><span>DeadlineMesh.exe</span></Link>
        <nav aria-label="Account"><span className="header-user">{user?.name}</span><button type="button" className="button button-quiet" onClick={logout}>Sign out</button></nav>
      </header>
      <main id="main" className="container">
        <div className="page-intro">
          <div><p className="eyebrow">Your workspace</p><h1>Projects</h1><p className="lead">Plan the work, connect the tasks, and see what affects your deadline.</p></div>
          <button type="button" className="button button-primary" onClick={openCreate}>+ New project</button>
        </div>
        {error && <div className="message message-error" role="alert">{error}</div>}
        {notice && <div className="message message-success" role="status">{notice}</div>}
        <section className="stats" aria-label="Workspace summary">
          <div className="stat"><strong>{projects.length}</strong><span>Projects</span></div>
          <div className="stat"><strong>{taskCount}</strong><span>Total tasks</span></div>
          <div className="stat"><strong>{doneCount}</strong><span>Completed tasks</span></div>
        </section>
        <section className="panel" aria-labelledby="project-list-title">
          <div className="panel-header">
            <div><h2 id="project-list-title">Your projects</h2><p>Choose a project to see its tasks and schedule.</p></div>
            <button type="button" className="button button-quiet" onClick={() => void load()} disabled={loading}>Refresh</button>
          </div>
          <label className="search-label" htmlFor="project-search">Search projects</label>
          <input id="project-search" type="search" placeholder="Search by name or description" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="empty-state" role="status">Loading projects…</p> : shown.length === 0 ? (
            <div className="empty-state"><h3>{query ? "No matching projects" : "No projects yet"}</h3><p>{query ? "Try a different search." : "Create a project to get started."}</p></div>
          ) : (
            <ul className="project-grid">
              {shown.map((project) => {
                const total = Number(project.task_count ?? 0);
                const completed = Number(project.completed_count ?? 0);
                const progress = total ? Math.round(completed * 100 / total) : 0;
                return <li className="project-card" key={project.id}>
                  <div className="project-card-top"><h3><Link to={"/projects/" + project.id}>{project.name}</Link></h3><span className="badge badge-blue">{progress}% complete</span></div>
                  <p>{project.description || "No description added."}</p>
                  <div className="progress" role="progressbar" aria-label={project.name + " completion"} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: progress + "%" }} /></div>
                  <dl className="project-meta"><div><dt>Deadline</dt><dd>{formatDay(project.deadline)}</dd></div><div><dt>Tasks</dt><dd>{completed} of {total} complete</dd></div></dl>
                  <div className="card-actions"><Link className="button button-primary" to={"/projects/" + project.id}>Open project</Link><button type="button" className="button button-quiet" onClick={() => openEdit(project)}>Edit</button><button type="button" className="button button-danger-quiet" onClick={() => void remove(project)}>Delete</button></div>
                </li>;
              })}
            </ul>
          )}
        </section>
      </main>
      <footer className="site-footer">DeadlineMesh · Project scheduling</footer>
      {modalOpen && <Modal title={editing ? "Edit project" : "Create project"} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="modal-form">
          <div className="modal-body">
            <p className="form-hint">Fields marked * are required.</p>
            {formError && <div className="message message-error" role="alert">{formError}</div>}
            <label htmlFor="project-name">Project name *</label>
            <input id="project-name" autoFocus required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <label htmlFor="project-description">Description</label>
            <textarea id="project-description" rows={3} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <label htmlFor="project-deadline">Target deadline</label>
            <input id="project-deadline" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          </div>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create project"}</button></div>
        </form>
      </Modal>}
    </div>
  );
}
