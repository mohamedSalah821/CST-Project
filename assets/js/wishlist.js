// assets/js/wishlist.js
// ── Wishlist module ─────────────────────────────────────────────
// Uses:
//   localStorage "currentUser"  → { name, email, role }
//   localStorage "sellerId"     → the Firebase user key (uid)
// Firebase path: wishlists/{uid}/{productId} = { productId, userId, addedAt }

import { db } from "./firebase.js";
import {
  ref,
  set,
  get,
  remove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ── Helpers ──────────────────────────────────────────────────────
function getUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}
function getUid() {
  return localStorage.getItem("sellerId");
}

function itemRef(uid, productId) {
  return ref(db, `wishlists/${uid}/${productId}`);
}
function userRef(uid) {
  return ref(db, `wishlists/${uid}`);
}

// ── Toast (same visual as cart-toast) ────────────────────────────
export function showWishToast(message, color = "#007bff", icon = "fa-heart") {
  const old = document.getElementById("wish-toast");
  if (old) old.remove();

  const t = document.createElement("div");
  t.id = "wish-toast";
  t.className = "wish-toast";
  t.style.borderLeftColor = color;
  t.innerHTML = `<i class="fas ${icon} me-2" style="color:${color}"></i>${message}`;
  document.body.appendChild(t);

  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 350);
  }, 2800);
}

// ── Add / Remove ─────────────────────────────────────────────────
export async function addToWishlist(productId) {
  const uid = getUid();
  await set(itemRef(uid, productId), {
    productId,
    userId: uid,
    addedAt: Date.now(),
  });
}

export async function removeFromWishlist(productId) {
  const uid = getUid();
  await remove(itemRef(uid, productId));
}

export async function isInWishlist(productId) {
  const uid = getUid();
  if (!uid) return false;
  const snap = await get(itemRef(uid, productId));
  return snap.exists();
}

export async function getAllWishlistItems() {
  const uid = getUid();
  if (!uid) return [];
  const snap = await get(userRef(uid));
  if (!snap.exists()) return [];
  return Object.values(snap.val());
}

// ── Toggle heart button (used from product cards + details) ──────
export async function toggleWishHeart(btn, productId) {
  const user = getUser();
  const uid = getUid();

  // Not logged in → redirect to login
  if (!user || !uid) {
    // Detect root depth
    const depth = window.location.pathname.split("/").filter(Boolean).length;
    const root = depth <= 1 ? "" : "../".repeat(depth - 1);
    window.location.href = `${root}login.html`;
    return;
  }

  const wishlisted = btn.classList.contains("wishlisted");

  if (wishlisted) {
    await removeFromWishlist(productId);
    btn.classList.remove("wishlisted");
    btn.querySelector("i").className = "fa-regular fa-heart";
    showWishToast("Removed from wishlist", "#dc3545", "fa-heart-broken");
    adjustNavBadge(-1);
  } else {
    await addToWishlist(productId);
    btn.classList.add("wishlisted");
    btn.querySelector("i").className = "fa-solid fa-heart";
    showWishToast("Added to wishlist!", "#007bff", "fa-heart");
    adjustNavBadge(+1);
  }
}

// ── Mark hearts already in wishlist on page load ─────────────────
export async function initWishHearts() {
  const uid = getUid();
  if (!uid) return;

  const buttons = document.querySelectorAll(".wish-btn[data-pid]");
  if (buttons.length === 0) return;

  const items = await getAllWishlistItems();
  const pidSet = new Set(items.map((i) => i.productId));

  buttons.forEach((btn) => {
    if (pidSet.has(btn.dataset.pid)) {
      btn.classList.add("wishlisted");
      btn.querySelector("i").className = "fa-solid fa-heart";
    }
  });

  // Update navbar badge count
  const badge = document.querySelector(".wish-nav-badge");
  if (badge && pidSet.size > 0) {
    badge.textContent = pidSet.size;
    badge.style.display = "flex";
  }
}

// ── Adjust navbar badge by delta ─────────────────────────────────
function adjustNavBadge(delta) {
  const badge = document.querySelector(".wish-nav-badge");
  if (!badge) return;
  const current = parseInt(badge.textContent) || 0;
  const next = Math.max(0, current + delta);
  badge.textContent = next;
  badge.style.display = next > 0 ? "flex" : "none";
}

// ── Expose to window (called from inline onclick) ─────────────────
window.toggleWishHeart = async function (btn, productId) {
  await toggleWishHeart(btn, productId);
};
