import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import ShellLayout from "../components/ShellLayout";

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    username: "",
    role: "user",
    password: "",
  });

  async function loadUsers() {
    const query = new URLSearchParams();
    if (search.trim()) query.set("username", search.trim());
    if (roleFilter !== "all") query.set("role", roleFilter);
    const endpoint = query.toString()
      ? `/api/users?${query.toString()}`
      : "/api/users";

    const response = await apiFetch(endpoint);
    if (response.status === 401) return navigate("/login");
    if (response.status === 403) return navigate("/");
    if (response.ok) setUsers(await response.json());
  }

  async function loadRequests() {
    const response = await apiFetch("/api/signup-requests");
    if (response.status === 401) return navigate("/login");
    if (response.status === 403) return navigate("/");
    if (response.ok) setRequests(await response.json());
  }

  useEffect(() => {
    async function init() {
      const access = await apiFetch("/api/super-admin/access");
      if (access.status === 401) return navigate("/login");
      if (access.status === 403) return navigate("/");
      await Promise.all([loadUsers(), loadRequests()]);
    }
    init();
  }, [navigate]);

  async function createUser(event) {
    event.preventDefault();
    setMessage("");

    const response = await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.detail || "Unable to create user.");
      return;
    }

    setMessage("User created successfully.");
    setForm({ username: "", role: "user", password: "" });
    await loadUsers();
  }

  async function processSignupRequest(id, action) {
    const response = await apiFetch(`/api/signup-requests/${id}/${action}`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.detail || "Unable to process request.");
      return;
    }
    setMessage(payload.message || "Request updated.");
    await Promise.all([loadUsers(), loadRequests()]);
  }

  async function deleteUser(id) {
    const response = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.detail || "Unable to delete user.");
      return;
    }
    setMessage("User deleted successfully.");
    await loadUsers();
  }

  const pendingCount = requests.filter(
    (item) => item.status === "pending",
  ).length;

  return (
    <ShellLayout
      title="User Management"
      subtitle="Review all registered users and their assigned roles."
      active="users"
    >
      <section className="users-page-grid">
        <article className="users-table-card signup-requests-card">
          <div className="users-table-header">
            <div>
              <h2>Account creation requests</h2>
              <p className="request-helper">
                Review new signup requests before allowing login access.
              </p>
            </div>
            <span className="users-count">{pendingCount} pending</span>
          </div>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan="6">No signup requests found.</td>
                  </tr>
                )}
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.username}</td>
                    <td>{item.role}</td>
                    <td>{item.status}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      {item.status === "pending" ? (
                        <>
                          <button
                            className="table-action-button"
                            onClick={() =>
                              processSignupRequest(item.id, "approve")
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="table-action-button danger"
                            onClick={() =>
                              processSignupRequest(item.id, "decline")
                            }
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <span>{item.reviewed_by || "Super Admin"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="users-table-card">
          <div className="users-table-header">
            <h2>Registered Users</h2>
            <span className="users-count">{users.length} users</span>
          </div>

          <div className="users-toolbar">
            <div className="users-toolbar-group">
              <label>Search by username</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Enter username"
              />
            </div>
            <div className="users-toolbar-group">
              <label>Filter by role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="users-toolbar-actions">
              <button className="secondary-button" onClick={loadUsers}>
                Apply
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <form className="user-form-card" onSubmit={createUser}>
            <h3>Create User</h3>
            <div className="user-form-grid">
              <div>
                <label>Username</label>
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  type="text"
                  required
                />
              </div>
              <div>
                <label>Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                  required
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div>
                <label>Password</label>
                <input
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  type="password"
                  required
                />
              </div>
            </div>
            <div className="user-form-actions">
              <button type="submit" className="primary-button">
                Save User
              </button>
              <span className="user-form-message">{message}</span>
            </div>
          </form>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6">No users found.</td>
                  </tr>
                )}
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.username}</td>
                    <td>{item.role}</td>
                    <td>{item.status}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <button
                        className="table-action-button danger"
                        onClick={() => deleteUser(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </ShellLayout>
  );
}
