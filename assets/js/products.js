let allProducts = [];

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
    if (product.approved) {
      const shortTitle =
        product.name.length > 25
          ? product.name.substring(0, 25) + "..."
          : product.name;
      const shortDesc =
        product.description.length > 60
          ? product.description.substring(0, 60) + "..."
          : product.description;
      const formattedPrice = parseFloat(product.price).toFixed(2); 

      let badgeHtml = "";
      const randomValue = Math.random();
      if (randomValue < 0.2) {
        badgeHtml = `<span class="badge badge-new rounded-pill position-absolute top-0 start-0 m-4 px-3 py-2">New Arrival</span>`;
      } else if (randomValue > 0.8) {
        badgeHtml = `<span class="badge badge-sale rounded-pill position-absolute top-0 start-0 m-4 px-3 py-2">Sale</span>`;
      }

      const card = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card product-card h-100">
                        <div class="product-image-container">
                            ${badgeHtml}
                            <img src="${product.image}" class="img-fluid" alt="${product.name}">
                        </div>
                        
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title fw-bold text-dark mb-1" title="${product.name}">
                                ${shortTitle}
                            </h5>
                            
                            <p class="text-muted-custom small mb-3 text-uppercase fw-semibold" style="letter-spacing: 1px;">
                                ${product.category}
                            </p>
                            
                            <p class="card-text text-muted-custom small mb-4" style="line-height: 1.6;">
                                ${shortDesc}
                            </p>
                            
                            <div class="mt-auto d-flex justify-content-between align-items-center">
                                <span class="h4 fw-bold text-dark mb-0">$${formattedPrice}</span>
                                
                                <button onclick="addToCart(${product.id})" class="btn btn-add-cart rounded-pill px-4">
                                    Add <i class="fa fa-shopping-cart ms-2"></i>
                                </button>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                                <span class="text-warning small"><i class="fa fa-star"></i> ${product.rating ? product.rating.rate : "4.5"}</span>
                                <span class="text-muted-custom smaller">Free Shipping</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      container.innerHTML += card; 
    }
  });
}

function filterProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const activeCategoryBtn = document.querySelector(
    "#categoryFilters .btn.active",
  );
  const selectedCategory = activeCategoryBtn
    ? activeCategoryBtn.getAttribute("data-category")
    : "all";

  const sortValue = document.querySelector("select.form-select").value;

  let filtered = allProducts.filter((product) => {
    const searchMatch =
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm);
    const categoryMatch =
      selectedCategory === "all" || product.category === selectedCategory;
    return searchMatch && categoryMatch && product.approved;
  });

  if (sortValue === "price-asc") {
    filtered.sort((a, b) => a.price - b.price); 
  } else if (sortValue === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  displayProducts(filtered);
}

function setupFilters() {
  document
    .getElementById("searchInput")
    .addEventListener("input", filterProducts);

  document
    .querySelector("select.form-select")
    .addEventListener("change", filterProducts);

  const categoryBtns = document.querySelectorAll("#categoryFilters .btn");
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      categoryBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      filterProducts();
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const storedProducts = localStorage.getItem("products");

  if (storedProducts) {
    allProducts = JSON.parse(storedProducts);
    setupFilters();
    displayProducts(allProducts);
  } else {
    fetch("https://fakestoreapi.com/products")
      .then((res) => res.json())
      .then((data) => {
        allProducts = data.map((item) => ({
          id: item.id,
          name: item.title,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          rating: item.rating,
          approved: true, 
        }));

        localStorage.setItem("products", JSON.stringify(allProducts));

        setupFilters();
        displayProducts(allProducts);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        document.getElementById("productsContainer").innerHTML =
          `<div class="col-12 text-center text-danger py-5">Failed to load products. Check console.</div>`;
      });
  }
});
