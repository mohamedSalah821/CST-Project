// assets/js/dashboard.js
import { db } from "../../../assets/js/firebase.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

function getSellerId() {
  return localStorage.getItem("sellerId");
}

function qs(id) {
  return document.getElementById(id);
}

// ✅ تحديث كل العناصر اللي ليها نفس الكلاس (Desktop + Mobile)
function setTextByClass(className, value) {
  document.querySelectorAll("." + className).forEach((el) => {
    el.textContent = value;
  });
}

async function loadSeller() {
  const sellerId = getSellerId();
  if (!sellerId) return;

  try {
    const snap = await get(ref(db, `users/${sellerId}`));
    const seller = snap.val();
    if (!seller) return;

    // ✅ تحديث الـ sidebar في الديسكتوب + الموبايل مع بعض
    setTextByClass("sellerNameText", seller.name || "Seller");
    setTextByClass("sellerEmailText", seller.email || "");

    // ✅ لو صفحة البروفايل فيها inputs
    if (qs("editName")) qs("editName").value = seller.name || "";
    if (qs("editEmail")) qs("editEmail").value = seller.email || "";
  } catch (e) {
    console.error("loadSeller error:", e);
  }
}

function showMsg(text) {
  const msg = qs("accountMsg");
  if (!msg) return;
  msg.textContent = text;
  msg.classList.remove("d-none");
}

function hideMsg() {
  const msg = qs("accountMsg");
  if (!msg) return;
  msg.classList.add("d-none");
}

function bindEvents() {
  const editBtn = qs("editAccountBtn");
  const saveBtn = qs("saveAccountBtn");
  const modalEl = qs("accountModal");

  // ✅ زر Edit يفتح المودال + يملأ البيانات
  editBtn?.addEventListener("click", async () => {
    await loadSeller(); // اضمن إنه يجيب أحدث داتا
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  });

  // ✅ Save
  saveBtn?.addEventListener("click", async () => {
    hideMsg();
    const sellerId = getSellerId();
    if (!sellerId) return showMsg("Please login again.");

    const name = qs("editName")?.value.trim();
    const email = qs("editEmail")?.value.trim();

    if (!name) return showMsg("Name is required.");
    if (!email || !email.includes("@")) return showMsg("Enter a valid email.");

    saveBtn.disabled = true;
    const old = saveBtn.textContent;
    saveBtn.textContent = "Saving...";

    try {
      await update(ref(db, `users/${sellerId}`), {
        name,
        email,
        updatedAt: Date.now(),
      });

      // ✅ تحديث UI فورًا (Desktop + Mobile)
      setTextByClass("sellerNameText", name);
      setTextByClass("sellerEmailText", email);

      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
    } catch (e) {
      console.error(e);
      showMsg("Update failed. Check DB Rules.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = old;
    }
  });


    // ✅ Logout buttons (Desktop + Mobile)
  const logoutDesktop = document.getElementById("logoutBtnDesktop");
  const logoutMobile = document.getElementById("logoutBtnMobile");

  logoutDesktop?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  logoutMobile?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}
function logout() {
  // امسحي بيانات الدخول
  localStorage.removeItem("sellerId");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("currentRole");
  localStorage.removeItem("currentEmail");

  // لو كنتِ خزّنتي ايميل/باسورد للسيلر قبل كده
  localStorage.removeItem("sellerEmail");
  localStorage.removeItem("sellerPassword");

  // تحويل لصفحة اللوجين (عدلي المسار حسب مشروعك)
  window.location.href ="../../../login.html";
}
export async function initSidebarAccount() {
  bindEvents();
  await loadSeller();
}