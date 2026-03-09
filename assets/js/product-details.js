// assets/js/product-details.js

import { db } from "./firebase.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { addToCart, showToast } from "./cart.js";
import { toggleWishHeart, isInWishlist } from "./wishlist.js";

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
const sellerId = urlParams.get("seller");

const container = document.getElementById("productDetailsContainer");
const breadcrumb = document.getElementById("breadcrumb");

let currentProduct = null; // stores the loaded product for addToCart use

// 1. دالة لجلب تفاصيل المنتج
async function loadProductDetails() {
  if (!productId || !sellerId) {
    container.innerHTML = `<div class="alert alert-danger text-center">Invalid Product Link.</div>`;
    return;
  }

  try {
    const productRef = ref(db, `seller-products/${sellerId}/${productId}`);
    const snapshot = await get(productRef);

    if (snapshot.exists()) {
      const product = snapshot.val();
      currentProduct = { id: productId, sellerId, ...product }; // save for cart use
      renderProduct(product, productId);
      // Check if already wishlisted
      isInWishlist(productId).then((already) => {
        if (already) {
          const btn = document.getElementById("detail-wish-btn");
          if (btn) {
            btn.classList.add("wishlisted");
            btn.querySelector("i").className = "fa-solid fa-heart fs-4";
          }
        }
      });
    } else {
      container.innerHTML = `<div class="alert alert-warning text-center">Product not found. It may have been removed.</div>`;
    }
  } catch (error) {
    console.error("Error:", error);
    container.innerHTML = `<div class="alert alert-danger text-center">Error loading details.</div>`;
  }
}

