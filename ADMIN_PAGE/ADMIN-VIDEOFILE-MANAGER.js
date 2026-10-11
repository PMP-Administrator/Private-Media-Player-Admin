"use strict";

if (!sessionStorage.getItem("admin_authenticated")) {
  window.location.href = "ADMIN-SIGN-IN.html";
}

document.addEventListener("DOMContentLoaded", loadVideos);

async function loadVideos() {
  const tbody = document.getElementById("videosTableBody");
  try {
    const res = await fetch("http://localhost:4000/admin/videos");
    const videos = await res.json();

    if (!Array.isArray(videos) || !videos.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">No video files stored in VIDEOFILES directory.</td></tr>`;
      return;
    }

    // Fixed: Using backticks (``) instead of quotes so \${vid.name} evaluates properly
    tbody.innerHTML = videos.map(vid => `
      <tr>
        <td>${vid.name}</td>
        <td>${(vid.size / (1024 * 1024)).toFixed(2)} MB</td>
        <td><span class="badge">Shared to All Users</span></td>
        <td><button class="btn secondary sm" onclick="deleteVideo('${vid.name}')">Delete</button></td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error loading videos:", error);
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Failed to load video list. Ensure Port 4000 is running.</td></tr>`;
  }
}

document.getElementById("uploadVideoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("videoFile");
  if (!fileInput.files.length) return;

  const formData = new FormData();
  formData.append("video", fileInput.files[0]);

  try {
    const res = await fetch("http://localhost:4000/admin/videos/upload", {
      method: "POST",
      body: formData
    });
    const result = await res.json();
    alert(result.message || result.error);
    if (res.ok) {
      e.target.reset();
      loadVideos();
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("Error uploading video file.");
  }
});

async function deleteVideo(filename) {
  if (!confirm(`Delete video file ${filename}?`)) return;
  try {
    const res = await fetch(`http://localhost:4000/admin/videos/${encodeURIComponent(filename)}`, { method: "DELETE" });
    const result = await res.json();
    alert(result.message || result.error);
    if (res.ok) loadVideos();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Error deleting video file.");
  }
}