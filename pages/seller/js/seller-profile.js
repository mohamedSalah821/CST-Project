// ../js/seller-profile.js
import { db } from "../../../assets/js/firebase.js";
import { ref, get, update }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
  Helpers
========================= */
function getSellerId() {
  return localStorage.getItem("sellerId");
}

let msgTimer = null;

function showMsg(el, text, type = "info") {
  if (!el) return;

  // clear previous timer
  if (msgTimer) clearTimeout(msgTimer);

  el.textContent = text;
  el.classList.remove("d-none", "msg-success", "msg-error", "msg-info");
  el.classList.add(type === "success" ? "msg-success" : type === "error" ? "msg-error" : "msg-info");

  // auto hide after 4s
  msgTimer = setTimeout(() => hideMsg(el), 4000);
}

function hideMsg(el) {
  if (!el) return;
  el.classList.add("d-none");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

/* =========================
  DOM
========================= */
const emailInput = document.getElementById("editEmail");
const oldPassInput = document.getElementById("oldPassword");
const passInput = document.getElementById("editPassword");
const confirmInput = document.getElementById("confirmPassword");

const saveBtn = document.getElementById("saveProfileBtn");
const resetBtn = document.getElementById("resetBtn");
const msg = document.getElementById("profileMsg");

const sellerNameEl = document.getElementById("sellerName");
const sellerEmailText = document.getElementById("sellerEmailText");

const toggleOldBtn = document.getElementById("toggleOld");
const togglePassBtn = document.getElementById("togglePass");
const toggleConfirmBtn = document.getElementById("toggleConfirm");

const logoutBtn = document.getElementById("logoutBtn");

// keep original for reset
let originalEmail = "";

/* =========================
  UI events
========================= */
toggleOldBtn?.addEventListener("click", () => {
  if (!oldPassInput) return;
  oldPassInput.type = oldPassInput.type === "password" ? "text" : "password";
});

togglePassBtn?.addEventListener("click", () => {
  if (!passInput) return;
  passInput.type = passInput.type === "password" ? "text" : "password";
});

toggleConfirmBtn?.addEventListener("click", () => {
  if (!confirmInput) return;
  confirmInput.type = confirmInput.type === "password" ? "text" : "password";
});

resetBtn?.addEventListener("click", () => {
  hideMsg(msg);

  if (emailInput) emailInput.value = originalEmail;
  if (oldPassInput) oldPassInput.value = "";
  if (passInput) passInput.value = "";
  if (confirmInput) confirmInput.value = "";
});

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("sellerId");
  window.location.href = "../../../login.html";
});

/* =========================
  Load profile
========================= */
async function loadProfile() {
  const sellerId = getSellerId();
  if (!sellerId) {
    window.location.href = "../../../login.html";
    return;
  }

  try {
    const snap = await get(ref(db, `users/${sellerId}`));
    const seller = snap.val();

    if (!seller) return;

    originalEmail = seller.email || "";
    if (emailInput) emailInput.value = originalEmail;

    if (sellerNameEl) sellerNameEl.textContent = seller.name || "Seller";
    if (sellerEmailText) sellerEmailText.textContent = seller.email || "—";
  } catch (err) {
    console.error(err);
    showMsg(msg, "Failed to load profile", "error");
  }
}

/* =========================
  Save
========================= */
saveBtn?.addEventListener("click", async () => {
  hideMsg(msg);

  const sellerId = getSellerId();
  if (!sellerId) return;

  const newEmail = (emailInput?.value || "").trim();
  const oldPass = (oldPassInput?.value || "").trim();
  const newPass = (passInput?.value || "").trim();
  const confirmPass = (confirmInput?.value || "").trim();

  if (!isValidEmail(newEmail)) {
    showMsg(msg, "Enter a valid email", "error");
    return;
  }

  // Password change rules (بدون tips/strength)
  if (newPass) {
    if (newPass.length < 6) {
      showMsg(msg, "New password must be at least 6 characters", "error");
      return;
    }
    if (newPass !== confirmPass) {
      showMsg(msg, "Passwords do not match", "error");
      return;
    }
    if (!oldPass) {
      showMsg(msg, "Enter your current password to change it", "error");
      return;
    }
  }

  const oldText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

  try {
    // ✅ get current seller data to verify old password
    const snap = await get(ref(db, `users/${sellerId}`));
    const seller = snap.val() || {};

    if (newPass) {
      const currentDbPass = String(seller.password || "");
      if (currentDbPass !== oldPass) {
        showMsg(msg, "Current password is incorrect", "error");
        return;
      }
    }

    const updates = { email: newEmail, updatedAt: Date.now() };
    if (newPass) updates.password = newPass;

    await update(ref(db, `users/${sellerId}`), updates);

    // update localStorage
    const currentRaw = localStorage.getItem("currentUser");
    const current = currentRaw ? JSON.parse(currentRaw) : {};
    current.email = newEmail;
    localStorage.setItem("currentUser", JSON.stringify(current));

    // update hero + originals
    originalEmail = newEmail;
    if (sellerEmailText) sellerEmailText.textContent = newEmail;

    // reset password fields
    if (oldPassInput) oldPassInput.value = "";
    if (passInput) passInput.value = "";
    if (confirmInput) confirmInput.value = "";

    showMsg(msg, "Account updated successfully ✅", "success");
    // لو عايزة تفضلي على alert بدل msg شغلي السطر ده:
    // alert("Account updated successfully ✅");
  } catch (err) {
    console.error(err);
    showMsg(msg, "Update failed", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = oldText;
  }
});

loadProfile();