// 2. دالة رسم الصفحة
function renderProduct(p, pId) {
  // تحديث مسار الصفحة
  breadcrumb.innerHTML = `
        <li class="breadcrumb-item"><a href="customer-products.html" class="text-decoration-none">Catalog</a></li>
        <li class="breadcrumb-item"><span class="text-capitalize">${p.category || p.categoryName || "General"}</span></li>
        <li class="breadcrumb-item active fw-bold text-dark" aria-current="page">${(p.name || "Product").substring(0, 30)}...</li>
    `;

  // price and discount logic
  const originalPrice = parseFloat(p.price || 0);
  let discountedPrice = p.priceAfterDiscount
    ? parseFloat(p.priceAfterDiscount)
    : null;

  let priceHtml = "";
  if (discountedPrice && discountedPrice < originalPrice) {
    const discount = Math.round(
      ((originalPrice - discountedPrice) / originalPrice) * 100,
    );
    priceHtml = `
            <div class="d-flex align-items-center mb-1">
                <h2 class="fw-bold text-danger mb-0 me-3">$${discountedPrice.toFixed(2)}</h2>
                <span class="badge bg-danger">-${discount}% OFF</span>
            </div>
            <p class="text-muted text-decoration-line-through mb-0 fs-5">MSRP: $${originalPrice.toFixed(2)}</p>
        `;
  } else {
    priceHtml = `<h2 class="fw-bold text-dark mb-0">$${originalPrice.toFixed(2)}</h2>`;
  }

  // ==========================================
  // placeholder image logic & Data Normalization
  let galleryImages = [];

  if (p.imageUrl) galleryImages.push(p.imageUrl);

  if (p.gallery && Array.isArray(p.gallery)) {
    galleryImages = [...galleryImages, ...p.gallery];
  }

  if (p.imageUrls) {
    const newImages = Array.isArray(p.imageUrls)
      ? p.imageUrls
      : Object.values(p.imageUrls);
    galleryImages = [...galleryImages, ...newImages];
  }

  galleryImages = [...new Set(galleryImages)];

  if (galleryImages.length === 0) {
    galleryImages.push("https://via.placeholder.com/600x600?text=No+Image");
  }

  const mainImg = galleryImages[0];
  // ==========================================

  let galleryHtml = "";
  galleryImages.forEach((img, index) => {
    const activeClass = index === 0 ? "active" : "";
    galleryHtml += `
            <div class="thumbnail-wrapper ${activeClass}" onclick="window.changeMainImage(this, '${img}')">
                <img src="${img}" alt="thumbnail">
            </div>
        `;
  });

  // ==========================================

  // 1. discription
  const descriptionText =
    p.description && p.description !== "undefined"
      ? p.description
      : "No description available for this product at the moment.";

  // reviews
  let reviewsHtml = "";
  if (p.reviews && Array.isArray(p.reviews) && p.reviews.length > 0) {
    // if the seller has reviews and it's an array with at least one review
    p.reviews.forEach((review) => {
      reviewsHtml += `
                <div class="mb-3 p-3 bg-light rounded-3 border">
                    <div class="text-warning mb-2 small"><i class="fa fa-star"></i> <i class="fa fa-star"></i> <i class="fa fa-star"></i> <i class="fa fa-star"></i> <i class="fa fa-star"></i></div>
                    <p class="mb-0 text-dark" style="font-size: 0.95rem;">"${review.text || review}"</p>
                    <small class="text-muted mt-2 d-block">- Verified Buyer</small>
                </div>
            `;
    });
  } else {
    // if there is no reviews or the reviews field is undefined
    reviewsHtml = `
            <div class="text-center p-4 bg-light rounded-3 border border-dashed">
                <i class="far fa-comment-dots fs-1 text-muted mb-2"></i>
                <p class="text-muted fst-italic mb-0">No written reviews yet. Be the first to review this product!</p>
            </div>
        `;
  }

  container.innerHTML = `
        <div class="row g-5">
            <div class="col-lg-6">
                <div class="main-img-wrapper shadow-sm">
                    <img id="mainProductImage" src="${mainImg}" alt="${p.name}">
                </div>
                <div class="d-flex gap-3 mt-3 overflow-auto pb-2">
                    ${galleryHtml}
                </div>
            </div>

            <div class="col-lg-6">
                <div class="d-flex align-items-center mb-3 gap-3">
                    <span class="brand-badge"><i class="fas fa-tag me-1"></i> ${p.brand || "BLUE LINK"}</span>                    <span class="text-warning fw-bold"><i class="fas fa-star"></i> ${p.rating || "4.5"} <span class="text-muted fw-normal">(${p.ratingsCount || 0} ratings)</span></span>
                    <span class="text-success fw-bold"><i class="fas fa-shopping-basket"></i> ${p.sold || Math.floor(Math.random() * 100)} sold</span>
                </div>

                <h1 class="product-title display-6">${p.name || "Product Name"}</h1>
                <p class="text-muted fs-5 mt-3 text-capitalize">${p.category || p.categoryName || "General"}</p>

                <div class="price-box shadow-sm">
                    ${priceHtml}
                </div>

                <div class="mt-4">
                    <label class="fw-bold mb-2">Quantity:</label>
                    <div class="input-group" style="width: 140px;">
                        <button class="btn btn-outline-secondary px-3" type="button" onclick="window.updateQty(-1)">-</button>
                        <input type="text" id="qtyInput" class="form-control text-center fw-bold" value="1" readonly>
                        <button class="btn btn-outline-secondary px-3" type="button" onclick="window.updateQty(1)">+</button>
                    </div>
                    ${
                      Number(p.quantity) === 0
                        ? `<small class="text-danger fw-bold d-block mt-2">0 items left in stock</small>`
                        : `<small class="text-muted d-block mt-2">${p.quantity || p.qty || "Few"} items left in stock</small>`
                    }
                </div>

                <div class="mt-5 d-flex gap-3">
                    <button class="btn btn-add-huge flex-grow-1" onclick="window.addToCartFromDetails()">
                        <i class="fas fa-cart-plus me-2"></i> Add to Cart
                    </button>
                    <button id="detail-wish-btn" class="wish-btn btn btn-outline-danger px-4 rounded-3" data-pid="${pId}" onclick="window.toggleWishHeart(this,'${pId}')" title="Add to Wishlist">
                        <i class="fa-regular fa-heart fs-4"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="row mt-5 pt-5 border-top">
            <div class="col-lg-7 mb-4 mb-lg-0">
                <h3 class="fw-bold mb-4">Product Description</h3>
                <p class="text-muted" style="line-height: 1.8; font-size: 1.05rem; white-space: pre-line;">${descriptionText}</p>
            </div>
            <div class="col-lg-5">
                <h3 class="fw-bold mb-4">Customer Reviews</h3>
                <div class="reviews-container">
                    ${reviewsHtml}
                </div>
            </div>
        </div>
    `;
}

// 3. change Main Image
window.changeMainImage = function (element, imgUrl) {
  document.getElementById("mainProductImage").src = imgUrl;
  document
    .querySelectorAll(".thumbnail-wrapper")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
};

window.updateQty = function (change) {
  const input = document.getElementById("qtyInput");
  let currentVal = parseInt(input.value);
  let newVal = currentVal + change;
  const stock = currentProduct ? Number(currentProduct.quantity) : 10;

  if (newVal >= 1 && newVal <= stock) {
    input.value = newVal;
  }
};

window.addToCartFromDetails = function () {
  const qty = parseInt(document.getElementById("qtyInput").value);

  if (!currentProduct) return;

  // If not logged in, redirect to login
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  // Block if out of stock
  if (Number(currentProduct.quantity) <= 0) {
    showToast(`"${currentProduct.name}" is out of stock.`, "warning");
    return;
  }

  // Call the real addToCart from cart.js
  addToCart(currentProduct, qty);

  // Show success modal (window.bootstrap works across module boundary)
  const msgEl = document.getElementById("modal-cart-msg");
  if (msgEl)
    msgEl.textContent =
      qty + ' x "' + currentProduct.name + '" added to your cart.';
  const modalEl = document.getElementById("addToCartModal");
  if (modalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
};

document.addEventListener("DOMContentLoaded", loadProductDetails);
