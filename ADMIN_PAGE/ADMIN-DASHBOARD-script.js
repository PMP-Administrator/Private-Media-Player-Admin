"use strict";

const adminEmail = sessionStorage.getItem("admin_email");
const isAuthenticated = sessionStorage.getItem("admin_authenticated");

if (!isAuthenticated || !adminEmail) {
  window.location.replace("ADMIN-SIGN-IN.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("adminDisplayEmail");
  if (emailEl) emailEl.textContent = adminEmail;
  loadCounts();
});

function logoutAdmin() {
  sessionStorage.clear();
  window.location.replace("ADMIN-SIGN-IN.html");
}

async function loadCounts() {
  try {
    const [accRes, vidRes] = await Promise.all([
      fetch("http://localhost:4000/admin/accounts"),
      fetch("http://localhost:4000/admin/videos")
    ]);
    const accounts = await accRes.json();
    const videos = await vidRes.json();

    document.getElementById("userCount").textContent = Array.isArray(accounts) ? accounts.length : 0;
    document.getElementById("videoCount").textContent = Array.isArray(videos) ? videos.length : 0;
  } catch {
    document.getElementById("userCount").textContent = "Err";
    document.getElementById("videoCount").textContent = "Err";
  }
}