"use strict";

if (!sessionStorage.getItem("admin_authenticated")) {
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", loadUsers);

async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  try {
    const res = await fetch("http://localhost:4000/admin/accounts");
    const accounts = await res.json();

    if (!accounts.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">No user accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = accounts.map(acc => `
      <tr>
        <td><code>${acc.fileName}</code></td>
        <td>${acc.email}</td>
        <td><span class="badge">${acc.role}</span></td>
        <td><button class="btn secondary sm" onclick="deleteUser('${acc.fileName}')">Delete</button></td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Failed to load accounts.</td></tr>`;
  }
}

document.getElementById("addUserForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();
  const role = document.getElementById("selectedRole").value;

  try {
    const res = await fetch("http://localhost:4000/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });
    const result = await res.json();
    alert(result.message || result.error);
    if (res.ok) {
      e.target.reset();
      // Reset default role to user
      if (typeof window.selectRole === 'function') window.selectRole('user');
      loadUsers();
    }
  } catch {
    alert("Error saving account.");
  }
});

async function deleteUser(fileName) {
  if (!confirm(`Delete account file ${fileName}?`)) return;
  try {
    const res = await fetch(`http://localhost:4000/admin/accounts/${fileName}`, { method: "DELETE" });
    const result = await res.json();
    alert(result.message || result.error);
    if (res.ok) loadUsers();
  } catch {
    alert("Error deleting user.");
  }
}
