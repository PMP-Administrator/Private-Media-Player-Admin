"use strict";

const adminEmail = sessionStorage.getItem("pending_admin_email");

if (!adminEmail) {
  window.location.replace("ADMIN-SIGN-IN.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const msgEl = document.getElementById("otpMessage");
  if (msgEl && adminEmail) {
    msgEl.textContent = `Administrator code sent to ${adminEmail}`;
  }

  const resendBtn = document.getElementById("resendBtn");
  if (resendBtn) {
    resendBtn.addEventListener("click", resendAdminOtp);
  }
});

async function resendAdminOtp() {
  const resendBtn = document.getElementById("resendBtn");
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = "Please wait...";
  }

  try {
    const res = await fetch("http://localhost:4000/admin-resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail })
    });

    const result = await res.json();
    alert(result.message || result.error);
  } catch (error) {
    console.error("Resend Admin OTP error:", error);
    alert("Failed to reach server on Port 4000.");
  } finally {
    if (resendBtn) {
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend Code";
    }
  }
}

async function handleAdminOtp(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const otpInput = document.getElementById("otp");
  const submitBtn = document.getElementById("submitBtn");

  if (!otpInput) return false;

  const otp = otpInput.value.trim();
  const originalBtnText = submitBtn ? submitBtn.textContent : "Verify & Proceed";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";
  }

  try {
    const res = await fetch("http://localhost:4000/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, otp })
    });

    const result = await res.json();

    if (res.ok && result.success) {
      sessionStorage.removeItem("pending_admin_email");
      sessionStorage.setItem("admin_authenticated", "true");
      sessionStorage.setItem("admin_email", adminEmail);
      
      window.location.href = "ADMIN-DASHBOARD.html";
    } else {
      alert(result.error || "Invalid verification code.");
    }
  } catch (error) {
    console.error("OTP Verification Error:", error);
    alert("Cannot connect to server. Ensure Node.js is running on Port 4000.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }

  return false;
}