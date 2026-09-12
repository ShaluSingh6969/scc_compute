const streamCount = document.getElementById("streamCount");
const detectionMethod = document.getElementById("detectionMethod");
const sensitivityLevel = document.getElementById("sensitivityLevel");
const altitudeThreshold = document.getElementById("altitudeThreshold");
const batteryCritical = document.getElementById("batteryCritical");
const vibrationLimit = document.getElementById("vibrationLimit");
const sensitivityValue = document.getElementById("sensitivityValue");
const altitudeValue = document.getElementById("altitudeValue");
const batteryValue = document.getElementById("batteryValue");
const vibrationValue = document.getElementById("vibrationValue");
const filterSummary = document.getElementById("filterSummary");
const resultDetails = document.getElementById("resultDetails");
const computeTask = document.getElementById("computeTask");
const uploadCsvBtn = document.getElementById("uploadCsv");
const saveResultsBtn = document.getElementById("saveResults");
const csvUpload = document.getElementById("csvUpload");
const logoutButton = document.getElementById("logoutButton");
const userAvatar = document.getElementById("userAvatar");
const avatarInitial = userAvatar?.querySelector(".avatar-initial");
const metadataNameLabel = document.getElementById("metadataNameLabel");
const metadataNameValue = document.getElementById("metadataNameValue");
const metadataStatusValue = document.getElementById("metadataStatusValue");
const metadataOwnershipLabel = document.getElementById(
  "metadataOwnershipLabel",
);
const metadataOwnershipValue = document.getElementById(
  "metadataOwnershipValue",
);
const taskCheckboxes = document.querySelectorAll(".task-checkbox");
const openFilterModalBtn = document.getElementById("openFilterModal");
const closeFilterModalBtn = document.getElementById("closeFilterModal");
const cancelFilterModalBtn = document.getElementById("cancelFilterModal");
const saveFilterSettingsBtn = document.getElementById("saveFilterSettings");
const filterModal = document.getElementById("filterModal");
const metaDataToggle = document.getElementById("metaDataToggle");
const metaSection = document.getElementById("metaSection");
const dataDescription = document.getElementById("dataDescription");
const metaSaveButton = document.getElementById("metaSaveButton");
const uploadFileInfo = document.getElementById("uploadFileInfo");
const profileRows = document.getElementById("profileRows");
const profileColumns = document.getElementById("profileColumns");
const profileFiles = document.getElementById("profileFiles");
const profileMissing = document.getElementById("profileMissing");
const profileDuplicates = document.getElementById("profileDuplicates");
const profileQualityScore = document.getElementById("profileQualityScore");
const profileQualityLabel = document.getElementById("profileQualityLabel");
const profileFlags = document.getElementById("profileFlags");
const qualityMissing = document.getElementById("qualityMissing");
const qualityEmptyColumns = document.getElementById("qualityEmptyColumns");
const qualityNumericColumns = document.getElementById("qualityNumericColumns");
const qualityCategoricalColumns = document.getElementById(
  "qualityCategoricalColumns",
);
const qualitySnapshotFlags = document.getElementById("qualitySnapshotFlags");
const previewTableHead = document.getElementById("previewTableHead");
const previewTableBody = document.getElementById("previewTableBody");
const toggleAdvancedPanels = document.getElementById("toggleAdvancedPanels");
const uploadImportTrigger = document.getElementById("uploadImportTrigger");
const uploadImportFileInput = document.getElementById("uploadImportFileInput");
const uploadImportFileName = document.getElementById("uploadImportFileName");
const sketchUploadButton = document.getElementById("sketchUploadButton");
const sketchFiltersToggle = document.getElementById("sketchFiltersToggle");
const sketchFiltersPanel = document.getElementById("sketchFiltersPanel");
const sketchSensitivity = document.getElementById("sketchSensitivity");
const sketchSensitivityValue = document.getElementById(
  "sketchSensitivityValue",
);
const sketchAltitudeThreshold = document.getElementById(
  "sketchAltitudeThreshold",
);
const sketchAltitudeValue = document.getElementById("sketchAltitudeValue");
const sketchBatteryCritical = document.getElementById("sketchBatteryCritical");
const sketchBatteryValue = document.getElementById("sketchBatteryValue");
const sketchVibrationLimit = document.getElementById("sketchVibrationLimit");
const sketchVibrationValue = document.getElementById("sketchVibrationValue");
const sketchDataStructureType = document.getElementById(
  "sketchDataStructureType",
);
const sketchDatasetStructureLabel = document.getElementById(
  "sketchDatasetStructureLabel",
);

