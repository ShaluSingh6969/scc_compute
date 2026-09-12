import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getToken } from "../auth";
import ShellLayout from "../components/ShellLayout";

function formatDate(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString();
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("Loading saved reports...");

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    async function loadReports() {
      const response = await apiFetch("/api/reports");
      if (response.status === 401) {
        navigate("/login");
        return;
      }
      if (!response.ok) {
        setMessage("Could not load saved reports.");
        return;
      }
      const payload = await response.json();
      setDatasets(payload.datasets || []);
      setSelectedId(payload.datasets?.[0]?.id || null);
      setMessage(
        payload.datasets?.length
          ? "Select a dataset to review its saved analyses."
          : "No saved datasets yet. Save metadata from Data Import first.",
      );
    }

    loadReports();
  }, [navigate]);

  const selected = datasets.find((dataset) => dataset.id === selectedId);

  return (
    <ShellLayout
      title="Reports"
      subtitle="Review saved datasets and analysis history."
      active="reports"
    >
      <section className="dashboard-home-shell reports-page">
        <div className="reports-header">
          <div>
            <h2>Saved research reports</h2>
            <p>{message}</p>
          </div>
          <button
            type="button"
            className="sketch-outline-button"
            onClick={() => navigate("/data-import")}
          >
            Import new data
          </button>
        </div>

        {!datasets.length ? (
          <article className="chart-card reports-empty-state">
            <h3>No saved datasets</h3>
            <p>Upload a new file, complete its metadata, and save it from Data Import.</p>
          </article>
        ) : (
          <div className="reports-layout">
            <div className="reports-dataset-list">
              {datasets.map((dataset) => (
                <button
                  type="button"
                  key={dataset.id}
                  className={`reports-dataset-item ${selectedId === dataset.id ? "active" : ""}`}
                  onClick={() => setSelectedId(dataset.id)}
                >
                  <strong>{dataset.data_name}</strong>
                  <span>{dataset.filename}</span>
                  <small>{dataset.analysis_runs.length} saved analysis run(s)</small>
                </button>
              ))}
            </div>

            {selected && (
              <article className="chart-card reports-detail-card">
                <div className="chart-card-header">
                  <h3>{selected.data_name}</h3>
                  <p>{selected.filename}</p>
                </div>
                <div className="reports-metadata-grid">
                  <div><span>Ownership</span><strong>{selected.ownership}</strong></div>
                  <div><span>Rows</span><strong>{selected.row_count}</strong></div>
                  <div><span>Columns</span><strong>{selected.column_count}</strong></div>
                  <div><span>Saved</span><strong>{formatDate(selected.created_at)}</strong></div>
                </div>
                <p className="reports-description">{selected.description}</p>

                <h4>Analysis history</h4>
                {!selected.analysis_runs.length ? (
                  <p>No analysis has been saved for this dataset yet.</p>
                ) : (
                  <div className="reports-analysis-list">
                    {selected.analysis_runs.map((run) => (
                      <div className="reports-analysis-item" key={run.id}>
                        <div>
                          <strong>{run.parameter_filter}</strong>
                          <span>{formatDate(run.created_at)}</span>
                        </div>
                        <div>
                          <span>{run.result.total_readings} readings</span>
                          <span>{run.result.total_anomalies} anomalies</span>
                          <span>{run.result.safety_level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}
          </div>
        )}
      </section>
    </ShellLayout>
  );
}
