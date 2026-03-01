// assets/js/wishlist-page.js
// Handles the wishlist.html page — no changes to team code

import { db } from "./firebase.js";
import {
  ref,
  get,
  remove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { addToCart } from "./cart.js";
import { showWishToast } from "./wishlist.js";

const user = JSON.parse(localStorage.getItem("currentUser"));
const uid = localStorage.getItem("sellerId");

if (!user || !uid) {
  window.location.href = "../../login.html";
}

async function loadWishlist() {
  const loading = document.getElementById("wl-loading");
  const empty = document.getElementById("wl-empty");
  const grid = document.getElementById("wl-grid");
  const countText = document.getElementById("wl-count-text");

  try {
    const snap = await get(ref(db, `wishlists/${uid}`));
    loading.classList.add("d-none");

    if (!snap.exists()) {
      empty.classList.remove("d-none");
      countText.textContent = "0 items saved";
      return;
    }

    const items = Object.values(snap.val());
    countText.textContent = `${items.length} item${items.length !== 1 ? "s" : ""} saved`;

    // Fetch all seller products once
    const sellersSnap = await get(ref(db, "seller-products"));
    const sellersData = sellersSnap.exists() ? sellersSnap.val() : {};

    // Map each wishlist item to its full product data
    const products = items.map((item) => {
      for (const [sellerId, sellerProducts] of Object.entries(sellersData)) {
        if (sellerProducts[item.productId]) {
          return {
            ...sellerProducts[item.productId],
            id: item.productId,
            sellerId,
            found: true,
          };
        }
      }
      return { id: item.productId, found: false, name: "Product unavailable" };
    });

    grid.classList.remove("d-none");
    renderCards(products);
  } catch (err) {
    console.error("Wishlist load error:", err);
    loading.classList.add("d-none");
    empty.classList.remove("d-none");
  }
}

function renderCards(products) {
  const grid = document.getElementById("wl-grid");
  grid.innerHTML = "";

  products.forEach((p) => {
    const img =
      p.imageUrl || "https://via.placeholder.com/300x300?text=No+Image";
    const origPrice = parseFloat(p.price || 0);
    const finalPrice = p.priceAfterDiscount
      ? parseFloat(p.priceAfterDiscount)
      : origPrice;
    const hasDiscount = p.priceAfterDiscount && finalPrice < origPrice;
    const discountPct = hasDiscount
      ? Math.round(((origPrice - finalPrice) / origPrice) * 100)
      : 0;
    const detailsUrl = `product-details.html?id=${p.id}&seller=${p.sellerId || ""}`;

    const priceHtml = hasDiscount
      ? `<span class="wl-price-old me-1">$${origPrice.toFixed(2)}</span>
         <span class="wl-price-new">$${finalPrice.toFixed(2)}</span>
         <span class="badge bg-danger ms-2">-${discountPct}%</span>`
      : `<span class="wl-price-new">$${finalPrice.toFixed(2)}</span>`;

    grid.innerHTML += `
      <div class="col-12 col-md-6 col-lg-4 col-xl-3" id="wl-card-${p.id}">
        <div class="wl-card">
          <div class="wl-card-img-wrap">
            <a href="${detailsUrl}">
              <img src="${img}" alt="${p.name || ""}" loading="lazy">
            </a>
            <button class="wl-remove-btn" onclick="window.wlRemove('${p.id}')" title="Remove">
              <i class="fa-solid fa-heart"></i>
            </button>
          </div>
          <div class="wl-card-body">
            <p class="wl-card-cat">${p.category || "Product"}</p>
            <a href="${detailsUrl}" class="wl-card-name">
              ${(p.name || "Unknown").substring(0, 45)}${(p.name || "").length > 45 ? "..." : ""}
            </a>
            <div class="d-flex align-items-center flex-wrap gap-1 my-2">${priceHtml}</div>
            <button class="btn btn-wl-cart w-100 mt-auto"
              onclick="window.wlAddToCart('${p.id}')"
              ${!p.found ? "disabled" : ""}>
              <i class="fas fa-cart-plus me-2"></i> Add to Cart
            </button>
          </div>
        </div>
      </div>`;
  });
}

window.wlRemove = async function (productId) {
  try {
    await remove(ref(db, `wishlists/${uid}/${productId}`));

    const card = document.getElementById(`wl-card-${productId}`);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity = "0";
      card.style.transform = "scale(0.9)";
      setTimeout(() => card.remove(), 320);
    }

    showWishToast("Removed from wishlist", "#dc3545", "fa-heart-broken");

    setTimeout(() => {
      const remaining = document.querySelectorAll("[id^='wl-card-']").length;
      const countText = document.getElementById("wl-count-text");
      if (countText)
        countText.textContent = `${remaining} item${remaining !== 1 ? "s" : ""} saved`;
      if (remaining === 0) {
        document.getElementById("wl-grid").classList.add("d-none");
        document.getElementById("wl-empty").classList.remove("d-none");
      }
    }, 350);
  } catch (err) {
    console.error("Remove error:", err);
  }
};

window.wlAddToCart = async function (productId) {
  try {
    const sellersSnap = await get(ref(db, "seller-products"));
    if (!sellersSnap.exists()) return;
    const sellers = sellersSnap.val();
    for (const [sellerId, products] of Object.entries(sellers)) {
      if (products[productId]) {
        addToCart({ ...products[productId], id: productId, sellerId }, 1);
        return;
      }
    }
  } catch (err) {
    console.error("Add to cart error:", err);
  }
};

document.addEventListener("DOMContentLoaded", loadWishlist);
