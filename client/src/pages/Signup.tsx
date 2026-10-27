import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(name, email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="signup-title">
      <div className="auth-titlebar">DeadlineMesh.exe · Create account</div>
      <Link className="brand" to="/login"><span className="brand-mark" aria-hidden="true">D</span><span>DeadlineMesh</span></Link>
      <p className="eyebrow">Get started</p>
      <h1 id="signup-title">Create an account</h1>
      <p className="lead">Build a clearer plan for your project.</p>
      <form className="auth-form" onSubmit={submit}>
        <p className="form-hint">All fields are required. Use a password of 8–72 characters.</p>
        {error && <div className="message message-error" role="alert">{error}</div>}
        <label htmlFor="signup-name">Full name *</label>
        <input id="signup-name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="signup-email">Email address *</label>
        <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="signup-password">Password *</label>
        <input id="signup-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="password-help" value={password} onChange={(event) => setPassword(event.target.value)} />
        <span id="password-help" className="form-hint">At least 8 characters.</span>
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create account"}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </section>
  </main>;
}
