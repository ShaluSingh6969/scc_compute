import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import ShellLayout from "../components/ShellLayout";

export default function GroupsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function load() {
      const access = await apiFetch("/api/super-admin/access");
      if (access.status === 401) return navigate("/login");
      if (access.status === 403) return navigate("/");

      const response = await apiFetch("/api/groups-summary");
      if (response.ok) setRows(await response.json());
    }
    load();
  }, [navigate]);

  return (
    <ShellLayout
      title="Group Management"
      subtitle="Review configured groups and their members."
      active="groups"
    >
      <section className="users-page-grid">
        <article className="users-table-card">
          <div className="users-table-header">
            <h2>Groups Summary</h2>
            <span className="users-count">{rows.length} groups</span>
          </div>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Members</th>
                  <th>User Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="3">No groups available.</td>
                  </tr>
                )}
                {rows.map((item) => (
                  <tr key={item.group}>
                    <td>{item.group}</td>
                    <td>
                      {item.members?.length ? item.members.join(", ") : "-"}
                    </td>
                    <td>{item.member_count}</td>
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