function getToken() {
  return localStorage.getItem("tucdrive_token");
}

function setToken(token) {
  localStorage.setItem("tucdrive_token", token);
}

function clearToken() {
  localStorage.removeItem("tucdrive_token");
}

function parseJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function getRoleLabel(role) {
  const normalizedRole = (role || "admin").toLowerCase();
  if (normalizedRole === "student") return "Student";
  if (normalizedRole === "user") return "User";
  return "Admin";
}

function getOwnershipLabel(role) {
  const normalizedRole = (role || "admin").toLowerCase();
  if (normalizedRole === "student") return "Student";
  if (normalizedRole === "user") return "User";
  return "Owner";
}

function getAvatarText(role) {
  const normalizedRole = (role || "admin").toLowerCase();
  if (normalizedRole === "student") return "S";
  if (normalizedRole === "user") return "U";
  if (normalizedRole === "super_admin") return "SA";
  return "A";
}

function updateMetadataFromToken() {
  const payload = parseJwtPayload(getToken() || "");
  const role = payload?.role || "admin";
  const displayRole = getRoleLabel(role);
  const ownership = getOwnershipLabel(role);
  const isActive = Boolean(payload);

  if (
    metadataNameLabel &&
    metadataNameValue &&
    metadataStatusValue &&
    metadataOwnershipLabel &&
    metadataOwnershipValue
  ) {
    metadataNameLabel.textContent = `Name of ${displayRole}`;
    metadataNameValue.textContent = displayRole;
    metadataStatusValue.textContent = isActive ? "Active" : "Inactive";
    metadataStatusValue.className = isActive
      ? "status-active"
      : "status-inactive";
    metadataOwnershipLabel.textContent = "User Role / Ownership";
    metadataOwnershipValue.textContent = ownership;
  }

  if (avatarInitial) {
    avatarInitial.textContent = getAvatarText(role);
  }
}

function authHeaders(additional = {}) {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...additional }
    : additional;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

async function handleUnauthorized(response) {
  if (response.status === 401 || response.status === 403) {
    clearToken();
    window.location.href = "/login";
    return true;
  }
  return false;
}

let latestResult = null;
let anomalyChart = null;
let performanceChart = null;
let timelineChart = null;
let latestProfile = null;

function getSavedMetaState() {
  try {
    return JSON.parse(localStorage.getItem("tucdrive_meta_state") || "null");
  } catch {
    return null;
  }
}

function saveMetaState(state) {
  localStorage.setItem("tucdrive_meta_state", JSON.stringify(state));
}

function updateMetaSectionVisibility() {
  if (!metaSection || !metaDataToggle) return;
  metaSection.classList.toggle("collapsed", !metaDataToggle.checked);
}

