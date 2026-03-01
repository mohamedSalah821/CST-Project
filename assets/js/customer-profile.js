// assets/js/customer-profile.js

import { db } from "./firebase.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. toastr for notifications
toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: "3000",
};

// 2. Check if user is logged in, if not redirect to login page
const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));

if (!loggedInUser) {
  window.location.href = "../../login.html";
}

// 3. getting data after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  //  fill the profile form with user data
  document.getElementById("profileName").value = loggedInUser.name || "";
  document.getElementById("profileEmail").value = loggedInUser.email || "";
  document.getElementById("profilePhone").value = loggedInUser.phone || "";
  document.getElementById("profileAddress").value = loggedInUser.address || "";

  // load customer's orders 
  loadCustomerOrders();
});

// 4. saving changes after submitting 
document.getElementById("profileForm").addEventListener("submit", (e) => {
  e.preventDefault(); // prevent the page from refreshing

  const btn = document.getElementById("saveProfileBtn");
  btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

  // getting updated values from the form
  loggedInUser.name = document.getElementById("profileName").value;
  loggedInUser.phone = document.getElementById("profilePhone").value;
  loggedInUser.address = document.getElementById("profileAddress").value;

  // saving the updated user data in localStorage
  localStorage.setItem("currentUser", JSON.stringify(loggedInUser));
  // saving the updated user data in Firebase (optional, if you want to keep it synced)
  const userRef = ref(db, `users/${loggedInUser.id}`);
  set(userRef, loggedInUser);

  // show success message 
  setTimeout(() => {
    btn.innerHTML = "Save Changes";
    toastr.success("Profile updated successfully!");

    // تحديث اسم المستخدم في الناف بار لو كان موجود
    const navName = document.getElementById("display-username");
    if (navName) navName.textContent = loggedInUser.name;
  }, 800);
});

// ==========================================
// 5. جلب سجل الطلبات من الفاير بيز
// ==========================================
function loadCustomerOrders() {
  const tableBody = document.getElementById("ordersTableBody");

  // تحويل الإيميل عشان الفاير بيز بيفهم الشَرطة السفلية بدل النقطة
  const encodedEmail = loggedInUser.email.replace(/\./g, "_");
  const ordersRef = ref(db, `orders/${encodedEmail}`);

  onValue(
    ordersRef,
    (snapshot) => {
      tableBody.innerHTML = ""; // تفريغ الجدول قبل ما نحط الداتا الجديدة

      if (snapshot.exists()) {
        const ordersData = snapshot.val();

        // ======= حفظ الأوردرات في اللوكال ستوريدج =======
        localStorage.setItem("customerOrders", JSON.stringify(ordersData));
        // ==============================================================

        let html = "";

        // اللف على كل أوردر ورسمه في الجدول
        for (const orderId in ordersData) {
          const order = ordersData[orderId];
          const badgeClass = getStatusBadge(order.status);

          // معرفة عدد العناصر اللي جوه الأوردر
          let itemsCount = 0;
          if (order.items) {
            itemsCount = Object.keys(order.items).length;
          }

          // استخدام الـ ID اللي راجع من الداتا أو جزء من الـ Key لو مش موجود
          const shortOrderId =
            order.id || `ORD-${orderId.substring(0, 5).toUpperCase()}`;

          html += `
            <tr>
                <td class="ps-3 fw-bold text-dark">
                    ${shortOrderId}
                    <small class="d-block text-muted mt-1 fw-normal">${itemsCount} Items</small>
                </td>
                <td>${order.date || "Recent"}</td>
                <td>
                    <span class="badge-status ${badgeClass}">
                        ${order.status ? order.status.toUpperCase() : "PENDING"}
                    </span>
                </td>
                <td class="text-end pe-3">
                    <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="window.viewOrderItems('${orderId}')">
                        View Items <i class="fas fa-chevron-right ms-1"></i>
                    </button>
                </td>
            </tr>
          `;
        }
        tableBody.innerHTML = html;
      } else {
        // لو مفيش أوردرات
        localStorage.removeItem("customerOrders"); // نظف اللوكال ستوريدج
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5">
                    <i class="fas fa-box-open fs-1 text-muted mb-3 d-block"></i>
                    <p class="text-muted mb-0">You haven't placed any orders yet.</p>
                </td>
            </tr>
        `;
      }
    },
    (error) => {
      console.error("Error fetching orders:", error);
      toastr.error("Failed to load orders.");
    },
  );
}

// دالة بسيطة لتحديد لون البادج بناءً على حالة الأوردر
function getStatusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "status-pending";
  if (s === "processing" || s === "shipped") return "status-shipped";
  if (s === "delivered") return "status-delivered";
  if (s === "cancelled") return "status-cancelled";
  return "status-pending";
}

// ==========================================
// 6. دالة فتح المودال وقراءة المنتجات من اللوكال ستوريدج
// ==========================================
window.viewOrderItems = function (orderId) {

  // =======  قراءة الأوردرات من اللوكال ستوريدج  =======
  const savedOrders = JSON.parse(localStorage.getItem("customerOrders")) || {};
  const order = savedOrders[orderId];
  // ==============================================================

  if (!order || !order.items) return;

  const modalBody = document.getElementById("modalItemsBody");
  const modalTotal = document.getElementById("modalGrandTotal");

  let html = "";
  let grandTotal = 0;
  const itemsList = order.items;

  itemsList.forEach((item) => {
    const price = parseFloat(item.price || 0);
    const qty = parseInt(item.qty || 1);
    const itemTotal = price * qty;

    grandTotal += itemTotal;

    html += `
        <tr>
            <td class="fw-bold text-dark">${item.name || "Product"}</td>
            <td class="text-muted">$${price.toFixed(2)}</td>
            <td class="text-center fw-semibold">${qty}</td>
            <td class="text-end text-dark fw-bold">$${itemTotal.toFixed(2)}</td>
        </tr>
    `;
  });

  // وضع الـ HTML في المودال
  modalBody.innerHTML = html;
  modalTotal.innerText = `$${grandTotal.toFixed(2)}`;

  // إظهار المودال الخاص بـ Bootstrap
  const modal = new bootstrap.Modal(document.getElementById("orderItemsModal"));
  modal.show();
};
