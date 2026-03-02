const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// ==================== Protect Pages ====================
function requireAuth(allowedRoles = []) {

  if (!currentUser) {
    
      window.location.href = "../../../login.html";
    alert("Please login first");
    
    return;
  }

  if (!allowedRoles.includes(currentUser.role)) {
      window.location.href = "../../../login.html";
    alert("Access denied");

    return;
  }
}

// ==================== Prevent Login Page Access ====================
function redirectIfLoggedIn() {
  if (!currentUser) return;

  if (currentUser.role === "admin") {
    window.location.href = "../../../pages/admin/dashboard.html";
  } else if (currentUser.role === "seller") {
    window.location.href = "../../../pages/seller/html/seller-dashboard.html";
  } else {
    window.location.href = "../../../pages/customer/customer-products.html";
  }
}