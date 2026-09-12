import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const THEME_KEY = "scc_theme";

function resolveInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password, role }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.detail || "Unable to submit signup request.");
      return;
    }

    setMessage("Signup request submitted. Waiting for super admin approval.");
    setTimeout(() => navigate("/login"), 1100);
  }

  return (
    <div className="login-page">
      <div className="login-background"></div>
      <button
        type="button"
        className="auth-theme-toggle"
        onClick={toggleTheme}
        aria-label={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        title={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
      >
        <span
          className={`auth-theme-toggle-track ${theme === "dark" ? "is-dark" : "is-light"}`}
        >
          <span
            className="auth-theme-icon auth-theme-icon-sun"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"></path>
            </svg>
          </span>
          <span
            className="auth-theme-icon auth-theme-icon-moon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.2 14.2A8.4 8.4 0 1 1 9.8 3.8a7.1 7.1 0 0 0 10.4 10.4z"></path>
            </svg>
          </span>
          <span className="auth-theme-toggle-knob" aria-hidden="true"></span>
        </span>
      </button>
      <div className="login-overlay">
        <div className="login-modal">
          <div className="login-left">
            <div className="login-left-content">
              <div className="login-left-text">
                <p className="login-left-label">URBAN MOBILITY DATA PLATFORM</p>
                <h1 className="login-left-title">CE COMPUTE SERVER</h1>
                <p className="login-left-description">
                  Create a user or student account and start managing telemetry
                  in one central workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="login-right">
            <section className="login-card">
              <div className="login-brand">
                <span className="login-eyebrow">CREATE ACCOUNT</span>
                <h2 className="login-title">Sign up</h2>
                <p className="login-subtitle">
                  Set up your account credentials and wait for super admin
                  approval.
                </p>
              </div>

              <form className="login-form signup-form" onSubmit={onSubmit}>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                      <path d="M4 7l8 6 8-6"></path>
                    </svg>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      type="text"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Account type</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="3"></circle>
                      <path d="M5 19a7 7 0 0 1 14 0"></path>
                    </svg>
                    <select
                      className="signup-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="student">Student</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect x="5" y="11" width="14" height="9" rx="2"></rect>
                      <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
                      <circle cx="12" cy="15" r="1.1"></circle>
                    </svg>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm password</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect x="5" y="11" width="14" height="9" rx="2"></rect>
                      <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
                      <path d="M10.5 15l1.2 1.2 2.1-2.1"></path>
                    </svg>
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type="password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-button">
                  Submit request
                </button>
                <div className="login-error" aria-live="polite">
                  {message}
                </div>
              </form>

              <div className="login-footer">
                <Link to="/login" className="login-link">
                  Back to sign in
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
