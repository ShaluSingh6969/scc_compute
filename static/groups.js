const groupsTableBody = document.getElementById("groupsTableBody");
const groupsCount = document.getElementById("groupsCount");
const logoutButton = document.getElementById("logoutButton");
const userAvatar = document.getElementById("userAvatar");

function getToken() {
  return localStorage.getItem("tucdrive_token");
}

function clearToken() {
  localStorage.removeItem("tucdrive_token");
}

function authHeaders(additional = {}) {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...additional }
    : additional;
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

function setAvatarInitial() {
  if (!userAvatar) return;
  const token = getToken();
  if (!token) return;
  const payload = parseJwtPayload(token);
  const username = payload?.sub || "A";
  const initial = username.charAt(0).toUpperCase();
  const target = userAvatar.querySelector(".avatar-initial");
  if (target) target.textContent = initial;
}

async function handleUnauthorized(response) {
  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    return true;
  }
  if (response.status === 403) {
    alert("Only super admin can access this page.");
    window.location.href = "/";
    return true;
  }
  return false;
}

async function ensureSuperAdminAccess() {
  const response = await fetch("/api/super-admin/access", {
    headers: authHeaders(),
  });
  return !(await handleUnauthorized(response));
}

function renderGroups(groups) {
  if (!groups || groups.length === 0) {
    groupsCount.textContent = "0 groups";
    groupsTableBody.innerHTML =
      '<tr><td colspan="3">No groups available.</td></tr>';
    return;
  }

  groupsCount.textContent = `${groups.length} groups`;
  groupsTableBody.innerHTML = groups
    .map(
      (item) =>
        `<tr><td>${item.group}</td><td>${item.members.length ? item.members.join(", ") : "-"}</td><td>${item.member_count}</td></tr>`,
    )
    .join("");
}

async function loadGroups() {
  const ok = await ensureSuperAdminAccess();
  if (!ok) return;

  const response = await fetch("/api/groups-summary", {
    headers: authHeaders(),
  });
  if (await handleUnauthorized(response)) return;

  if (!response.ok) {
    groupsTableBody.innerHTML =
      '<tr><td colspan="3">Unable to load groups.</td></tr>';
    return;
  }

  const groups = await response.json();
  renderGroups(groups);
}

logoutButton.addEventListener("click", () => {
  clearToken();
  window.location.href = "/login";
});

setAvatarInitial();
loadGroups();
