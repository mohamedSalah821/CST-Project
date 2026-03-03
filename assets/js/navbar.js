function loadNavbar(rootPath = "") {
  const navbarContainer = document.getElementById("navbar-placeholder");
  if (!navbarContainer) return;

  fetch(`${rootPath}components/navbar.html`)
    .then((res) => {
      if (!res.ok) throw new Error("Navbar not found");
      return res.text();
    })
    .then((html) => {
      navbarContainer.innerHTML = html.replace(/{{root}}/g, rootPath);
      setupAuthentication(rootPath);
      highlightActiveLink();
      initCartBadge();
      initWishlistBadge();
    })
    .catch((err) => console.error("Navbar load error:", err));
}

// ── Badges: read from localStorage cache (instant, no Firebase wait) ──
function initCartBadge() {
  const badge = document.querySelector(".cart-nav-badge");
  if (!badge) return;
  const qty = parseInt(localStorage.getItem("badge_cart_qty") || "0", 10);
  badge.textContent = qty;
  badge.style.display = qty > 0 ? "inline-flex" : "none";
}

function initWishlistBadge() {
  const badge = document.querySelector(".wish-nav-badge");
  if (!badge) return;
  const count = parseInt(localStorage.getItem("badge_wish_count") || "0", 10);
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

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
    guestMenu.classList.add("d-none");
    guestMenu.classList.remove("d-flex");
    userMenu.classList.remove("d-none");
    userMenu.classList.add("d-flex");

    if (usernameDisplay)
      usernameDisplay.textContent = loggedInUser.name || "User";

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
    if (loggedInUser.role === "customer" || !loggedInUser.role) {
      if (wishlistItem) wishlistItem.classList.remove("d-none");
      if (cartItem) cartItem.classList.remove("d-none");
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        // Clear session
        localStorage.removeItem("currentUser");
        localStorage.removeItem("sellerId");
        // Clear cart cache
        localStorage.removeItem("shopflow_cart");
        localStorage.setItem("badge_cart_qty", 0);
        localStorage.setItem("badge_wish_count", 0);
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
