// ============================================================
// assets/js/checkout.js
// Task 3 — Checkout Page Logic
// (form validation, placeOrder, success screen)
// ============================================================

import { getCart, calculateTotals, placeOrder, showToast } from "./cart.js";

// ── Render order summary in checkout sidebar ──────────────────
function renderCheckoutSummary() {
  const itemsList = document.getElementById("checkout-items-list");
  if (!itemsList) return;

  const cart = getCart();
  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  itemsList.innerHTML = cart
    .map(
      (item) => `
    <div class="co-item-row">
      <span class="co-item-name">
        ${item.name} <span class="co-qty">x${item.qty}</span>
      </span>
      <span class="co-item-price">$${(item.price * item.qty).toFixed(2)}</span>
    </div>
  `,
    )
    .join("");

  const { subtotal, tax, total } = calculateTotals(cart);
  document.getElementById("co-subtotal").textContent =
    `$${subtotal.toFixed(2)}`;
  document.getElementById("co-tax").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("co-total").textContent = `$${total.toFixed(2)}`;
}

// ── Card input auto-formatting ────────────────────────────────
function setupCardFormatting() {
  const cardNumber = document.getElementById("cardNumber");
  if (cardNumber) {
    cardNumber.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "").substring(0, 16);
      e.target.value = val.replace(/(.{4})/g, "$1 ").trim();
    });
  }

  const cardExpiry = document.getElementById("cardExpiry");
  if (cardExpiry) {
    cardExpiry.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "").substring(0, 4);
      if (val.length >= 3) val = val.substring(0, 2) + "/" + val.substring(2);
      e.target.value = val;
    });
  }
}

// ── Form validation ───────────────────────────────────────────
function validateForm() {
  const fields = [
    "firstName",
    "lastName",
    "address",
    "city",
    "state",
    "zip",
    "phone",
    "cardName",
    "cardNumber",
    "cardExpiry",
    "cardCvc",
  ];

  let isValid = true;
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.add("is-invalid");
      isValid = false;
    } else {
      el.classList.remove("is-invalid");
    }
  });

  return isValid;
}

// ── Place order ───────────────────────────────────────────────
window.placeOrder = async function () {
  if (!validateForm()) {
    const first = document.querySelector(".is-invalid");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = document.getElementById("place-order-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Placing Order...`;
  }

  // Gather shipping info
  const shippingInfo = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    address: document.getElementById("address").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    zip: document.getElementById("zip").value.trim(),
    phone: document.getElementById("phone").value.trim(),
  };

  try {
    const success = await placeOrder(shippingInfo);

    if (success) {
      showSuccessPage();
    } else {
      showToast("Your cart is empty.", "warning");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-lock me-2"></i> Place Order`;
      }
    }
  } catch (err) {
    console.error("Checkout error:", err);
    const msg =
      err.message && err.message.includes("stock")
        ? err.message
        : "Something went wrong. Please try again.";
    showToast(msg, "warning");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-lock me-2"></i> Place Order`;
    }
  }
};

// ── Show success screen (image 4 style) ──────────────────────
function showSuccessPage() {
  const checkoutPage = document.getElementById("checkout-page");
  const successPage = document.getElementById("success-page");
  if (checkoutPage) checkoutPage.classList.add("d-none");
  if (successPage) successPage.classList.remove("d-none");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutSummary();
  setupCardFormatting();
});
