import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getToken } from "../auth";
import ShellLayout from "../components/ShellLayout";

const CHECK_LABELS = {
  accuracy: "Accuracy",
  consistency: "Consistency",
  traceability: "Traceability",
  completeness: "Completeness",
  timeliness: "Timeliness",
  auditability: "Auditability",
};

const METRIC_LABELS = {
  completeness: "Completeness",
  validity: "Validity",
  consistency: "Consistency",
  stability: "Stability",
};

const CHECK_TO_METRIC = {
  completeness: "completeness",
  accuracy: "validity",
  consistency: "consistency",
  timeliness: "stability",
};

function clampScore(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromSafety(safetyLevel) {
  if (safetyLevel === "OK") return 92;
  if (safetyLevel === "WATCH") return 82;
  if (safetyLevel === "CAUTION") return 70;
  return 82;
}

function scoreFromAnomalies(totalAnomalies, totalReadings) {
  if (!totalReadings) return 85;
  const penalty = (totalAnomalies / totalReadings) * 100;
  return clampScore(100 - penalty * 1.5, 85);
}

function scoreFromDuplicates(duplicateRate) {
  if (!Number.isFinite(duplicateRate)) return 80;
  return clampScore(100 - duplicateRate * 2.5, 80);
}

function computeMetricScores(profile, scanResult) {
  return {
    completeness: clampScore(profile?.quality_score, 90),
    validity: scoreFromAnomalies(
      Number(scanResult?.total_anomalies || 0),
      Number(scanResult?.total_readings || profile?.row_count || 0),
    ),
    consistency: scoreFromDuplicates(Number(profile?.duplicate_rate || 0)),
    stability: scoreFromSafety(scanResult?.safety_level),
  };
}

export default function QualityCheckPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialScanResult = location.state?.scanResult || null;
  const initialProfile = location.state?.profile || {};
  const initialChecks =
    location.state?.selectedChecks ||
    location.state?.meta?.quality_checks ||
    {};

  const [scanResult] = useState(initialScanResult);
  const [profile, setProfile] = useState(initialProfile);
  const [selectedChecks, setSelectedChecks] = useState(initialChecks);
  const [activeMetric, setActiveMetric] = useState("completeness");

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    async function hydrateFallbackData() {
      try {
        const [profileRes, metaRes] = await Promise.all([
          apiFetch("/api/profile"),
          apiFetch("/api/meta"),
        ]);

        if (profileRes.status === 401 || metaRes.status === 401) {
          navigate("/login");
          return;
        }

        if (profileRes.ok && !Object.keys(initialProfile || {}).length) {
          const profilePayload = await profileRes.json();
          setProfile(profilePayload || {});
        }

        if (metaRes.ok && !Object.keys(initialChecks || {}).length) {
          const metaPayload = await metaRes.json();
          setSelectedChecks(metaPayload?.data?.quality_checks || {});
        }
      } catch {
        // Keep current state when fallback data cannot be fetched.
      }
    }

    hydrateFallbackData();
  }, [navigate, initialProfile, initialChecks]);

  const metricScores = useMemo(
    () => computeMetricScores(profile, scanResult),
    [profile, scanResult],
  );

  const activeMetrics = useMemo(() => {
    const orderedKeys = [
      "completeness",
      "validity",
      "consistency",
      "stability",
    ];
    const metricSet = new Set();

    Object.entries(selectedChecks || {}).forEach(([checkKey, enabled]) => {
      if (!enabled) return;
      const metricKey = CHECK_TO_METRIC[checkKey];
      if (metricKey) metricSet.add(metricKey);
    });

    if (!metricSet.size) {
      orderedKeys.forEach((key) => metricSet.add(key));
    }

    return orderedKeys
      .filter((key) => metricSet.has(key))
      .map((key) => ({
        key,
        label: METRIC_LABELS[key],
        score: metricScores[key],
      }));
  }, [selectedChecks, metricScores]);

  useEffect(() => {
    if (!activeMetrics.some((metric) => metric.key === activeMetric)) {
      setActiveMetric(activeMetrics[0]?.key || "completeness");
    }
  }, [activeMetric, activeMetrics]);

  const totalRecords = Number(
    profile?.row_count || scanResult?.total_readings || 0,
  );
  const missingRate = Number(profile?.missing_rate || 0);
  const missingRecords = Number(profile?.missing_cells || 0);

  const selectedCheckNames = Object.entries(selectedChecks || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => CHECK_LABELS[key])
    .filter(Boolean);

  const missingColumns = useMemo(() => {
    const rows = Number(profile?.row_count || 0);
    const topMissing = Array.isArray(profile?.top_missing_columns)
      ? profile.top_missing_columns
      : [];

    const fallback = [
      { column: "temperature", missing: 46 },
      { column: "no2_concentration", missing: 23 },
      { column: "wind_speed", missing: 90 },
      { column: "battery_level", missing: 12 },
      { column: "noise_level", missing: 31 },
    ];

    const source = topMissing.length ? topMissing : fallback;
    return source.slice(0, 5).map((item) => {
      const value = Number(item.missing || 0);
      const ratio = rows ? (value / rows) * 100 : value;
      return {
        name: String(item.column || "unknown"),
        value,
        ratio,
      };
    });
  }, [profile]);

  const maxMissingValue = Math.max(
    ...missingColumns.map((entry) => entry.value),
    1,
  );
  const activeMetricLabel =
    METRIC_LABELS[activeMetric] || METRIC_LABELS.completeness;

  return (
    <ShellLayout
      title="Interactive Metric Details"
      subtitle={`Step 6 of 6 - Drill-down analysis - ${activeMetrics.length} metrics active`}
      active="data-import"
    >
      <section className="qc-shell" aria-label="Quality check details page">
        <header className="qc-header-row">
          <div className="qc-heading-block">
            <h2>{activeMetricLabel} Analysis</h2>
            <p>
              Environmental Monitoring Dataset - {totalRecords.toLocaleString()}{" "}
              records
            </p>
          </div>
          <div className="qc-header-actions">
            <button type="button" className="qc-ghost-btn">
              Export Report
            </button>
            <button type="button" className="qc-ghost-btn">
              Download Results
            </button>
            <button
              type="button"
              className="qc-ghost-btn"
              onClick={() => navigate("/data-import")}
            >
              Re-run Analysis
            </button>
          </div>
        </header>

        {selectedCheckNames.length > 0 && (
          <div className="qc-active-checks">
            {selectedCheckNames.map((name) => (
              <span key={name} className="qc-check-chip">
                {name}
              </span>
            ))}
          </div>
        )}

        <div className="qc-grid">
          <aside className="qc-sidebar">
            <h3>Metric Navigation</h3>
            <ul className="qc-nav-list">
              {activeMetrics.map((metric) => (
                <li key={metric.key}>
                  <button
                    type="button"
                    className={`qc-nav-btn ${activeMetric === metric.key ? "active" : ""}`}
                    onClick={() => setActiveMetric(metric.key)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.score}</strong>
                  </button>
                </li>
              ))}
            </ul>

            <div className="qc-score-box">
              <h4>Scores</h4>
              {activeMetrics.map((metric) => (
                <div key={`${metric.key}-score`} className="qc-score-row">
                  <span>{metric.label}</span>
                  <strong>{metric.score}</strong>
                </div>
              ))}
            </div>
          </aside>

          <article className="qc-main-panel">
            <div className="qc-main-title-row">
              <h3>{activeMetricLabel} Analysis</h3>
              <span className="qc-status-pill">ACTIVE</span>
            </div>

            <div className="qc-kpi-grid">
              <div className="qc-kpi-card">
                <span>Missing Value Ratio</span>
                <strong>{missingRate.toFixed(1)}%</strong>
                <small>{missingRecords} records affected</small>
              </div>
              <div className="qc-kpi-card">
                <span>Missing Records</span>
                <strong>{missingRecords}</strong>
                <small>Across {missingColumns.length} columns</small>
              </div>
              <div className="qc-kpi-card">
                <span>{activeMetricLabel} Score</span>
                <strong>{metricScores[activeMetric]}/100</strong>
                <small>Safety: {scanResult?.safety_level || "N/A"}</small>
              </div>
            </div>

            <section className="qc-chart-card">
              <h4>Missing Values by Column</h4>
              <div
                className="qc-bar-chart"
                role="img"
                aria-label="Missing values by column"
              >
                {missingColumns.map((entry) => {
                  const heightPercent = (entry.value / maxMissingValue) * 100;
                  return (
                    <div key={entry.name} className="qc-bar-wrap">
                      <div
                        className="qc-bar"
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        title={`${entry.name}: ${entry.value}`}
                      ></div>
                      <span>{entry.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="qc-heatmap-card">
              <h4>Affected Columns - Missing Value Heatmap</h4>
              <div className="qc-heatmap-grid">
                {missingColumns.map((entry) => (
                  <div key={`${entry.name}-heat`} className="qc-heatmap-cell">
                    <div
                      className="qc-heat-fill"
                      style={{ width: `${Math.min(entry.ratio * 10, 100)}%` }}
                    ></div>
                    <span>{entry.name}</span>
                    <strong>{entry.ratio.toFixed(1)}%</strong>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </div>
      </section>
    </ShellLayout>
  );
}
