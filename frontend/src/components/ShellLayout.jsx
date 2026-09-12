import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearToken, getToken, parseJwtPayload } from "../auth";

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

function getAvatarText() {
  const payload = parseJwtPayload(getToken() || "");
  const role = (payload?.role || "admin").toLowerCase();
  if (role === "student") return "S";
  if (role === "user") return "U";
  if (role === "super_admin") return "SA";
  return "A";
}

export default function ShellLayout({ title, subtitle, active, children }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // ignore network errors and still clear local token
    }
    clearToken();
    navigate("/login");
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="sidebar-toggle" aria-label="Toggle sidebar">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <ul className="nav-items">
              <li>
                <NavLink
                  to="/dashboard"
                  className={`nav-item ${active === "dashboard" ? "active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M3 11.5L12 4l9 7.5"></path>
                      <path d="M6 10.5V20h12v-9.5"></path>
                    </svg>
                  </span>
                  <span className="nav-text">Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/data-import"
                  className={`nav-item ${active === "data-import" ? "active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.7-1.4A3.8 3.8 0 0 1 17 18H7"></path>
                      <path d="M12 8v8"></path>
                      <path d="M8.8 12.2L12 9l3.2 3.2"></path>
                    </svg>
                  </span>
                  <span className="nav-text">Data Import</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/reports"
                  className={`nav-item ${active === "reports" ? "active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 16.5h3.5l2-5 3 8 2.5-6h5"></path>
                      <path d="M3 6h18"></path>
                    </svg>
                  </span>
                  <span className="nav-text">Report</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/users"
                  className={`nav-item ${active === "users" ? "active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"></path>
                      <circle cx="9.5" cy="8" r="3"></circle>
                      <path d="M16.5 11.5a3 3 0 1 0 0-6"></path>
                      <path d="M19 19v-1a4 4 0 0 0-2.5-3.7"></path>
                    </svg>
                  </span>
                  <span className="nav-text">User Management</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/roles"
                  className={`nav-item ${active === "roles" ? "active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3l7 3v6c0 4.4-2.8 7.8-7 9-4.2-1.2-7-4.6-7-9V6l7-3z"></path>
                      <path d="M8.5 12.3l2.1 2.1 4.9-4.9"></path>
                    </svg>
                  </span>
                  <span className="nav-text">Role Management</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/groups"
                  className={`nav-item ${active === "groups" ? "active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="4" width="8" height="7" rx="1.2"></rect>
                      <rect x="13" y="4" width="8" height="7" rx="1.2"></rect>
                      <rect x="8" y="13" width="8" height="7" rx="1.2"></rect>
                    </svg>
                  </span>
                  <span className="nav-text">Group Management</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-brand">
            <img
              className="topbar-logo"
              src="/assests/tuc-white-logo.png"
              alt="Smart City Cloud"
            />
          </div>
          <div className="topbar-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="secondary-button theme-toggle-button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
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
                <span
                  className="auth-theme-toggle-knob"
                  aria-hidden="true"
                ></span>
              </span>
            </button>
            <div className="user-avatar">
              <span className="avatar-initial">{getAvatarText()}</span>
            </div>
            <button
              type="button"
              className="secondary-button topbar-icon-button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <svg
                className="topbar-action-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M14 4h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"></path>
                <path d="M10 12h10"></path>
                <path d="M17 8l4 4-4 4"></path>
              </svg>
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
