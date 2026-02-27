// ============================================================
// assets/js/cart.js  —  Task 3: Cart & Transactions
// ============================================================

import { db } from "./firebase.js";
import {
  ref,
  push,
  set,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const CART_KEY = "shopflow_cart";
const TAX_RATE = 0.08;

// ── read / write localStorage ─────────────────────────────────
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}
export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateNavBadge();
}
export function calculateTotals(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax, total };
}

// ── navbar badge ──────────────────────────────────────────────
function updateNavBadge() {
  const qty = getCart().reduce((s, i) => s + i.qty, 0);
  const badge = document.querySelector(".cart-nav-badge");
  if (!badge) return;
  badge.textContent = qty;
  badge.style.display = qty > 0 ? "inline-flex" : "none";
}

// ── addToCart ─────────────────────────────────────────────────
// product object is passed directly from products.js — NO Firebase fetch needed
export function addToCart(product, qty = 1) {
  // Not logged in → redirect to login
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  const cart = getCart();
  const existingIndex = cart.findIndex((item) => item.id === product.id);

  if (existingIndex !== -1) {
    // already in cart → just increase qty
    cart[existingIndex].qty += qty;
  } else {
    cart.push({
      id: product.id,
      sellerId: product.sellerId || "",
      name: product.name || "Product",
      brand: product.brand || "",
      price: product.priceAfterDiscount
        ? parseFloat(product.priceAfterDiscount)
        : parseFloat(product.price || 0),
      imageUrl:
        product.imageUrl || "https://via.placeholder.com/80x80?text=No+Image",
      category: product.category || "",
      qty,
    });
  }

  saveCart(cart);
  showToast(`"${product.name}" added to cart successfully!`);
}

// ── removeFromCart ────────────────────────────────────────────
function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.id !== productId));
  renderCartPage();
}

// ── updateQty ─────────────────────────────────────────────────
function updateQty(productId, change) {
  const cart = getCart();
  const index = cart.findIndex((i) => i.id === productId);
  if (index === -1) return;
  cart[index].qty += change;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart(cart);
  renderCartPage();
}

// ── clearCart ─────────────────────────────────────────────────
function clearCart() {
  // Show Bootstrap modal instead of browser confirm()
  const modal = new bootstrap.Modal(document.getElementById("clearCartModal"));
  modal.show();

  // Confirm button inside modal does the actual clearing
  document.getElementById("confirm-clear-btn").onclick = function () {
    localStorage.removeItem(CART_KEY);
    updateNavBadge();
    renderCartPage();
    modal.hide();
  };
}

// ── renderCartPage  (runs on cart.html) ───────────────────────
function renderCartPage() {
  const emptyState = document.getElementById("empty-state");
  const hasItems = document.getElementById("cart-has-items");
  const subtitle = document.getElementById("cart-subtitle");
  const itemsList = document.getElementById("cart-items-list");
  if (!emptyState || !hasItems) return;

  const cart = getCart();

  if (cart.length === 0) {
    emptyState.classList.remove("d-none");
    hasItems.classList.add("d-none");
    if (subtitle) subtitle.textContent = "Your cart is empty";
    return;
  }

  emptyState.classList.add("d-none");
  hasItems.classList.remove("d-none");

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  if (subtitle)
    subtitle.textContent = `${totalQty} item${totalQty !== 1 ? "s" : ""} in your cart`;

  itemsList.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item-card">
      <img
        src="${item.imageUrl}"
        alt="${item.name}"
        class="cart-item-img"
        onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'"
      />
      <div class="cart-item-body">
        <div class="cart-item-top">
          <p class="cart-item-name">${item.name}</p>
          <button class="btn-remove" onclick="window.removeFromCart('${item.id}')" title="Remove">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <p class="cart-item-brand">${item.brand || item.category || ""}</p>
        <div class="cart-item-bottom">
          <div class="qty-controls">
            <button class="qty-btn" onclick="window.updateQty('${item.id}', -1)">
              <i class="fas fa-minus"></i>
            </button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" onclick="window.updateQty('${item.id}', 1)">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <span class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  const { subtotal, tax, total } = calculateTotals(cart);
  document.getElementById("summary-subtotal").textContent =
    `$${subtotal.toFixed(2)}`;
  document.getElementById("summary-tax").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("summary-total").textContent = `$${total.toFixed(2)}`;
}

// ── placeOrder (used by checkout.js) ─────────────────────────
// Order structure matches exactly:
// { id, customer, date, status, address, items: [{name, price, qty}] }
export async function placeOrder(shippingInfo) {
  const cart = getCart();
  if (!cart.length) return false;

  const user = JSON.parse(localStorage.getItem("currentUser"));
  const safeId = (user?.id || user?.email || "guest").replace(/[.#$[\]]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];

  // Build order matching the required structure exactly
  const order = {
    id: "", // filled in after push
    customer:
      user?.name || `${shippingInfo.firstName} ${shippingInfo.lastName}`,
    date: dateStr,
    status: "pending",
    address: `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state}`,
    items: cart.map((i) => ({
      name: i.name,
      price: parseFloat((i.price * i.qty).toFixed(2)),
      qty: i.qty,
      sellerId: i.sellerId || "",
    })),
  };

  // Push to Firebase: orders/{customerId}/{autoId}
  const newRef = await push(ref(db, `orders/${safeId}`), order);
  const shortId = "ORD-" + newRef.key.substring(1, 9).toUpperCase();

  // Write the generated id back into the same node
  await set(ref(db, `orders/${safeId}/${newRef.key}/id`), shortId);

  localStorage.removeItem(CART_KEY);
  updateNavBadge();
  return true;
}

// ── Toast ─────────────────────────────────────────────────────
export function showToast(message, type = "success") {
  const old = document.getElementById("cart-toast");
  if (old) old.remove();

  const color = type === "warning" ? "#f59e0b" : "#28a745";
  const icon = type === "warning" ? "fa-exclamation-circle" : "fa-check-circle";

  const toast = document.createElement("div");
  toast.id = "cart-toast";
  toast.className = "cart-toast";
  toast.style.borderLeftColor = color;
  toast.innerHTML = `<i class="fas ${icon} me-2" style="color:${color}"></i>${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

// ── expose to window (for onclick attributes in HTML) ─────────
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;

// ── init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateNavBadge();
  renderCartPage();
});
