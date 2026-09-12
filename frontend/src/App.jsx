import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./auth";
import DashboardPage from "./pages/DashboardPage";
import DashboardHomePage from "./pages/DashboardHomePage";
import GroupsPage from "./pages/GroupsPage";
import LoginPage from "./pages/LoginPage";
import QualityCheckPage from "./pages/QualityCheckPage";
import RolesPage from "./pages/RolesPage";
import ReportsPage from "./pages/ReportsPage";
import SignupPage from "./pages/SignupPage";
import UsersPage from "./pages/UsersPage";

const THEME_KEY = "scc_theme";

function PrivateRoute({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      document.body.setAttribute("data-theme", savedTheme);
      return;
    }

    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = prefersDark ? "dark" : "light";
    document.body.setAttribute("data-theme", initialTheme);
    localStorage.setItem(THEME_KEY, initialTheme);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Navigate to="/dashboard" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardHomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/data-import"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/quality-check"
        element={
          <PrivateRoute>
            <QualityCheckPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <ReportsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <UsersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <PrivateRoute>
            <RolesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <PrivateRoute>
            <GroupsPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
