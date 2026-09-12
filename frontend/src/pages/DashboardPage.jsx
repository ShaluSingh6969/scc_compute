import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getToken } from "../auth";
import ShellLayout from "../components/ShellLayout";

const DEFAULT_FILTERS = {
  parameter_filter: "All Parameters",
  detection_method: "Z-Score Statistical Analysis",
  sensitivity_level: 3,
  altitude_threshold: 100,
  battery_critical: 18,
  vibration_limit: 5,
  data_structure_type: "",
  dataset_structure_type: "",
};

const DEFAULT_META = {
  data_name: "",
  ownership: "",
  description: "",
  rows: "",
  columns: "",
  dataset_status: "",
  quality_checks: {
    accuracy: false,
    consistency: false,
    traceability: false,
    completeness: false,
    timeliness: false,
    auditability: false,
  },
};

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function splitPackedSensorRows(rows) {
  if (!rows.length) return null;

  const first = rows[0] || {};
  const keys = Object.keys(first);
  if (keys.length !== 1) return null;

  const packedKey = keys[0];
  const sampleValue = toText(first[packedKey]);
  const delimiter =
    packedKey.includes(";") || sampleValue.includes(";") ? ";" : null;
  if (!delimiter) return null;

  const headerParts = packedKey
    .split(delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
  if (headerParts.length < 3) return null;

  const normalizedKeys = headerParts.slice(0, 3);
  const normalizedRows = rows.map((row) => {
    const packedValue = toText(row[packedKey]);
    const parts = packedValue.split(delimiter).map((part) => part.trim());
    return {
      [normalizedKeys[0]]: parts[0] || "",
      [normalizedKeys[1]]: parts[1] || "",
      [normalizedKeys[2]]: parts[2] || "",
    };
  });

  return { keys: normalizedKeys, rows: normalizedRows };
}

function extractPreview(profile) {
  const rows = Array.isArray(profile?.preview_rows) ? profile.preview_rows : [];
  if (!rows.length) {
    return { keys: [], rows: [] };
  }

  const splitPreview = splitPackedSensorRows(rows);
  if (splitPreview) {
    return {
      keys: splitPreview.keys,
      rows: splitPreview.rows.slice(0, 10),
    };
  }

  const limitedRows = rows.slice(0, 10);
  const keys = [];
  const keySet = new Set();
  for (const row of limitedRows) {
    for (const key of Object.keys(row || {})) {
      if (!keySet.has(key)) {
        keySet.add(key);
        keys.push(key);
      }
    }
  }

  return {
    keys,
    rows: limitedRows,
  };
}

function buildMetaFromProfile(profile) {
  return {
    rows: toText(profile?.row_count || 0),
    columns: toText(profile?.column_count || 0),
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const metadataSectionRef = useRef(null);
  const structureSectionRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [metadataFile, setMetadataFile] = useState(null);
  const [activeSourceFile, setActiveSourceFile] = useState("");
  const [profile, setProfile] = useState({});
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [summary, setSummary] = useState({
    total_readings: 0,
    loaded_files: [],
  });
  const [parameters, setParameters] = useState([]);
  const [result, setResult] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [savedMetaSnapshot, setSavedMetaSnapshot] = useState(DEFAULT_META);
  const [metaEnabled, setMetaEnabled] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [message, setMessage] = useState(
    "Choose a source file and prepare metadata before saving.",
  );
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef(null);
  const metadataFileInputRef = useRef(null);

  const preview = useMemo(
    () =>
      uploadedPreview
        ? extractPreview({ preview_rows: uploadedPreview })
        : extractPreview(profile),
    [profile, uploadedPreview],
  );
  const workflowSteps = useMemo(
    () => [
      { id: 1, label: "Dataset Upload", stepClass: "result-step-01" },
      { id: 2, label: "Metadata", stepClass: "result-step-02" },
      { id: 3, label: "Structure", stepClass: "result-step-03" },
      { id: 4, label: "Metrics", stepClass: "result-step-04" },
      { id: 5, label: "Dashboard", stepClass: "result-step-05" },
    ],
    [],
  );

  const hasUploadedData =
    Number(summary.total_readings || 0) > 0 ||
    Number(profile.row_count || 0) > 0 ||
    Number(profile.column_count || 0) > 0;

  const hasMetaDraft =
    Boolean(String(meta.data_name || "").trim()) ||
    Boolean(String(meta.ownership || "").trim()) ||
    Boolean(String(meta.description || "").trim());
  const hasRequiredMetadata =
    Boolean(activeSourceFile) &&
    Boolean(String(meta.data_name || "").trim()) &&
    Boolean(String(meta.ownership || "").trim()) &&
    Boolean(String(meta.description || "").trim()) &&
    Boolean(meta.dataset_status) &&
    Boolean(filters.data_structure_type) &&
    Boolean(filters.dataset_structure_type) &&
    Object.values(meta.quality_checks).some(Boolean);
  const canAnalyze = Boolean(activeSourceFile);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    setMessage("Choose a new source file to begin an import.");
  }, [navigate]);

  useEffect(() => {
    if (hasUploadedData) {
      setCurrentStep((prev) => (prev < 2 ? 2 : prev));
    }
  }, [hasUploadedData]);

  useEffect(() => {
    if (hasMetaDraft) {
      setCurrentStep((prev) => (prev < 3 ? 3 : prev));
    }
  }, [hasMetaDraft]);

  function smoothScrollTo(sectionRef) {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function updateMeta(name, value) {
    setMeta((prev) => ({ ...prev, [name]: value }));
  }

  function updateQualityCheck(name, value) {
    setMeta((prev) => ({
      ...prev,
      quality_checks: {
        ...prev.quality_checks,
        [name]: value,
      },
    }));
  }

  function toggleQualityCheck(name) {
    updateQualityCheck(name, !meta.quality_checks[name]);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openMetadataPicker() {
    metadataFileInputRef.current?.click();
  }

  async function loadMetadataFile(file) {
    setMetadataFile(file);
    if (!file) return;
    try {
      const metadata = JSON.parse(await file.text());
      setMeta((previous) => ({
        ...previous,
        ...metadata,
        quality_checks: {
          ...previous.quality_checks,
          ...(metadata.quality_checks || {}),
        },
      }));
      setMessage(`${file.name} metadata loaded. Review it before saving.`);
    } catch {
      setMessage("Metadata upload must be a valid JSON file.");
    }
  }

  async function refreshProfileSummary(sourceFile = activeSourceFile) {
    const sourceQuery = sourceFile
      ? `?source_file=${encodeURIComponent(sourceFile)}`
      : "";
    const [summaryRes, profileRes, parameterRes] = await Promise.all([
      apiFetch("/api/summary"),
      apiFetch("/api/profile"),
      apiFetch(`/api/parameters${sourceQuery}`),
    ]);

    if (
      summaryRes.status === 401 ||
      profileRes.status === 401 ||
      parameterRes.status === 401
    ) {
      navigate("/login");
      return;
    }

    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (profileRes.ok) setProfile(await profileRes.json());
    if (parameterRes.ok) {
      const data = await parameterRes.json();
      setParameters(Array.isArray(data.parameters) ? data.parameters : []);
    }
  }

  async function uploadFile(fileOverride = null) {
    const fileToUpload = fileOverride || selectedFile;
    if (!fileToUpload) {
      setMessage("Please select a source file before upload.");
      return;
    }

    setIsBusy(true);
    try {
      const data = new FormData();
      data.append("file", fileToUpload);
      if (
        filters.parameter_filter &&
        filters.parameter_filter !== "All Parameters"
      ) {
        data.append("parameter_filter", filters.parameter_filter);
      }

      const response = await apiFetch("/upload-csv", {
        method: "POST",
        body: data,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setMessage("Your session expired. Please log in again before uploading.");
          navigate("/login");
          return;
        }
        setMessage(payload.error || "Upload failed.");
        return;
      }

      setMessage(payload.message || "File uploaded.");
      const uploadedSourceFile = payload.source_file || fileToUpload.name;
      setActiveSourceFile(uploadedSourceFile);
      if (Array.isArray(payload.preview_rows)) {
        setUploadedPreview(payload.preview_rows);
      }
      setProfile({
        row_count: payload.row_count || 0,
        column_count: payload.column_count || 0,
        preview_rows: payload.preview_rows || [],
      });
      const parametersResponse = await apiFetch(
        `/api/parameters?source_file=${encodeURIComponent(uploadedSourceFile)}`,
      );
      if (parametersResponse.ok) {
        const parametersPayload = await parametersResponse.json();
        setParameters(
          Array.isArray(parametersPayload.parameters)
            ? parametersPayload.parameters
            : [],
        );
      }
      setMeta((prev) => ({
        ...prev,
        rows: toText(payload.row_count || 0),
        columns: toText(payload.column_count || 0),
      }));
      setMetaEnabled(true);
      setCurrentStep((prev) => (prev < 2 ? 2 : prev));
      smoothScrollTo(metadataSectionRef);
    } finally {
      setIsBusy(false);
    }
  }

  async function saveMeta() {
    setIsBusy(true);
    try {
      const response = await apiFetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { ...meta, source_file: activeSourceFile },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(
          payload.error || payload.detail || "Could not save meta data.",
        );
        return;
      }

      setSavedMetaSnapshot(meta);
      setMessage("Meta data saved.");
      setCurrentStep((prev) => (prev < 3 ? 3 : prev));
      smoothScrollTo(structureSectionRef);
    } finally {
      setIsBusy(false);
    }
  }

  function cancelMetaChanges() {
    setMeta(savedMetaSnapshot);
    setMessage("Meta changes reverted.");
  }

  async function runQualityScan() {
    if (!activeSourceFile) {
      setMessage("Upload a source file before running the compute task.");
      return;
    }
    setIsBusy(true);
    try {
      const response = await apiFetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parameter_filter: filters.parameter_filter,
          source_file: activeSourceFile,
          detection_method: filters.detection_method,
          sensitivity_level: Number(filters.sensitivity_level),
          altitude_threshold: Number(filters.altitude_threshold),
          battery_critical: Number(filters.battery_critical),
          vibration_limit: Number(filters.vibration_limit),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error || "Quality scan failed.");
        return;
      }

      setResult(payload);
      setCurrentStep((prev) => (prev < 4 ? 4 : prev));
      setMessage(
        `Quality scan complete. Anomalies: ${payload.total_anomalies || 0}, Safety: ${payload.safety_level || "N/A"}.`,
      );
      navigate("/quality-check", {
        state: {
          scanResult: payload,
          profile,
          meta,
          selectedChecks: meta.quality_checks || {},
        },
      });
    } finally {
      setIsBusy(false);
    }
  }

  const datasetStructureLabel = `Dataset structure for ${filters.data_structure_type}`;

  return (
    <ShellLayout
      title="CE Computer Server"
      subtitle="Upload, profile, and review dataset quality."
      active="data-import"
    >
      <section
        className="content-split-layout"
        aria-label="Body content split layout"
      >
        <div className="content-split-left">
          <div className="sketch-panel">
            <div className="sketch-section sketch-upload-trigger">
              <div className="upload-import-section">
                <button
                  type="button"
                  className="sketch-outline-button"
                  onClick={openFilePicker}
                >
                  upload / import
                </button>
                <input
                  type="file"
                  id="uploadImportFileInput"
                  ref={fileInputRef}
                  accept=".csv,.tsv,.xlsx,.xls,.json"
                  className="visually-hidden"
                  onChange={(event) =>
                    (() => {
                      const file = event.target.files?.[0] || null;
                      setSelectedFile(file);
                      setMessage(
                        file
                          ? `${file.name} selected. Uploading data...`
                          : "Choose a new source file to begin an import.",
                      );
                      setUploadedPreview(null);
                      setActiveSourceFile("");
                      if (file) uploadFile(file);
                    })()
                  }
                />
                <p className="upload-import-note" onClick={openFilePicker}>
                  {selectedFile ? selectedFile.name : "No file selected"}
                </p>
              </div>
            </div>

            <div className="sketch-section sketch-meta-toggle-line">
              <label className="sketch-check-label">
                <input
                  type="checkbox"
                  checked={metaEnabled}
                  onChange={(event) => {
                    setMetaEnabled(event.target.checked);
                    if (!event.target.checked) setMetadataFile(null);
                  }}
                />
                <span>Meta Data</span>
              </label>
              <input
                ref={metadataFileInputRef}
                type="file"
                accept=".json"
                className="visually-hidden"
                onChange={(event) => loadMetadataFile(event.target.files?.[0] || null)}
              />
            </div>

            <div className="sketch-section sketch-upload-action">
              <button
                type="button"
                className="sketch-outline-button"
                onClick={metaEnabled ? openMetadataPicker : undefined}
                disabled={isBusy || !metaEnabled}
              >
                Upload metadata
              </button>
              <p className="sketch-upload-help">
                {metadataFile
                  ? `${metadataFile.name} selected`
                  : "Optional JSON metadata upload"}
              </p>
            </div>

            <div
              className="sketch-section sketch-meta-block"
              ref={metadataSectionRef}
            >
              <div className="sketch-meta-title">Meta</div>

              <div className="sketch-meta-fields">
                <div className="sketch-field-box">
                  <div className="sketch-meta-field-row">
                    <div className="sketch-field-label-cell">Data Name</div>
                    <div className="sketch-field-input-cell">
                      <input
                        className="sketch-field-input"
                        type="text"
                        value={meta.data_name}
                        onChange={(e) =>
                          updateMeta("data_name", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="sketch-field-box">
                  <div className="sketch-meta-field-row">
                    <div className="sketch-field-label-cell">ownership</div>
                    <div className="sketch-field-input-cell">
                      <input
                        className="sketch-field-input"
                        type="text"
                        value={meta.ownership}
                        onChange={(e) =>
                          updateMeta("ownership", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="sketch-field-box">
                  <div className="sketch-meta-field-row">
                    <div className="sketch-field-label-cell">
                      Data description
                    </div>
                    <div className="sketch-field-input-cell">
                      <input
                        className="sketch-field-input"
                        type="text"
                        value={meta.description}
                        onChange={(e) =>
                          updateMeta("description", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="sketch-field-box">
                  <div className="sketch-meta-field-row">
                    <div className="sketch-field-label-cell">Rows</div>
                    <div className="sketch-field-input-cell">
                      <input
                        className="sketch-field-input"
                        type="text"
                        value={meta.rows}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="sketch-field-box">
                  <div className="sketch-meta-field-row">
                    <div className="sketch-field-label-cell">Colums</div>
                    <div className="sketch-field-input-cell">
                      <input
                        className="sketch-field-input"
                        type="text"
                        value={meta.columns}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="analysis-fields-card">
                <div className="sketch-field-box">
                  <div className="sketch-line-item sketch-status-line">
                    <span>Dataset status</span>
                    <label className="sketch-radio-line">
                      <input
                        type="radio"
                        name="dataset_status"
                        checked={meta.dataset_status === "processed"}
                        onChange={() =>
                          updateMeta("dataset_status", "processed")
                        }
                      />
                      Processed
                    </label>
                    <label className="sketch-radio-line">
                      <input
                        type="radio"
                        name="dataset_status"
                        checked={meta.dataset_status === "not_processed"}
                        onChange={() =>
                          updateMeta("dataset_status", "not_processed")
                        }
                      />
                      Not processed
                    </label>
                  </div>
                </div>

                <div className="sketch-field-box sketch-analysis-header-box">
                  <div className="sketch-analysis-header-row">
                    <div className="sketch-line-item sketch-accent-line">
                      Analysis Settings
                    </div>
                    <button
                      type="button"
                      className="sketch-outline-button sketch-filter-toggle"
                      onClick={() => setFiltersCollapsed((prev) => !prev)}
                    >
                      {filtersCollapsed ? "Filters" : "Hide Filters"}
                    </button>
                  </div>
                </div>

                <section
                  className={`sketch-filters-panel ${filtersCollapsed ? "collapsed" : ""}`}
                >
                  <div className="sketch-filters-grid">
                    <article className="sketch-filter-card">
                      <h4>Telemetry parameter:</h4>
                      <p>Select parameter for focused analysis</p>
                      <select
                        className="sketch-filter-select"
                        value={filters.parameter_filter}
                        onChange={(e) =>
                          updateFilter("parameter_filter", e.target.value)
                        }
                      >
                        <option>All Parameters</option>
                        {parameters.map((parameter) => (
                          <option key={parameter} value={parameter}>
                            {parameter}
                          </option>
                        ))}
                      </select>
                    </article>

                    <article className="sketch-filter-card">
                      <h4>detection_method:</h4>
                      <p>Choose anomaly detection algorithm</p>
                      <select
                        className="sketch-filter-select"
                        value={filters.detection_method}
                        onChange={(e) =>
                          updateFilter("detection_method", e.target.value)
                        }
                      >
                        <option>Z-Score Statistical Analysis</option>
                        <option>Threshold Event Detection</option>
                      </select>
                    </article>

                    <article className="sketch-filter-card">
                      <h4>sensitivity_level:</h4>
                      <p>
                        Detection sensitivity (1=very sensitive, 10=less
                        sensitive)
                      </p>
                      <div className="sketch-slider-row">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={filters.sensitivity_level}
                          onChange={(e) =>
                            updateFilter(
                              "sensitivity_level",
                              Number(e.target.value),
                            )
                          }
                        />
                        <output>{filters.sensitivity_level}</output>
                      </div>
                    </article>

                    <article className="sketch-filter-card">
                      <h4>altitude_threshold:</h4>
                      <p>Normal altitude range maximum (meters)</p>
                      <div className="sketch-slider-row">
                        <input
                          type="range"
                          min="10"
                          max="500"
                          value={filters.altitude_threshold}
                          onChange={(e) =>
                            updateFilter(
                              "altitude_threshold",
                              Number(e.target.value),
                            )
                          }
                        />
                        <output>{filters.altitude_threshold}</output>
                      </div>
                    </article>

                    <article className="sketch-filter-card">
                      <h4>battery_critical:</h4>
                      <p>Critical battery voltage threshold (volts)</p>
                      <div className="sketch-slider-row">
                        <input
                          type="range"
                          min="10"
                          max="30"
                          value={filters.battery_critical}
                          onChange={(e) =>
                            updateFilter(
                              "battery_critical",
                              Number(e.target.value),
                            )
                          }
                        />
                        <output>{filters.battery_critical}</output>
                      </div>
                    </article>

                    <article className="sketch-filter-card">
                      <h4>vibration_limit:</h4>
                      <p>Maximum normal vibration level (g-force)</p>
                      <div className="sketch-slider-row">
                        <input
                          type="range"
                          min="1"
                          max="15"
                          value={filters.vibration_limit}
                          onChange={(e) =>
                            updateFilter(
                              "vibration_limit",
                              Number(e.target.value),
                            )
                          }
                        />
                        <output>{filters.vibration_limit}</output>
                      </div>
                    </article>
                  </div>
                </section>

                <div
                  className="sketch-fields-grid sketch-analysis-grid"
                  ref={structureSectionRef}
                >
                  <div className="sketch-field-label-cell">
                    Data structure for
                  </div>
                  <div className="sketch-field-input-cell">
                    <select
                      className="sketch-select sketch-select-field"
                      value={filters.data_structure_type}
                      onChange={(e) =>
                        updateFilter("data_structure_type", e.target.value)
                      }
                    >
                      <option value="">Select data structure</option>
                      <option>Supervised</option>
                      <option>Semi-Supervised</option>
                      <option>Self-Supervised</option>
                      <option>Unsupervised</option>
                    </select>
                  </div>
                </div>

                <div className="sketch-fields-grid sketch-analysis-grid sketch-analysis-grid-wide-label">
                  <div className="sketch-field-label-cell">
                    {datasetStructureLabel}
                  </div>
                  <div className="sketch-field-input-cell">
                    <select
                      className="sketch-select sketch-select-field"
                      value={filters.dataset_structure_type}
                      onChange={(e) =>
                        updateFilter("dataset_structure_type", e.target.value)
                      }
                    >
                      <option value="">Select dataset type</option>
                      <option>Classification</option>
                      <option>Regression</option>
                    </select>
                  </div>
                </div>
              </div>

              <div
                className="sketch-excel-wrap"
                aria-label="Dataset preview grid"
              >
                {!preview.rows.length ? (
                  <p className="sketch-upload-help">
                    No preview yet. Select a new file and upload it for analysis.
                  </p>
                ) : (
                <table className="sketch-excel-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {preview.keys.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, rowIndex) => {
                      const columns = preview.keys;
                      return (
                        <tr key={rowIndex}>
                          <th>{rowIndex + 1}</th>
                          {columns.map((col) => (
                            <td key={`${rowIndex}-${col}`}>
                              {toText(row[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}
              </div>

              <div className="sketch-quality-section">
                <div className="sketch-line-item">Data Quality</div>

                <div className="sketch-quality-grid">
                  <button
                    type="button"
                    className={`quality-option quality-type-accuracy ${meta.quality_checks.accuracy ? "is-active" : "is-inactive"}`}
                    onClick={() => toggleQualityCheck("accuracy")}
                    aria-pressed={meta.quality_checks.accuracy}
                  >
                    <span
                      className="quality-icon quality-icon-accuracy"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="6.5"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"></path>
                      </svg>
                    </span>
                    <span>Accuracy</span>
                  </button>
                  <button
                    type="button"
                    className={`quality-option quality-type-consistency ${meta.quality_checks.consistency ? "is-active" : "is-inactive"}`}
                    onClick={() => toggleQualityCheck("consistency")}
                    aria-pressed={meta.quality_checks.consistency}
                  >
                    <span
                      className="quality-icon quality-icon-consistency"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M7 7h10M7 12h10M7 17h10"></path>
                        <circle cx="5" cy="7" r="1.4"></circle>
                        <circle cx="19" cy="12" r="1.4"></circle>
                        <circle cx="5" cy="17" r="1.4"></circle>
                      </svg>
                    </span>
                    <span>Consistency</span>
                  </button>
                  <button
                    type="button"
                    className={`quality-option quality-type-traceability ${meta.quality_checks.traceability ? "is-active" : "is-inactive"}`}
                    onClick={() => toggleQualityCheck("traceability")}
                    aria-pressed={meta.quality_checks.traceability}
                  >
                    <span
                      className="quality-icon quality-icon-traceability"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <circle cx="5" cy="6" r="2"></circle>
                        <circle cx="19" cy="6" r="2"></circle>
                        <circle cx="12" cy="18" r="2"></circle>
                        <path d="M7 6h10M6.5 7.5l4 8M17.5 7.5l-4 8"></path>
                      </svg>
                    </span>
                    <span>Traceability</span>
                  </button>
                  <button
                    type="button"
                    className={`quality-option quality-type-completeness ${meta.quality_checks.completeness ? "is-active" : "is-inactive"}`}
                    onClick={() => toggleQualityCheck("completeness")}
                    aria-pressed={meta.quality_checks.completeness}
                  >
                    <span
                      className="quality-icon quality-icon-completeness"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <rect x="4" y="5" width="16" height="14" rx="2"></rect>
                        <path d="M8 10l2 2 4-4M8 15h8"></path>
                      </svg>
                    </span>
                    <span>Completeness</span>
                  </button>
                  <button
                    type="button"
                    className={`quality-option quality-type-timeliness ${meta.quality_checks.timeliness ? "is-active" : "is-inactive"}`}
                    onClick={() => toggleQualityCheck("timeliness")}
                    aria-pressed={meta.quality_checks.timeliness}
                  >
                    <span
                      className="quality-icon quality-icon-timeliness"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8"></circle>
                        <path d="M12 8v5l3 2"></path>
                      </svg>
                    </span>
                    <span>Timeliness</span>
                  </button>
                  <button
                    type="button"
                    className={`quality-option quality-type-auditability ${meta.quality_checks.auditability ? "is-active" : "is-inactive"}`}
                    onClick={() => toggleQualityCheck("auditability")}
                    aria-pressed={meta.quality_checks.auditability}
                  >
                    <span
                      className="quality-icon quality-icon-auditability"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <rect x="6" y="4" width="12" height="16" rx="2"></rect>
                        <path d="M9 4.8h6M9 10h6M9 14h4"></path>
                      </svg>
                    </span>
                    <span>Auditability</span>
                  </button>
                </div>
              </div>

              <div className="sketch-actions-row">
                <button
                  type="button"
                  className="sketch-outline-button"
                  onClick={runQualityScan}
                  disabled={isBusy || !canAnalyze}
                >
                  {canAnalyze ? "Run Compute Task" : "Upload a file to analyze"}
                </button>
                <button
                  type="button"
                  className="sketch-outline-button"
                  onClick={saveMeta}
                  disabled={isBusy || !hasRequiredMetadata}
                  title={
                    hasRequiredMetadata
                      ? "Save dataset metadata"
                      : "Complete Data Name, Ownership, and Data Description first"
                  }
                >
                  Save
                </button>
                <button
                  type="button"
                  className="sketch-outline-button"
                  onClick={cancelMetaChanges}
                  disabled={isBusy}
                >
                  Cancel
                </button>
              </div>

              <p className="sketch-upload-help">{message}</p>
              {result && (
                <p className="sketch-upload-help">
                  Scan result: {result.total_anomalies || 0} anomalies, safety{" "}
                  {result.safety_level || "N/A"},{" "}
                  {summary.loaded_files?.length || 0} stream(s) loaded.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="content-split-right">
          <h3 className="right-row-title">Results</h3>
          <div className="results-steps" aria-label="Results step flow">
            {workflowSteps.map((step) => {
              const status =
                step.id < currentStep
                  ? "completed"
                  : step.id === currentStep
                    ? "active"
                    : "up-next";
              return (
                <div
                  key={step.id}
                  className={`result-step-row is-${status}`}
                  aria-current={status === "active" ? "step" : undefined}
                >
                  <div className={`result-step-item ${step.stepClass}`}>
                    <span>{String(step.id).padStart(2, "0")}</span>
                  </div>
                  <div className="result-step-copy">
                    <span className="result-step-label">{step.label}</span>
                    <span className="result-step-status">{status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </ShellLayout>
  );
}
