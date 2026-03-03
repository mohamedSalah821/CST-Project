const FIREBASE_URL =
  "https://ecommerce-multi-actor-default-rtdb.firebaseio.com";

/**
 * دالة لتحميل الناف بار في أي صفحة
 * @param {string} rootPath - مسار الوصول للروت
 */
function loadNavbar(rootPath = "") {
  const navbarContainer = document.getElementById("navbar-placeholder");
  if (!navbarContainer) return;

  fetch(`${rootPath}components/navbar.html`)
    .then((res) => {
      if (!res.ok) throw new Error("Navbar not found");
      return res.text();
    })
    .then((htmlData) => {
      // replace the variables with the right root
      const finalHtml = htmlData.replace(/{{root}}/g, rootPath);
      navbarContainer.innerHTML = finalHtml;

      setupAuthentication(rootPath);
      highlightActiveLink();

      updateNavBadges();

      // the same functionality of updateNavBadges 
      // initCartBadge();
      // initWishlistBadge();
    })
    .catch((err) => console.error("Navbar load error:", err));
}

/* =========================================================
      ( Commented Out)
    =========================================================
// ── Badges: read from localStorage cache (instant, no Firebase wait) ──
// function initCartBadge() {
//   const badge = document.querySelector(".cart-nav-badge");
//   if (!badge) return;
//   const qty = parseInt(localStorage.getItem("badge_cart_qty") || "0", 10);
//   badge.textContent = qty;
//   badge.style.display = qty > 0 ? "inline-flex" : "none";
// }

// function initWishlistBadge() {
//   const badge = document.querySelector(".wish-nav-badge");
//   if (!badge) return;
//   const count = parseInt(localStorage.getItem("badge_wish_count") || "0", 10);
//   badge.textContent = count;
//   badge.style.display = count > 0 ? "flex" : "none";
// }
========================================================= */

// ── Auth setup ────────────────────────────────────────────────
function setupAuthentication(rootPath) {
  const guestMenu = document.getElementById("guest-menu");
  const userMenu = document.getElementById("user-menu");
  const usernameDisplay = document.getElementById("display-username");
  const profileLink = document.getElementById("profile-link");
  const logoutBtn = document.getElementById("logout-btn");

  const wishlistItem = document.getElementById("wishlist-nav-item");
  const cartItem = document.getElementById("cart-nav-item");

  const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));

  if (loggedInUser) {
    if (guestMenu) {
      guestMenu.classList.add("d-none");
      guestMenu.classList.remove("d-flex");
    }
    if (userMenu) {
      userMenu.classList.remove("d-none");
      userMenu.classList.add("d-flex");
    }

    // show username
    if (usernameDisplay) {
      usernameDisplay.textContent = loggedInUser.name || "User";
    }

    // set profile link based on role
    if (profileLink) {
      if (loggedInUser.role === "admin") {
        profileLink.href = `${rootPath}pages/admin/admin-profile.html`;
      } else if (loggedInUser.role === "seller") {
        profileLink.href = `${rootPath}pages/seller/html/profile.html`;
      } else {
        profileLink.href = `${rootPath}pages/customer/customer-profile.html`;
      }
    }

    // Show Cart & Wishlist only for customers
    if (wishlistItem && cartItem) {
      if (loggedInUser.role === "seller" || loggedInUser.role === "admin") {
        wishlistItem.classList.add("d-none");
        cartItem.classList.add("d-none");
      } else {
        wishlistItem.classList.remove("d-none");
        cartItem.classList.remove("d-none");
      }
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        // Clear session & cart cache
        localStorage.removeItem("currentUser");
        localStorage.removeItem("sellerId");
        localStorage.removeItem("shopflow_cart");
        window.location.href = `${rootPath}login.html`;
      });
    }
  }
}

// ── Active link highlight ─────────────────────────────────────
function highlightActiveLink() {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-item-link").forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (
      currentPath.includes(linkPath) ||
      (currentPath === "/" && linkPath.includes("index.html"))
    ) {
      link.classList.add("active", "text-primary");
    } else {
      link.classList.remove("active", "text-primary");
    }
  });
}

// update the badges in all pages
function updateNavBadges() {
  const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));

  // 1. update cart badge
  const cartBadge = document.querySelector(".cart-nav-badge");
  if (cartBadge) {
    const cartData = JSON.parse(localStorage.getItem("shopflow_cart")) || [];
    let totalItems = 0;

    cartData.forEach((item) => {
      totalItems += parseInt(item.qty || item.quantity || 1);
    });

    if (totalItems > 0) {
      cartBadge.style.display = "flex";
      cartBadge.textContent = totalItems;
    } else {
      cartBadge.style.display = "none";
    }
  }

  // 2. update wishlist
  const wishBadge = document.querySelector(".wish-nav-badge");
  if (wishBadge) {
    if (loggedInUser && loggedInUser.id) {
      fetch(`${FIREBASE_URL}/wishlists/${loggedInUser.id}.json`)
        .then((res) => res.json())
        .then((data) => {
          const wishCount = data ? Object.keys(data).length : 0;
          if (wishCount > 0) {
            wishBadge.style.display = "flex";
            wishBadge.textContent = wishCount;
          } else {
            wishBadge.style.display = "none";
          }
        })
        .catch((err) => console.error("Error fetching wishlist:", err));
    } else {
      wishBadge.style.display = "none";
    }
  }
}

// make the function as global to can add it in any page
window.updateNavBadges = updateNavBadges;
