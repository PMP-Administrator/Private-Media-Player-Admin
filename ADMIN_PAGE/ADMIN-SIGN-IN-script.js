"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminSignInForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();
    const submitBtn = form.querySelector("button[type='submit']") || form.querySelector("button");

    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const res = await fetch("http://localhost:4000/admin-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const result = await res.json();

      if (res.ok) {
        sessionStorage.setItem("pending_admin_email", email);
        window.location.href = "ADMIN-OTP.html";
      } else {
        alert(result.error || "Authentication failed.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Error communicating with authentication server. Ensure Port 4000 is active.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});