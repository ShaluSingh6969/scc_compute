import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { apiFetch } from "../api";
import { getToken, parseJwtPayload } from "../auth";
import ShellLayout from "../components/ShellLayout";

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  LinearScale,
  Tooltip,
  Legend,
);

function formatRole(role) {
  if (!role) return "Unknown";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function DashboardHomePage() {
  const navigate = useNavigate();
  const payload = useMemo(() => parseJwtPayload(getToken() || "") || {}, []);
  const [summary, setSummary] = useState({
    total_readings: 0,
    loaded_files: [],
  });
  const [profile, setProfile] = useState({
    quality_score: 0,
    numeric_columns: 0,
    categorical_columns: 0,
    file_count: 0,
    duplicate_rows: 0,
    missing_cells: 0,
    empty_columns: 0,
  });

  const qualityDonutRef = useRef(null);
  const qualityDonutChart = useRef(null);
  const issueBarRef = useRef(null);
  const issueBarChart = useRef(null);

  useEffect(() => {
    async function loadDashboardMetrics() {
      const [summaryRes, profileRes] = await Promise.all([
        apiFetch("/api/summary"),
        apiFetch("/api/profile"),
      ]);

      if (summaryRes.status === 401 || profileRes.status === 401) {
        navigate("/login");
        return;
      }

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (profileRes.ok) setProfile(await profileRes.json());
    }

    loadDashboardMetrics();
  }, [navigate]);

  const activeStreams = summary.loaded_files?.length || 0;
  const qualityScore = Number(profile.quality_score || 0);
  const sensorCoverage = Number(profile.numeric_columns || 0);
  const videoStatus = activeStreams > 0 ? "Ready" : "Waiting";

  useEffect(() => {
    const donutCanvas = qualityDonutRef.current;
    const barCanvas = issueBarRef.current;
    if (!donutCanvas || !barCanvas) return;

    // Handle React strict-mode double mounts and hot reload safely.
    const existingDonut = Chart.getChart(donutCanvas);
    if (existingDonut) existingDonut.destroy();
    const existingBar = Chart.getChart(barCanvas);
    if (existingBar) existingBar.destroy();

    const numeric = Number(profile.numeric_columns || 0);
    const categorical = Number(profile.categorical_columns || 0);
    const hasCompositionData = numeric + categorical > 0;

    if (qualityDonutChart.current) {
      qualityDonutChart.current.destroy();
    }
    qualityDonutChart.current = new Chart(donutCanvas, {
      type: "doughnut",
      data: {
        labels: ["Numeric", "Categorical"],
        datasets: [
          {
            data: hasCompositionData ? [numeric, categorical] : [1, 0],
            backgroundColor: ["#3f8d63", "#8dc2a5"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              color: "#3f5e4e",
              font: { size: 11 },
            },
          },
        },
        cutout: "68%",
      },
    });

    const issues = [
      Number(profile.missing_cells || 0),
      Number(profile.duplicate_rows || 0),
      Number(profile.empty_columns || 0),
    ];

    if (issueBarChart.current) {
      issueBarChart.current.destroy();
    }
    issueBarChart.current = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: ["Missing", "Duplicate", "Empty"],
        datasets: [
          {
            data: issues,
            backgroundColor: ["#7bb5d8", "#4f8f4b", "#c7dde9"],
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 26,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: {
              color: "#577165",
              font: { size: 11 },
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#577165",
              font: { size: 11 },
            },
            grid: {
              color: "rgba(97, 130, 113, 0.15)",
            },
          },
        },
      },
    });

    return () => {
      if (qualityDonutChart.current) {
        qualityDonutChart.current.destroy();
        qualityDonutChart.current = null;
      }
      if (issueBarChart.current) {
        issueBarChart.current.destroy();
        issueBarChart.current = null;
      }
    };
  }, [profile]);

  return (
    <ShellLayout
      title="CE Computer Server"
      subtitle="Upload, profile, and review dataset quality."
      active="dashboard"
    >
      <section className="dashboard-home-shell">
        <div className="dashboard-top-layout">
          <article className="chart-card dashboard-user-card">
            <div className="chart-card-header">
              <h3>Dashboard</h3>
              <p>User information overview</p>
            </div>
            <div className="dashboard-user-grid">
              <div className="dashboard-user-item">
                <span>Username</span>
                <strong>{payload.sub || "Not available"}</strong>
              </div>
              <div className="dashboard-user-item">
                <span>Role</span>
                <strong>{formatRole(payload.role)}</strong>
              </div>
              <div className="dashboard-user-item">
                <span>Status</span>
                <strong>Active</strong>
              </div>
              <div className="dashboard-user-item">
                <span>How many users are active</span>
                <strong>0</strong>
              </div>
              <div className="dashboard-user-item">
                <span>How many users are active</span>
                <strong>0</strong>
              </div>
              <div className="dashboard-user-item">
                <span>Token Expiry</span>
                <strong>
                  {payload.exp
                    ? new Date(payload.exp * 1000).toLocaleString()
                    : "Not available"}
                </strong>
              </div>
            </div>
          </article>

          <aside className="dashboard-side-analytics">
            <article className="dashboard-side-card">
              <div className="dashboard-side-card-header">
                <h4>Sensors Composition</h4>
                <span>
                  {sensorCoverage + Number(profile.categorical_columns || 0)}{" "}
                  columns
                </span>
              </div>
              <div className="dashboard-chart-wrap">
                <canvas
                  ref={qualityDonutRef}
                  aria-label="Sensors composition chart"
                />
              </div>
            </article>

            <article className="dashboard-side-card">
              <div className="dashboard-side-card-header">
                <h4>Data Issues</h4>
                <span>Current quality indicators</span>
              </div>
              <div className="dashboard-chart-wrap dashboard-chart-wrap-bar">
                <canvas ref={issueBarRef} aria-label="Data issues chart" />
              </div>
            </article>
          </aside>
        </div>

        <div className="dashboard-kpi-grid">
          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Total Records</span>
            <strong className="dashboard-kpi-value">
              {Number(summary.total_readings || 0).toLocaleString()}
            </strong>
            <small className="dashboard-kpi-meta">
              Telemetry rows processed
            </small>
          </article>

          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Sensors Analysis</span>
            <strong className="dashboard-kpi-value">{sensorCoverage}</strong>
            <small className="dashboard-kpi-meta">
              Numeric sensors available
            </small>
          </article>

          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Video Analysis</span>
            <strong className="dashboard-kpi-value">{videoStatus}</strong>
            <small className="dashboard-kpi-meta">Pipeline state</small>
          </article>

          <article className="dashboard-kpi-card dashboard-kpi-card-emphasis">
            <span className="dashboard-kpi-title">Quality Score</span>
            <strong className="dashboard-kpi-value">{qualityScore}%</strong>
            <small className="dashboard-kpi-meta">
              Current dataset quality
            </small>
          </article>
        </div>

        <div className="dashboard-kpi-grid dashboard-kpi-grid-secondary">
          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Active Streams</span>
            <strong className="dashboard-kpi-value">{activeStreams}</strong>
            <small className="dashboard-kpi-meta">
              Files loaded for analysis
            </small>
          </article>

          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Data Sources</span>
            <strong className="dashboard-kpi-value">
              {profile.file_count || 0}
            </strong>
            <small className="dashboard-kpi-meta">
              Unique uploaded sources
            </small>
          </article>

          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Categorical Signals</span>
            <strong className="dashboard-kpi-value">
              {profile.categorical_columns || 0}
            </strong>
            <small className="dashboard-kpi-meta">Non-numeric columns</small>
          </article>

          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-title">Duplicate Rows</span>
            <strong className="dashboard-kpi-value">
              {profile.duplicate_rows || 0}
            </strong>
            <small className="dashboard-kpi-meta">
              Rows flagged as duplicates
            </small>
          </article>
        </div>
      </section>
    </ShellLayout>
  );
}
