import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-titlebar">DeadlineMesh.exe · Sign in</div>
      <Link className="brand" to="/login"><span className="brand-mark" aria-hidden="true">D</span><span>DeadlineMesh</span></Link>
      <p className="eyebrow">Welcome back</p>
      <h1 id="login-title">Sign in</h1>
      <p className="lead">Keep every task and deadline in view.</p>
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="message message-error" role="alert"><span>{error}</span><button type="button" className="message-close" aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="auth-switch">New to DeadlineMesh? <Link to="/signup">Create an account</Link></p>
    </section>
  </main>;
}
