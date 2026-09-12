const signupRequestsTableBody = document.getElementById(
  "signupRequestsTableBody",
);
const signupRequestsCount = document.getElementById("signupRequestsCount");
const signupRequestsNotice = document.getElementById("signupRequestsNotice");
const usersTableBody = document.getElementById("usersTableBody");
const usersCount = document.getElementById("usersCount");
const logoutButton = document.getElementById("logoutButton");
const userAvatar = document.getElementById("userAvatar");
const searchUsername = document.getElementById("searchUsername");
const roleFilter = document.getElementById("roleFilter");
const applyFilters = document.getElementById("applyFilters");
const clearFilters = document.getElementById("clearFilters");
const userForm = document.getElementById("userForm");
const userFormTitle = document.getElementById("userFormTitle");
const formUsername = document.getElementById("formUsername");
const formRole = document.getElementById("formRole");
const formPassword = document.getElementById("formPassword");
const userFormMessage = document.getElementById("userFormMessage");
const editUserModal = document.getElementById("editUserModal");
const closeEditUserModal = document.getElementById("closeEditUserModal");
const cancelEditUserModal = document.getElementById("cancelEditUserModal");
const editUserForm = document.getElementById("editUserForm");
const modalEditUserId = document.getElementById("modalEditUserId");
const modalEditUsername = document.getElementById("modalEditUsername");
const modalEditRole = document.getElementById("modalEditRole");
const modalEditPassword = document.getElementById("modalEditPassword");
const editUserFormMessage = document.getElementById("editUserFormMessage");
const deleteUserModal = document.getElementById("deleteUserModal");
const closeDeleteUserModal = document.getElementById("closeDeleteUserModal");
const cancelDeleteUserModal = document.getElementById("cancelDeleteUserModal");
const confirmDeleteUserModal = document.getElementById(
  "confirmDeleteUserModal",
);
const deleteUserMessage = document.getElementById("deleteUserMessage");
const deleteUserFormMessage = document.getElementById("deleteUserFormMessage");

let currentUsers = [];
let currentSignupRequests = [];
let pendingDeleteUserId = null;

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

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

async function handleUnauthorized(response) {
  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    return true;
  }
  if (response.status === 403) {
    alert("Only super admin can access User Management.");
    window.location.href = "/";
    return true;
  }
  return false;
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function renderUsers(users) {
  currentUsers = users || [];

  if (!users || users.length === 0) {
    usersTableBody.innerHTML =
      '<tr><td colspan="6">No registered users found.</td></tr>';
    usersCount.textContent = "0 users";
    return;
  }

  usersCount.textContent = `${users.length} users`;
  usersTableBody.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.role}</td>
          <td><span class="user-status-badge">${user.status}</span></td>
          <td>${formatDate(user.created_at)}</td>
          <td>
            <button class="table-action-button" data-action="edit" data-user-id="${user.id}">Edit</button>
            <button class="table-action-button danger" data-action="delete" data-user-id="${user.id}">Delete</button>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderSignupRequests(requests) {
  currentSignupRequests = requests || [];

  const pendingRequests = currentSignupRequests.filter(
    (request) => request.status === "pending",
  );

  if (signupRequestsCount) {
    signupRequestsCount.textContent = `${pendingRequests.length} pending`;
  }

  if (signupRequestsNotice) {
    signupRequestsNotice.textContent = pendingRequests.length
      ? `${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"} need approval.`
      : "No pending requests at the moment.";
    signupRequestsNotice.classList.toggle(
      "visible",
      pendingRequests.length > 0,
    );
  }

  if (!signupRequestsTableBody) return;

  if (!currentSignupRequests.length) {
    signupRequestsTableBody.innerHTML =
      '<tr><td colspan="6">No signup requests found.</td></tr>';
    return;
  }

  signupRequestsTableBody.innerHTML = currentSignupRequests
    .map((request) => {
      const actions =
        request.status === "pending"
          ? `
              <button class="table-action-button" data-request-action="approve" data-request-id="${request.id}">Approve</button>
              <button class="table-action-button danger" data-request-action="decline" data-request-id="${request.id}">Decline</button>
            `
          : `<span class="request-processed">${request.reviewed_by || "Super Admin"}</span>`;

      return `
        <tr>
          <td>${request.id}</td>
          <td>${request.username}</td>
          <td>${request.role}</td>
          <td><span class="request-status-badge ${request.status}">${request.status}</span></td>
          <td>${formatDate(request.created_at)}</td>
          <td>
            ${actions}
          </td>
        </tr>
      `;
    })
    .join("");
}

function setFormMessage(message, isError = false) {
  userFormMessage.textContent = message;
  userFormMessage.classList.toggle("error", isError);
}

function resetForm() {
  userFormTitle.textContent = "Create User";
  formUsername.value = "";
  formRole.value = "user";
  formPassword.value = "";
  setFormMessage("");
}

function setModalMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function openModal(modal) {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

function closeEditModal() {
  closeModal(editUserModal);
  modalEditPassword.value = "";
  setModalMessage(editUserFormMessage, "");
}

function closeDeleteModal() {
  closeModal(deleteUserModal);
  pendingDeleteUserId = null;
  setModalMessage(deleteUserFormMessage, "");
}

function openEditUserModal(userId) {
  const user = currentUsers.find((item) => item.id === Number(userId));
  if (!user) return;

  modalEditUserId.value = String(user.id);
  modalEditUsername.value = user.username;
  modalEditRole.value = user.role;
  modalEditPassword.value = "";
  setModalMessage(editUserFormMessage, "");
  openModal(editUserModal);
}

function openDeleteUserModal(userId) {
  const user = currentUsers.find((item) => item.id === Number(userId));
  if (!user) return;

  pendingDeleteUserId = user.id;
  deleteUserMessage.textContent = `Are you sure you want to delete user ${user.username}?`;
  setModalMessage(deleteUserFormMessage, "");
  openModal(deleteUserModal);
}

async function confirmDeleteUser() {
  if (!pendingDeleteUserId) return;

  const response = await fetch(`/api/users/${pendingDeleteUserId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (await handleUnauthorized(response)) return;

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setModalMessage(
      deleteUserFormMessage,
      result.detail || "Unable to delete user.",
      true,
    );
    return;
  }

  closeDeleteModal();
  setFormMessage("User deleted successfully.");
  await loadUsers();
}

async function loadUsers() {
  if (!requireAuth()) return;

  const query = new URLSearchParams();
  const username = searchUsername.value.trim();
  const role = roleFilter.value;
  if (username) query.set("username", username);
  if (role && role !== "all") query.set("role", role);

  const endpoint = query.toString()
    ? `/api/users?${query.toString()}`
    : "/api/users";

  const response = await fetch(endpoint, { headers: authHeaders() });
  if (await handleUnauthorized(response)) return;

  if (!response.ok) {
    usersTableBody.innerHTML =
      '<tr><td colspan="6">Unable to load users. Please try again.</td></tr>';
    usersCount.textContent = "-";
    return;
  }

  const users = await response.json();
  renderUsers(users);
}

async function loadSignupRequests() {
  if (!requireAuth()) return;

  const response = await fetch("/api/signup-requests", {
    headers: authHeaders(),
  });
  if (await handleUnauthorized(response)) return;

  if (!response.ok) {
    if (signupRequestsTableBody) {
      signupRequestsTableBody.innerHTML =
        '<tr><td colspan="6">Unable to load signup requests. Please try again.</td></tr>';
    }
    return;
  }

  const requests = await response.json();
  renderSignupRequests(requests);
}

async function refreshData() {
  await Promise.all([loadSignupRequests(), loadUsers()]);
}

async function saveUser(event) {
  event.preventDefault();
  setFormMessage("");

  const payload = {
    username: formUsername.value.trim(),
    role: formRole.value,
    password: formPassword.value,
  };

  if (!payload.username) {
    setFormMessage("Username is required.", true);
    return;
  }
  if (!payload.role) {
    setFormMessage("Role is required.", true);
    return;
  }
  if (!payload.password.trim()) {
    setFormMessage("Password is required for new users.", true);
    return;
  }

  const response = await fetch("/api/users", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (await handleUnauthorized(response)) return;

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    setFormMessage(result.detail || "Unable to save user.", true);
    return;
  }

  setFormMessage("User created successfully.");
  resetForm();
  await loadUsers();
}

async function saveEditedUser(event) {
  event.preventDefault();
  const userId = modalEditUserId.value.trim();
  if (!userId) return;

  const payload = {
    username: modalEditUsername.value.trim(),
    role: modalEditRole.value,
    password: modalEditPassword.value.trim()
      ? modalEditPassword.value
      : undefined,
  };

  if (!payload.username) {
    setModalMessage(editUserFormMessage, "Username is required.", true);
    return;
  }
  if (!payload.role) {
    setModalMessage(editUserFormMessage, "Role is required.", true);
    return;
  }

  const response = await fetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (await handleUnauthorized(response)) return;

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    setModalMessage(
      editUserFormMessage,
      result.detail || "Unable to update user.",
      true,
    );
    return;
  }

  closeEditModal();
  setFormMessage("User updated successfully.");
  await loadUsers();
}

async function handleSignupRequestAction(requestId, action) {
  const response = await fetch(`/api/signup-requests/${requestId}/${action}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (await handleUnauthorized(response)) return;

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    setFormMessage(result.detail || "Unable to process signup request.", true);
    return;
  }

  setFormMessage(result.message || "Signup request processed successfully.");
  await refreshData();
}

usersTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.getAttribute("data-action");
  const userId = button.getAttribute("data-user-id");
  if (!userId) return;

  if (action === "edit") {
    openEditUserModal(userId);
    return;
  }
  if (action === "delete") {
    openDeleteUserModal(userId);
  }
});

if (signupRequestsTableBody) {
  signupRequestsTableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-request-action]");
    if (!button) return;

    const requestId = button.getAttribute("data-request-id");
    const action = button.getAttribute("data-request-action");
    if (!requestId || !action) return;

    await handleSignupRequestAction(requestId, action);
  });
}

applyFilters.addEventListener("click", loadUsers);
clearFilters.addEventListener("click", async () => {
  searchUsername.value = "";
  roleFilter.value = "all";
  await loadUsers();
});
userForm.addEventListener("submit", saveUser);
editUserForm.addEventListener("submit", saveEditedUser);
closeEditUserModal.addEventListener("click", closeEditModal);
cancelEditUserModal.addEventListener("click", closeEditModal);
closeDeleteUserModal.addEventListener("click", closeDeleteModal);
cancelDeleteUserModal.addEventListener("click", closeDeleteModal);
confirmDeleteUserModal.addEventListener("click", confirmDeleteUser);

editUserModal.addEventListener("click", (event) => {
  if (event.target === editUserModal) {
    closeEditModal();
  }
});

deleteUserModal.addEventListener("click", (event) => {
  if (event.target === deleteUserModal) {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (editUserModal.classList.contains("active")) {
    closeEditModal();
  }
  if (deleteUserModal.classList.contains("active")) {
    closeDeleteModal();
  }
});

logoutButton.addEventListener("click", () => {
  clearToken();
  window.location.href = "/login";
});

resetForm();
setAvatarInitial();
refreshData();
