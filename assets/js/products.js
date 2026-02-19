function displayProducts(productsList) {
  const container = document.getElementById("productsContainer");
  container.innerHTML = ""; // Clear loader

  if (!productsList || productsList.length === 0) {
    container.innerHTML = `<div class="text-center py-5"><h3>No products found!</h3></div>`;
    return;
  }

  productsList.forEach((product) => {
    // Only show approved products to customers
    if (product.approved) {
      // 1. تظبيط النصوص الطويلة عشان الكروت تبقى قد بعض
      const shortTitle =
        product.name.length > 25
          ? product.name.substring(0, 25) + "..."
          : product.name;
      const shortDesc =
        product.description.length > 60
          ? product.description.substring(0, 60) + "..."
          : product.description;

      // 2. تظبيط شكل السعر
      const formattedPrice = parseFloat(product.price).toFixed(2);

      const card = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card neo-card h-100">
                        <div class="card-header-img">
                            <span class="badge badge-new rounded-pill position-absolute top-0 start-0 m-4 px-3 py-2">
                                New Arrival
                            </span>
                            <img src="${product.image}" class="img-fluid" alt="${product.name}">
                        </div>
                        
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title fw-bold text-dark mb-1" title="${product.name}">
                                ${shortTitle}
                            </h5>
                            
                            <p class="text-muted-neo small mb-3 text-uppercase fw-semibold" style="letter-spacing: 1px;">
                                ${product.category}
                            </p>
                            
                            <p class="card-text text-muted-neo small mb-4" style="line-height: 1.6;">
                                ${shortDesc}
                            </p>
                            
                            <div class="mt-auto d-flex justify-content-between align-items-center">
                                <span class="h4 fw-bold text-dark mb-0">$${formattedPrice}</span>
                                
                                <button onclick="addToCart(${product.id})" class="btn btn-cart-float-neo rounded-pill px-4">
                                    Add <i class="fa fa-shopping-cart ms-2"></i>
                                </button>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                                <span class="text-warning small"><i class="fa fa-star"></i> 4.5</span>
                                <span class="text-muted-neo smaller">Free Shipping</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      container.innerHTML += card;
    }
  });
}

// Initial Load Logic with LocalStorage Check
document.addEventListener("DOMContentLoaded", () => {
  // 1. Check LocalStorage First
  const storedProducts = localStorage.getItem("neo_products");

  if (storedProducts) {
    // لو الداتا موجودة، اعرضها علطول
    displayProducts(JSON.parse(storedProducts));
  } else {
    // لو مفيش داتا، هات من الـ API
    fetch("https://fakestoreapi.com/products")
      .then((res) => res.json())
      .then((data) => {
        // Map the API data to match our structure
        const mappedProducts = data.map((item) => ({
          id: item.id,
          name: item.title,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          approved: true,
        }));

        // Save to localStorage
        localStorage.setItem("neo_products", JSON.stringify(mappedProducts));

        // Display the products
        displayProducts(mappedProducts);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        document.getElementById("productsContainer").innerHTML =
          `<div class="text-center text-danger py-5">Failed to load products. Check console.</div>`;
      });
  }
});