function buildMetaDescription(profile = {}) {
  const rowCount = Number(profile.row_count || 0);
  const columnCount = Number(profile.column_count || 0);
  const fileCount = Number(profile.file_count || 0);
  return `Uploaded dataset profile: ${rowCount.toLocaleString()} rows, ${columnCount.toLocaleString()} columns, ${fileCount.toLocaleString()} file${fileCount === 1 ? "" : "s"} loaded.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMetricValue(value) {
  return Number(value || 0).toLocaleString();
}

function getQualityLabel(score) {
  if (score >= 85) return "Healthy";
  if (score >= 60) return "Watch";
  return "Needs review";
}

function updateSliderValue(slider, output) {
  output.textContent = slider.value;
}

function updateComputeButtonState() {
  if (!computeTask) return;

  const allTasksComplete = Array.from(taskCheckboxes).every(
    (checkbox) => checkbox.checked,
  );

  computeTask.disabled = !allTasksComplete;
}

sensitivityLevel.addEventListener("input", () =>
  updateSliderValue(sensitivityLevel, sensitivityValue),
);
altitudeThreshold.addEventListener("input", () =>
  updateSliderValue(altitudeThreshold, altitudeValue),
);
batteryCritical.addEventListener("input", () =>
  updateSliderValue(batteryCritical, batteryValue),
);
vibrationLimit.addEventListener("input", () =>
  updateSliderValue(vibrationLimit, vibrationValue),
);

async function loadStreams() {
  if (!requireAuth()) return;

  const [summaryRes, profileRes] = await Promise.all([
    fetch("/api/summary", { headers: authHeaders() }),
    fetch("/api/profile", { headers: authHeaders() }),
  ]);
  if (
    (await handleUnauthorized(summaryRes)) ||
    (await handleUnauthorized(profileRes))
  )
    return;

  const summary = await summaryRes.json();
  const profile = await profileRes.json();

  streamCount.textContent = `${summary.loaded_files?.length || 0} streams have been loaded`;
  renderProfile(profile);
  showMessage(
    summary.loaded_files?.length
      ? `Loaded ${summary.loaded_files.length} files from the database.`
      : "No uploaded telemetry files yet.",
  );
}

function showMessage(message) {
  resultDetails.innerHTML = `<div class="detail-empty"><h3>Waiting for data</h3><p>${message}</p></div>`;
}

function renderProfile(profile = {}) {
  latestProfile = profile;
  if (profileRows)
    profileRows.textContent = formatMetricValue(profile.row_count);
  if (profileColumns)
    profileColumns.textContent = formatMetricValue(profile.column_count);
  if (profileFiles)
    profileFiles.textContent = formatMetricValue(profile.file_count);
  if (profileMissing)
    profileMissing.textContent = formatMetricValue(profile.missing_cells);
  if (profileDuplicates)
    profileDuplicates.textContent = formatMetricValue(profile.duplicate_rows);

  const qualityScore = Number(profile.quality_score || 0);
  if (profileQualityScore) profileQualityScore.textContent = `${qualityScore}%`;
  if (profileQualityLabel)
    profileQualityLabel.textContent = getQualityLabel(qualityScore);

  const profileIssues = [...(profile.quality_flags || [])];
  (profile.top_missing_columns || []).forEach((item) => {
    if (item?.column) {
      profileIssues.push(`${item.column}: ${item.missing} missing values`);
    }
  });

  if (profileFlags) {
    profileFlags.innerHTML = profileIssues.length
      ? profileIssues
          .map(
            (item) =>
              `<li class="quality-flag-item"><span>${escapeHtml(item)}</span></li>`,
          )
          .join("")
      : '<li class="quality-flag-item muted">No major quality issues detected.</li>';
  }

  if (qualityMissing)
    qualityMissing.textContent = formatMetricValue(profile.missing_cells);
  if (qualityEmptyColumns)
    qualityEmptyColumns.textContent = formatMetricValue(profile.empty_columns);
  if (qualityNumericColumns)
    qualityNumericColumns.textContent = formatMetricValue(
      profile.numeric_columns,
    );
  if (qualityCategoricalColumns)
    qualityCategoricalColumns.textContent = formatMetricValue(
      profile.categorical_columns,
    );

  if (qualitySnapshotFlags) {
    qualitySnapshotFlags.innerHTML = profileIssues.length
      ? profileIssues
          .slice(0, 4)
          .map(
            (item) =>
              `<li class="quality-flag-item"><span>${escapeHtml(item)}</span></li>`,
          )
          .join("")
      : '<li class="quality-flag-item muted">Upload a file to inspect quality.</li>';
  }

  if (dataDescription && !dataDescription.value.trim()) {
    const savedMeta = getSavedMetaState();
    dataDescription.value =
      savedMeta?.description || buildMetaDescription(profile);
  }

  renderPreviewTable(profile.preview_rows || []);
}

function renderPreviewTable(rows = []) {
  if (!previewTableHead || !previewTableBody) return;

  if (!rows.length) {
    previewTableHead.innerHTML = "";
    previewTableBody.innerHTML =
      '<tr><td class="preview-empty">No preview available yet.</td></tr>';
    return;
  }

  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row || {}))),
  );
  previewTableHead.innerHTML = `<tr>${columns
    .map((column) => `<th>${escapeHtml(column)}</th>`)
    .join("")}</tr>`;

  previewTableBody.innerHTML = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${escapeHtml(row?.[column] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");
}

function updateFilterSummary() {
  filterSummary.textContent = `${detectionMethod.value} · Sensitivity ${sensitivityLevel.value} · Altitude ${altitudeThreshold.value} · Battery ${batteryCritical.value} · Vibration ${vibrationLimit.value}`;
}

function openFilterModal() {
  filterModal.classList.add("active");
  filterModal.setAttribute("aria-hidden", "false");
}

function closeFilterModal() {
  filterModal.classList.remove("active");
  filterModal.setAttribute("aria-hidden", "true");
}

function buildSafetyBadge(level) {
  if (level === "OK")
    return `<span class="badge badge-success">${level}</span>`;
  if (level === "WATCH")
    return `<span class="badge badge-warning">${level}</span>`;
  return `<span class="badge badge-danger">${level}</span>`;
}

function renderSummary(data) {
  document.getElementById("summaryTotal").textContent =
    data.total_readings.toLocaleString();
  document.getElementById("summaryAnomaly").textContent =
    `${(data.overall_anomaly_percentage * 100).toFixed(2)}%`;
  document.getElementById("summarySafety").textContent = data.safety_level;
}

function renderDetails(data) {
  const anomalyCount = data.total_anomalies;
  const topIssues = data.safety_issues.length
    ? data.safety_issues
    : ["No critical safety issues detected."];

  const detailCards = `
    <div class="detail-panel detail-grid">
      <div class="detail-card">
        <h3>Performance Metrics</h3>
        <div class="detail-metric"><span>Total anomalies</span><strong>${anomalyCount}</strong></div>
        <div class="detail-metric"><span>Altitude threshold</span><strong>${data.altitude_max_threshold}</strong></div>
        <div class="detail-metric"><span>Battery threshold</span><strong>${data.battery_critical_threshold}V</strong></div>
        <div class="detail-metric"><span>Vibration limit</span><strong>${data.vibration_limit_threshold}</strong></div>
        <div class="detail-metric"><span>Detection method</span><strong>${data.detection_method}</strong></div>
      </div>
      <div class="detail-card">
        <h3>Action Items</h3>
        <ul class="anomaly-list">
          ${topIssues.map((item) => `<li class="anomaly-item"><span>${item}</span><strong>Review</strong></li>`).join("")}
        </ul>
      </div>
    </div>
    <div class="detail-card anomaly-table-card">
      <h3>Top anomaly details</h3>
      <div class="anomaly-table-wrap">
        <table class="anomaly-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Parameter</th>
              <th>Value</th>
              <th>Z-Score</th>
            </tr>
          </thead>
          <tbody>
            ${renderAnomalyRows(data.anomaly_report)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  resultDetails.innerHTML = detailCards;
  renderAnomalyChart(data);
  renderPerformanceChart(data);
  renderTimelineChart(data);
}

function renderAnomalyRows(report = []) {
  if (!report || report.length === 0) {
    return `<tr><td colspan="4">No anomalies were detected for the selected parameter set.</td></tr>`;
  }

  return report
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.parameter || "Unknown"}</td>
        <td>${item.value}</td>
        <td>${item.z_score}</td>
      </tr>
    `,
    )
    .join("");
}

function renderAnomalyChart(data) {
  const ctx = document.getElementById("anomalyChart");
  if (!ctx) return;

  destroyChart(anomalyChart);

  const safeCount = Math.max(0, data.total_readings - data.total_anomalies);
  anomalyChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Normal", "Anomalies"],
      datasets: [
        {
          data: [safeCount, data.total_anomalies],
          backgroundColor: ["#5f9f56", "#dbeccd"],
          hoverBackgroundColor: ["#3f7f36", "#97b77f"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#2b4c2e",
            font: { size: 13 },
          },
        },
      },
    },
  });
}

function renderPerformanceChart(data) {
  const ctx = document.getElementById("performanceChart");
  if (!ctx) return;

  destroyChart(performanceChart);

  const counts = {};
  (data.anomaly_report || []).forEach((item) => {
    const label = item.parameter || "Unknown";
    counts[label] = (counts[label] || 0) + 1;
  });

  const labels = Object.keys(counts).length
    ? Object.keys(counts)
    : ["No anomalies"];
  const values = Object.keys(counts).length ? Object.values(counts) : [0];

  performanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Anomaly count",
          data: values,
          backgroundColor: "rgba(46, 104, 61, 0.85)",
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "#2d4c2b",
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: "#2d4c2b",
          },
          grid: {
            borderDash: [4, 4],
            color: "rgba(90, 141, 110, 0.18)",
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

function renderTimelineChart(data) {
  const ctx = document.getElementById("timelineChart");
  if (!ctx) return;

  destroyChart(timelineChart);

  const batteryTrend = data.battery_trend || [];
  const altitudeTrend = data.altitude_trend || [];
  const labels = batteryTrend.length
    ? batteryTrend.map((item) => item.label)
    : altitudeTrend.map((item) => item.label);

  timelineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Battery Voltage",
          data: batteryTrend.map((item) => item.value),
          borderColor: "#32733b",
          backgroundColor: "rgba(50, 115, 59, 0.14)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: "Altitude",
          data: altitudeTrend.map((item) => item.value),
          borderColor: "#1f5b2a",
          backgroundColor: "rgba(31, 91, 42, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "#2d4c2b",
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: "#2d4c2b",
          },
          grid: {
            borderDash: [4, 4],
            color: "rgba(90, 141, 110, 0.18)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#234a2a",
          },
        },
      },
    },
  });
}

function renderBatteryChart(data) {
  const ctx = document.getElementById("batteryChart");
  if (!ctx || !data.battery_trend) return;

  destroyChart(batteryChart);

  batteryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.battery_trend.map((item) => item.label),
      datasets: [
        {
          label: "Battery Voltage (V)",
          data: data.battery_trend.map((item) => item.value),
          borderColor: "#367b36",
          backgroundColor: "rgba(54, 123, 54, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: false,
        },
        y: {
          ticks: {
            color: "#2d4c2b",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

function renderAltitudeChart(data) {
  const ctx = document.getElementById("altitudeChart");
  if (!ctx || !data.altitude_trend) return;

  destroyChart(altitudeChart);

  altitudeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.altitude_trend.map((item) => item.label),
      datasets: [
        {
          label: "Altitude (m)",
          data: data.altitude_trend.map((item) => item.value),
          borderColor: "#2c5fae",
          backgroundColor: "rgba(44, 95, 174, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: false,
        },
        y: {
          ticks: {
            color: "#23496c",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

async function uploadCsv() {
  const file = uploadImportFileInput?.files?.[0] || csvUpload?.files?.[0];
  if (!file) {
    alert("Please select a CSV or Excel file to upload.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/upload-csv", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    alert(result.error || "Upload failed.");
    return;
  }

  await loadStreams();
  showMessage(result.message);
  if (uploadImportFileName) {
    uploadImportFileName.textContent = file.name;
  }
  if (uploadFileInfo) {
    const rowCount = Number(result.row_count || 0).toLocaleString();
    const columnCount = Number(result.column_count || 0).toLocaleString();
    const fileType = (result.file_type || "file").toUpperCase();
    uploadFileInfo.textContent = `${fileType} uploaded: ${rowCount} rows, ${columnCount} columns`;
  }
}

function renderReportCards(data) {
  if (!data) {
    showMessage("No results available yet.");
    return;
  }

  latestResult = data;
  renderSummary(data);
  renderDetails(data);
}

async function computeTaskHandler() {
  const payload = {
    detection_method: detectionMethod.value,
    sensitivity_level: Number(sensitivityLevel.value),
    altitude_threshold: Number(altitudeThreshold.value),
    battery_critical: Number(batteryCritical.value),
    vibration_limit: Number(vibrationLimit.value),
  };

  const response = await fetch("/api/compute", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(result.error || "Failed to compute.");
    return;
  }

  renderReportCards(result);
}

function saveResults() {
  if (!latestResult) {
    alert("Run the compute task before saving results.");
    return;
  }

  const blob = new Blob([JSON.stringify(latestResult, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "telemetry_results.json";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

if (uploadCsvBtn) uploadCsvBtn.addEventListener("click", uploadCsv);
if (computeTask) computeTask.addEventListener("click", computeTaskHandler);
if (saveResultsBtn) saveResultsBtn.addEventListener("click", saveResults);
taskCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", updateComputeButtonState);
});
updateMetadataFromToken();
updateComputeButtonState();
if (openFilterModalBtn)
  openFilterModalBtn.addEventListener("click", openFilterModal);
if (closeFilterModalBtn)
  closeFilterModalBtn.addEventListener("click", closeFilterModal);
if (cancelFilterModalBtn)
  cancelFilterModalBtn.addEventListener("click", closeFilterModal);
if (saveFilterSettingsBtn) {
  saveFilterSettingsBtn.addEventListener("click", () => {
    updateFilterSummary();
    closeFilterModal();
  });
}
if (metaDataToggle) {
  metaDataToggle.addEventListener("change", updateMetaSectionVisibility);
}
if (metaSaveButton) {
  metaSaveButton.addEventListener("click", () => {
    const selectedDataTypes = Array.from(
      document.querySelectorAll(".data-type-check:checked"),
    ).map((input) => input.value);
    const statusValue =
      document.querySelector('input[name="dataStatus"]:checked')?.value ||
      "not_processed";

    const metaState = {
      description:
        dataDescription?.value?.trim() ||
        buildMetaDescription(latestProfile || {}),
      dataStatus: statusValue,
      dataTypes: selectedDataTypes,
      updatedAt: new Date().toISOString(),
    };

    saveMetaState(metaState);
    if (metaSaveButton) {
      const originalText = metaSaveButton.textContent;
      metaSaveButton.textContent = "Saved";
      setTimeout(() => {
        metaSaveButton.textContent = originalText;
      }, 900);
    }
  });
}
if (logoutButton) {
  logoutButton.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const token = getToken();
      const response = await fetch("/logout", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
      });

      if (response.ok) {
        clearToken();
        // Add a small delay to ensure token is cleared before navigation
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      } else {
        console.error("Logout failed with status:", response.status);
        // Still redirect even if logout fails
        clearToken();
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    } catch (error) {
      console.error("Logout error:", error);
      clearToken();
      window.location.href = "/login";
    }
  });
}

if (toggleAdvancedPanels) {
  toggleAdvancedPanels.addEventListener("click", () => {
    const nextVisible = !document.body.classList.contains("show-advanced");
    document.body.classList.toggle("show-advanced", nextVisible);
    toggleAdvancedPanels.textContent = nextVisible
      ? "Hide Full Analytics"
      : "Show Full Analytics";
  });
}

if (uploadImportFileInput) {
  const openUploadFilePicker = () => {
    uploadImportFileInput.click();
  };

  if (uploadImportTrigger) {
    uploadImportTrigger.addEventListener("click", openUploadFilePicker);
  }

  if (sketchUploadButton) {
    sketchUploadButton.addEventListener("click", openUploadFilePicker);
  }

  uploadImportFileInput.addEventListener("change", () => {
    const selectedFile = uploadImportFileInput.files?.[0];
    if (uploadImportFileName) {
      uploadImportFileName.textContent = selectedFile
        ? selectedFile.name
        : "No file selected";
    }

    if (selectedFile) {
      uploadCsv();
    }
  });
}

if (sketchFiltersToggle && sketchFiltersPanel) {
  sketchFiltersToggle.addEventListener("click", () => {
    const isCollapsed = sketchFiltersPanel.classList.toggle("collapsed");
    sketchFiltersToggle.textContent = isCollapsed ? "Filters" : "Hide Filters";
  });
}

function bindSketchSlider(slider, output) {
  if (!slider || !output) return;
  const sync = () => {
    output.textContent = slider.value;
  };
  slider.addEventListener("input", sync);
  sync();
}

bindSketchSlider(sketchSensitivity, sketchSensitivityValue);
bindSketchSlider(sketchAltitudeThreshold, sketchAltitudeValue);
bindSketchSlider(sketchBatteryCritical, sketchBatteryValue);
bindSketchSlider(sketchVibrationLimit, sketchVibrationValue);

function syncDatasetStructureLabel() {
  if (!sketchDataStructureType || !sketchDatasetStructureLabel) return;
  const selectedType = sketchDataStructureType.value || "ML";
  sketchDatasetStructureLabel.textContent = `Dataset structure for ${selectedType}`;
}

if (sketchDataStructureType) {
  sketchDataStructureType.addEventListener("change", syncDatasetStructureLabel);
  syncDatasetStructureLabel();
}

// Sidebar Toggle
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.querySelector(".sidebar");

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Close sidebar when a nav item is clicked
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 760) {
        sidebar.classList.remove("active");
      }
    });
  });

  // Close sidebar when clicking outside of it
  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 760 &&
      !sidebar.contains(e.target) &&
      !sidebarToggle.contains(e.target)
    ) {
      sidebar.classList.remove("active");
    }
  });
}

const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    tabContents.forEach((content) => {
      content.classList.toggle(
        "active",
        content.dataset.tabContent === targetTab,
      );
    });
  });
});

updateFilterSummary();
updateMetaSectionVisibility();
loadStreams();
