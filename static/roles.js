const rolesTableBody = document.getElementById("rolesTableBody");
const rolesCount = document.getElementById("rolesCount");
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

function renderRoles(roles) {
  if (!roles || roles.length === 0) {
    rolesCount.textContent = "0 roles";
    rolesTableBody.innerHTML =
      '<tr><td colspan="2">No roles available.</td></tr>';
    return;
  }

  rolesCount.textContent = `${roles.length} roles`;
  rolesTableBody.innerHTML = roles
    .map((item) => `<tr><td>${item.role}</td><td>${item.users}</td></tr>`)
    .join("");
}

async function loadRoles() {
  const ok = await ensureSuperAdminAccess();
  if (!ok) return;

  const response = await fetch("/api/roles-summary", {
    headers: authHeaders(),
  });
  if (await handleUnauthorized(response)) return;

  if (!response.ok) {
    rolesTableBody.innerHTML =
      '<tr><td colspan="2">Unable to load roles.</td></tr>';
    return;
  }

  const roles = await response.json();
  renderRoles(roles);
}

logoutButton.addEventListener("click", () => {
  clearToken();
  window.location.href = "/login";
});

setAvatarInitial();
loadRoles();
