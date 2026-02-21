// write this code only one time to upload mu data into the firebase

//// كود الرفع المؤقت (انسخيه، شغليه، وبعدين امسحيه)
// import { db } from "./firebase.js";
// import { ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// async function seedRichData() {
//     console.log("جاري رفع البيانات الغنية...");
//     try {
//         const response = await fetch("../../data/initial-products.json"); 
//         const json = await response.json();
        
//         let updates = {};
//         json.data.forEach(item => {
//             updates[item._id] = {
//                 name: item.title,
//                 description: item.description || "No description available.",
//                 price: item.price,
//                 priceAfterDiscount: item.priceAfterDiscount || null,
//                 category: item.category.name,
//                 brand: item.brand ? item.brand.name : "Generic", // اسم الماركة
//                 imageUrl: item.imageCover, // الصورة الرئيسية
//                 gallery: item.images || [], // معرض الصور (Array)
//                 quantity: item.quantity || 100, 
//                 rating: item.ratingsAverage || 4.5,
//                 ratingsCount: item.ratingsQuantity || 0, // عدد التقييمات
//                 sold: item.sold || 0, // عدد المبيعات
//                 createdAt: Date.now(),
//                 updatedAt: Date.now()
//             };
//         });

//         await set(ref(db, 'seller-products/system_initial'), updates);
//         alert("تم رفع الداتا الغنية بنجاح! رجعي كود الـ products.js لشكله العادي.");
//     } catch (err) {
//         console.error(err);
//     }
// }
// document.addEventListener("DOMContentLoaded", seedRichData);


// assets/js/products.js

import { db } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let allProducts = [];

// ==========================================
// 1. Slide Show with truly sale value  

function renderCarousel(productsList) {
    const carouselInner = document.getElementById("carouselInner");
    const carouselElement = document.getElementById("saleCarousel");
    
    const saleProducts = productsList.filter(p => p.priceAfterDiscount && p.priceAfterDiscount < p.price).slice(0, 5);
    
    if (saleProducts.length === 0) {
        carouselElement.classList.add("d-none"); 
        return;
    }
    
    carouselElement.classList.remove("d-none"); 
    
    let html = "";
    saleProducts.forEach((p, index) => {
        const activeClass = index === 0 ? "active" : "";
        const discount = Math.round(((p.price - p.priceAfterDiscount) / p.price) * 100);
        const img = p.imageUrl || "https://via.placeholder.com/300x300?text=No+Image";
        
        html += `
        <div class="carousel-item ${activeClass}" data-bs-interval="3000">
            <div class="row align-items-center carousel-item-content">
                <div class="col-md-6 text-white mb-4 mb-md-0">
                    <span class="badge bg-danger mb-3 px-3 py-2 fs-6"> Sale -${discount}%</span>
                    <h2 class="fw-bold mb-3">${p.name}</h2>
                    <h3 class="mb-4 d-flex align-items-center">
                        <span class="text-decoration-line-through text-white-50 fs-5 me-3">$${parseFloat(p.price).toFixed(2)}</span>
                        <span class="text-warning fw-bold display-6">$${parseFloat(p.priceAfterDiscount).toFixed(2)}</span>
                    </h3>
                    <a href="product-details.html?id=${p.id}&seller=${p.sellerId}" class="btn btn-light btn-lg rounded-pill fw-bold text-primary px-5 shadow-sm text-decoration-none">
                        Shop Now <i class="fa fa-arrow-right ms-2"></i>
                    </a>
                </div>
                <div class="col-md-6 text-center">
                    <img src="${img}" class="img-fluid carousel-img" alt="${p.name}">
                </div>
            </div>
        </div>`;
    });
    
    carouselInner.innerHTML = html;
}

// ==========================================
// 2.  display products

