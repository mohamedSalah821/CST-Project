// ============================================================
// assets/js/cart.js  —  Task 3: Cart & Transactions
//
// Firebase structure:
//   carts/{productId} = { ...productData, qty, userId }
//
// On addToCart: save to localStorage + write to Firebase with userId
// On login (login.js): fetch all carts, filter by userId, write to localStorage
// On logout (navbar.js): remove shopflow_cart from localStorage
// ============================================================

import { db } from "./firebase.js";
import {
  ref,
  set,
  get,
  remove,
  push,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const CART_KEY = "shopflow_cart";
const TAX_RATE = 0.08;

// ── Helpers ───────────────────────────────────────────────────
function getUid() {
  const user = getUser();
  return user?.id || null; // FK → users/{id} in Firebase
}
function getUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

// ── localStorage helpers ──────────────────────────────────────
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}
function saveLocal(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const qty = cart.reduce((s, i) => s + i.qty, 0);
  localStorage.setItem("badge_cart_qty", qty);
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
  localStorage.setItem("badge_cart_qty", qty);
  const badge = document.querySelector(".cart-nav-badge");
  if (!badge) return;
  badge.textContent = qty;
  badge.style.display = qty > 0 ? "inline-flex" : "none";
}

// ── addToCart ─────────────────────────────────────────────────
export async function addToCart(product, qty = 1) {
  const user = getUser();
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  const uid = getUid();
  const cart = getCart();
  const index = cart.findIndex((i) => i.id === product.id);

  if (index !== -1) {
    cart[index].qty += qty;
  } else {
    cart.push({
      id: product.id,
      userId: uid, // ← userId stored in item
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

  saveLocal(cart);
  updateNavBadge();
  showToast(`"${product.name}" added to cart successfully!`);

  // Sync to Firebase: carts/{productId} with userId inside the object
  const item = cart.find((i) => i.id === product.id);
  set(ref(db, `carts/${product.id}`), item).catch(console.error);
}

// ── removeFromCart ────────────────────────────────────────────
function removeFromCart(productId) {
  const cart = getCart().filter((i) => i.id !== productId);
  saveLocal(cart);
  updateNavBadge();
  renderCartPage();

  // Remove from Firebase
  remove(ref(db, `carts/${productId}`)).catch(console.error);
}

// ── updateQty ─────────────────────────────────────────────────
function updateQty(productId, change) {
  const cart = getCart();
  const index = cart.findIndex((i) => i.id === productId);
  if (index === -1) return;

  cart[index].qty += change;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
    remove(ref(db, `carts/${productId}`)).catch(console.error);
  } else {
    set(ref(db, `carts/${productId}`), cart[index]).catch(console.error);
  }

  saveLocal(cart);
  updateNavBadge();
  renderCartPage();
}

// ── clearCart ─────────────────────────────────────────────────
function clearCart() {
  const modal = new bootstrap.Modal(document.getElementById("clearCartModal"));
  modal.show();

  document.getElementById("confirm-clear-btn").onclick = async function () {
    const uid = getUid();
    const cart = getCart();

    // Remove each item that belongs to this user from Firebase
    for (const item of cart) {
      if (item.userId === uid) {
        remove(ref(db, `carts/${item.id}`)).catch(console.error);
      }
    }

    saveLocal([]);
    updateNavBadge();
    renderCartPage();
    modal.hide();
  };
}

// ── renderCartPage (runs only on cart.html) ───────────────────
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
      <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img"
           onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'"/>
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

// ── placeOrder (called by checkout.js) ───────────────────────
export async function placeOrder(shippingInfo) {
  const cart = getCart();
  if (!cart.length) return false;

  const user = getUser();
  const uid = getUid();
  const safeId = (user?.id || user?.email || "guest").replace(/[.#$[\]]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];

  const order = {
    id: "",
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

  const newRef = await push(ref(db, `orders/${safeId}`), order);
  const shortId = "ORD-" + newRef.key.substring(1, 9).toUpperCase();
  await set(ref(db, `orders/${safeId}/${newRef.key}/id`), shortId);

  // Remove this user's cart items from Firebase
  for (const item of cart) {
    await remove(ref(db, `carts/${item.id}`));
  }

  saveLocal([]);
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

// ── expose to window ──────────────────────────────────────────
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;

// ── init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateNavBadge();
  renderCartPage();
});
