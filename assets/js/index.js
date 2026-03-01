// assets/js/index.js

import { db } from "./firebase.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: "3000",
};

let homeProducts = [];
let uniqueCategories = new Set();

document.addEventListener("DOMContentLoaded", () => {
  loadFeaturedData();
});

// ==========================================
// 1. جلب الداتا (المنتجات والفئات)
// ==========================================
async function loadFeaturedData() {
  const productsContainer = document.getElementById("homeProductsContainer");
  const categoriesContainer = document.getElementById(
    "dynamicCategoriesContainer",
  );

  try {
    const productsRef = ref(db, "seller-products");
    const snapshot = await get(productsRef);

    if (snapshot.exists()) {
      const fbData = snapshot.val();

      for (const sellerId in fbData) {
        const sellerProducts = fbData[sellerId];
        for (const productId in sellerProducts) {
          const p = sellerProducts[productId];
          if (p.isFlagged === true || p.isFlagged === "true") continue;

          if (p.category) {
            uniqueCategories.add(p.category);
          }

          homeProducts.push({
            id: productId,
            sellerId: sellerId,
            name: p.name,
            price: parseFloat(p.price || 0),
            priceAfterDiscount: parseFloat(p.priceAfterDiscount || 0),
            imageUrl:
              p.imageUrl || "https://via.placeholder.com/300?text=No+Image",
            category: p.category,
          });
        }
      }

      renderHomeProducts(homeProducts.slice(0, 4));
      renderHomeCategories(Array.from(uniqueCategories));
    } else {
      productsContainer.innerHTML = `<div class="col-12 text-center text-muted">No products available.</div>`;
      categoriesContainer.innerHTML = `<div class="col-12 text-center text-muted">No categories available.</div>`;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    productsContainer.innerHTML = `<div class="col-12 text-center text-danger">Failed to load data.</div>`;
  }
}

// ==========================================
// 2. رسم الفئات أوتوماتيك (Dynamic Categories)
// ==========================================
function renderHomeCategories(categoriesList) {
  const container = document.getElementById("dynamicCategoriesContainer");
  if (!container) return;

  let html = "";
  const displayCategories = categoriesList.slice(0, 5);

  displayCategories.forEach((cat) => {
    const icon = getCategoryIcon(cat);
    html += `
            <div class="col-6 col-md-3 col-lg-2">
                <a href="./pages/customer/customer-products.html" class="category-pill">
                    <i class="fas ${icon}"></i>
                    <span class="text-truncate w-100 text-center" title="${cat}">${cat}</span>
                </a>
            </div>
        `;
  });

  html += `
        <div class="col-6 col-md-3 col-lg-2">
            <a href="./pages/customer/customer-products.html" class="category-pill">
                <i class="fas fa-shapes text-primary"></i>
                <span class="text-primary">View All</span>
            </a>
        </div>
    `;

  container.innerHTML = html;
}

function getCategoryIcon(categoryName) {
  const name = categoryName.toLowerCase();
  if (
    name.includes("electronic") ||
    name.includes("tech") ||
    name.includes("mobile")
  )
    return "fa-laptop";
  if (
    name.includes("fashion") ||
    name.includes("cloth") ||
    name.includes("wear") ||
    name.includes("men") ||
    name.includes("women")
  )
    return "fa-tshirt";
  if (name.includes("home") || name.includes("furniture")) return "fa-couch";
  if (name.includes("sport") || name.includes("fitness")) return "fa-dumbbell";
  if (name.includes("game") || name.includes("toy")) return "fa-gamepad";
  if (name.includes("book") || name.includes("education")) return "fa-book";
  if (name.includes("beauty") || name.includes("health")) return "fa-spa";
  return "fa-box-open";
}

// ==========================================
// 3. رسم المنتجات
// ==========================================
function renderHomeProducts(products) {
  const container = document.getElementById("homeProductsContainer");
  let html = "";

  products.forEach((p) => {
    let priceHtml = "";
    if (p.priceAfterDiscount > 0 && p.priceAfterDiscount < p.price) {
      priceHtml = `
                <span class="text-muted text-decoration-line-through me-2 fs-6">$${p.price.toFixed(2)}</span>
                <span class="fw-bold text-dark fs-5">$${p.priceAfterDiscount.toFixed(2)}</span>
            `;
    } else {
      priceHtml = `<span class="fw-bold text-dark fs-5">$${p.price.toFixed(2)}</span>`;
    }

    const shortName =
      p.name.length > 25 ? p.name.substring(0, 25) + "..." : p.name;

    html += `
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card home-product-card border-0">
                    <a href="./pages/customer/product-details.html?id=${p.id}&seller=${p.sellerId}">
                        <img src="${p.imageUrl}" class="home-product-img" alt="${shortName}">
                    </a>
                    <div class="card-body p-3">
                        <small class="text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">${p.category || "General"}</small>
                        <a href="./pages/customer/product-details.html?id=${p.id}&seller=${p.sellerId}" class="text-decoration-none">
                            <h6 class="text-dark fw-bold mt-1 mb-3" title="${p.name}">${shortName}</h6>
                        </a>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>${priceHtml}</div>


                        </div>
                    </div>
                </div>
            </div>
        `;
                                    // <button
                                    //   onclick="window.homeAddToCart('${p.id}')"
                                    //   class="btn btn-primary btn-sm rounded-circle shadow-sm"
                                    //   style="width: 35px; height: 35px;"
                                    // >
                                    //   <i class="fas fa-plus"></i>
                                    // </button>;
  });

  container.innerHTML = html;
}

// ==========================================
// 4. حماية الشراء وتوجيه زرار البيع
// ==========================================
window.homeAddToCart = function (productId) {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    toastr.warning("Please sign in to add items to your cart.");
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1500);
    return;
  }
  toastr.success("Item added! Redirecting to catalog...");
  setTimeout(() => {
    window.location.href = "./pages/customer/customer-products.html";
  }, 1500);
};

window.handleStartSelling = function () {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    toastr.info("Please sign in or register to become a seller.");
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1500);
    return;
  }
  if (user.role === "seller") {
    window.location.href = "./pages/seller/html/seller-dashboard.html";
  } else if (user.role === "admin") {
    window.location.href = "./pages/admin/dashboard.html";
  } else {
    toastr.warning(
      "You are registered as a Customer. Seller accounts require special registration.",
    );
  }
};