function displayProducts(productsList) {
  const container = document.getElementById("productsContainer");
  const productCountSpan = document.getElementById("productCount");

  container.innerHTML = ""; 
  productCountSpan.textContent = productsList.length; 

  if (!productsList || productsList.length === 0) {
    container.innerHTML = `<div class="col-12 text-center py-5"><h3>No products found!</h3></div>`;
    return;
  }

  productsList.forEach((product) => {
    const shortTitle = product.name && product.name.length > 25 ? product.name.substring(0, 25) + "..." : (product.name || "Unnamed Product");
    const shortDesc = product.description && product.description.length > 50 ? product.description.substring(0, 50) + "..." : "High quality product from our trusted sellers.";
    
    const originalPrice = parseFloat(product.price || 0);
    const discountedPrice = parseFloat(product.priceAfterDiscount || 0);
    
    let priceHtml = "";
    let discountPercentHtml = "";
    let badgeHtml = "";

    if (discountedPrice > 0 && discountedPrice < originalPrice) {
      const discountPercentage = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
      priceHtml = `
        <span class="old-price">$${originalPrice.toFixed(2)}</span>
        <span class="h5 fw-bold text-dark mb-0">$${discountedPrice.toFixed(2)}</span>
      `;
      discountPercentHtml = `<span class="discount-badge">-${discountPercentage}%</span>`;
      badgeHtml = `<span class="badge-sale">Sale</span>`;
    } else {
      priceHtml = `<span class="h5 fw-bold text-dark mb-0">$${originalPrice.toFixed(2)}</span>`;
      if (product.sellerId !== "system_initial") {
          badgeHtml = `<span class="badge-new">New</span>`;
      }
    }

    const defaultImage = "https://via.placeholder.com/300x300?text=No+Image";
    const productImage = product.imageUrl || defaultImage;

    const card = `
        <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="card product-card h-100">
                
                <a href="product-details.html?id=${product.id}&seller=${product.sellerId}" class="product-image-container d-block text-decoration-none">
                    ${badgeHtml}
                    <img src="${productImage}" alt="${shortTitle}" loading="lazy">
                </a>
                
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <p class="text-muted-custom small text-uppercase fw-semibold mb-0" style="letter-spacing: 0.5px;">
                            ${product.category || "Uncategorized"}
                        </p>
                        <span class="text-warning small"><i class="fa fa-star"></i> ${product.rating || "4.5"}</span>
                    </div>

                    <a href="product-details.html?id=${product.id}&seller=${product.sellerId}" class="text-decoration-none">
                        <h5 class="card-title fw-bold text-dark mb-2" title="${product.name}">
                            ${shortTitle}
                        </h5>
                    </a>
                    
                    <p class="card-text text-muted-custom small mb-4 flex-grow-1" style="line-height: 1.6;">
                        ${shortDesc}
                    </p>
                    
                    <div class="mt-auto d-flex justify-content-between align-items-end">
                        <div>
                            <div class="d-flex align-items-center mb-1">
                                ${discountPercentHtml}
                            </div>
                            <div class="d-flex align-items-baseline">
                                ${priceHtml}
                            </div>
                        </div>
                        
                        <button onclick="window.addToCart('${product.id}')" class="btn btn-add-cart rounded-3 px-3 py-2" title="Add to Cart">
                            <i class="fa fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML += card; 
  });
}

// ==========================================
// 3. Category Filters + Search + Sort
function renderCategories() {
  const filterContainer = document.getElementById("categoryFilters");
  if (!filterContainer) return;

  const uniqueCategories = [...new Set(allProducts.map(p => p.category))].filter(Boolean);

  let html = `<button class="btn btn-outline-secondary px-3 py-1 fs-6 active" data-category="all">All</button>`;

  uniqueCategories.forEach(category => {
    html += `<button class="btn btn-outline-secondary px-3 py-1 fs-6" data-category="${category.toLowerCase()}">${category}</button>`;
  });

  filterContainer.innerHTML = html;
  setupFilters(); 
}

function filterProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const activeCategoryBtn = document.querySelector("#categoryFilters .btn.active");
  const selectedCategory = activeCategoryBtn ? activeCategoryBtn.getAttribute("data-category") : "all";
  const sortValue = document.querySelector("select.form-select").value;

  let filtered = allProducts.filter((product) => {
    const searchMatch = (product.name || "").toLowerCase().includes(searchTerm) || (product.description || "").toLowerCase().includes(searchTerm);
    const categoryMatch = selectedCategory === "all" || (product.category || "").toLowerCase() === selectedCategory;
    return searchMatch && categoryMatch;
  });

  if (sortValue === "price-asc") {
    filtered.sort((a, b) => (a.priceAfterDiscount || a.price || 0) - (b.priceAfterDiscount || b.price || 0)); 
  } else if (sortValue === "price-desc") {
    filtered.sort((a, b) => (b.priceAfterDiscount || b.price || 0) - (a.priceAfterDiscount || a.price || 0));
  }

  displayProducts(filtered);
}

function setupFilters() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.querySelector("select.form-select");
  const categoryContainer = document.getElementById("categoryFilters");

  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  newSearchInput.addEventListener("input", filterProducts);

  const newSortSelect = sortSelect.cloneNode(true);
  sortSelect.parentNode.replaceChild(newSortSelect, sortSelect);
  newSortSelect.addEventListener("change", filterProducts);

  const newCategoryContainer = categoryContainer.cloneNode(true);
  categoryContainer.parentNode.replaceChild(newCategoryContainer, categoryContainer);
  
  newCategoryContainer.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      newCategoryContainer.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      filterProducts();
    }
  });
}

// ==========================================
// 4. getting data from firebase and initialize the page

function loadProductsFromFirebase() {
  const productsRef = ref(db, 'seller-products');
  
  onValue(productsRef, (snapshot) => {
    allProducts = []; 
    
    if (snapshot.exists()) {
      const fbData = snapshot.val();
      
      for (const sellerId in fbData) {
        const sellerProducts = fbData[sellerId];
        for (const productId in sellerProducts) {
          const p = sellerProducts[productId];
          allProducts.push({
            id: productId,
            sellerId: sellerId,
            name: p.name,
            description: p.description, 
            price: p.price,
            priceAfterDiscount: p.priceAfterDiscount,
            category: p.category,
            imageUrl: p.imageUrl,
            quantity: p.quantity,
            rating: p.rating 
          });
        }
      }
      
      renderCategories(); 
      renderCarousel(allProducts); 
      displayProducts(allProducts);
    } else {
      document.getElementById("productsContainer").innerHTML = `<div class="col-12 text-center py-5"><h3>No products found!</h3></div>`;
      document.getElementById("saleCarousel").classList.add("d-none");
    }
  }, (error) => {
    console.error("Firebase read error:", error);
  });
}

document.addEventListener("DOMContentLoaded", () => {
    loadProductsFromFirebase();
});

// ==========================================
// 5. Add to Cart
window.addToCart = function(productId) {
    console.log("Adding product to cart:", productId);
    alert("Product " + productId + " clicked! Cart logic coming soon.");
};