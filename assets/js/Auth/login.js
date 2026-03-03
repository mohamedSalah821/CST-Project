const FIREBASE_URL =
  "https://ecommerce-multi-actor-default-rtdb.firebaseio.com/";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("email");
  const loginPassword = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");

  // toastr setup
  toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: "toast-top-right",
    timeOut: "3000",
  };

  // ── Live validation ──────────────────────────────────────────
  function checkLoginValidity() {
    loginBtn.disabled = !(
      loginEmail.classList.contains("is-valid") &&
      loginPassword.classList.contains("is-valid")
    );
  }

  // ── Auto-redirect if already logged in ──────────────────────
  const savedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (savedUser && savedUser.role) {
    if (savedUser.role === "admin") {
      window.location.href = "pages/admin/dashboard.html";
    } else if (savedUser.role === "seller") {
      window.location.href = "pages/seller/html/seller-dashboard.html";
    } else {
      window.location.href = "index.html";
    }
    return;
  }

  // ── Email validation ─────────────────────────────────────────
  loginEmail.addEventListener("input", function () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const feedback =
      loginEmail.parentElement.querySelector(".invalid-feedback");
    if (!emailRegex.test(loginEmail.value.trim())) {
      loginEmail.classList.add("is-invalid");
      loginEmail.classList.remove("is-valid");
      feedback.innerText = "Enter a valid email";
    } else {
      loginEmail.classList.remove("is-invalid");
      loginEmail.classList.add("is-valid");
      feedback.innerText = "";
    }
    checkLoginValidity();
  });

  // ── Password validation ──────────────────────────────────────
  loginPassword.addEventListener("input", function () {
    const feedback =
      loginPassword.parentElement.querySelector(".invalid-feedback");
    if (loginPassword.value.length < 6) {
      loginPassword.classList.add("is-invalid");
      loginPassword.classList.remove("is-valid");
      feedback.innerText = "Password must be at least 6 characters";
    } else {
      loginPassword.classList.remove("is-invalid");
      loginPassword.classList.add("is-valid");
      feedback.innerText = "";
    }
    checkLoginValidity();
  });

  // ── Toggle password show/hide ────────────────────────────────
  document.querySelectorAll(".toggle-password").forEach(function (icon) {
    icon.addEventListener("click", function () {
      const input = document.getElementById(icon.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      icon.classList.toggle("fa-eye-slash");
    });
  });

  // ── Submit login ─────────────────────────────────────────────
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    btnText.classList.add("d-none");
    btnLoader.classList.remove("d-none");
    loginBtn.disabled = true;

    if (
      !loginEmail.classList.contains("is-valid") ||
      !loginPassword.classList.contains("is-valid")
    ) {
      toastr.error("Please fix the errors before login");
      btnText.classList.remove("d-none");
      btnLoader.classList.add("d-none");
      loginBtn.disabled = false;
      return;
    }

    try {
      const response = await fetch(`${FIREBASE_URL}/users.json`);
      if (!response.ok) throw new Error("Cannot fetch users");

      const users = await response.json();
      if (!users) {
        toastr.error("No users found!");
        btnText.classList.remove("d-none");
        btnLoader.classList.add("d-none");
        loginBtn.disabled = false;
        return;
      }

      const found = Object.entries(users).find(
        ([id, u]) =>
          u.email === loginEmail.value.trim() &&
          u.password === loginPassword.value,
      );

      if (!found) {
        toastr.warning("Invalid email or password");
        btnText.classList.remove("d-none");
        btnLoader.classList.add("d-none");
        loginBtn.disabled = false;
        return;
      }

      const [userId, user] = found;

      if (user.status === "blocked") {
        toastr.error("Your account has been blocked. Please contact support.");
        btnText.classList.remove("d-none");
        btnLoader.classList.add("d-none");
        loginBtn.disabled = false;
        return;
      }

      // ── Save session ─────────────────────────────────────────
      localStorage.setItem("sellerId", userId);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: userId,
          name: user.name,
          email: user.email,
          role: user.role,
        }),
      );

      // ── Load cart from Firebase into localStorage ─────────────
      if (user.role === "customer" || !user.role) {
        try {
          const cartRes = await fetch(`${FIREBASE_URL}/carts.json`);
          const cartData = await cartRes.json();
          if (cartData && typeof cartData === "object") {
            // Filter items that belong to this user
            // userId is a FK referencing users/{userId} in Firebase
            const cartArr = Object.values(cartData).filter(
              (i) => i.userId === userId,
            );
            localStorage.setItem("shopflow_cart", JSON.stringify(cartArr));
            const qty = cartArr.reduce((s, i) => s + (i.qty || 0), 0);
            localStorage.setItem("badge_cart_qty", qty);
          } else {
            localStorage.setItem("shopflow_cart", JSON.stringify([]));
            localStorage.setItem("badge_cart_qty", 0);
          }
        } catch (cartErr) {
          console.error("Cart load error:", cartErr);
          localStorage.setItem("shopflow_cart", JSON.stringify([]));
        }
      }

      toastr.success(`Welcome back, ${user.name}!`);

      // ── Redirect ──────────────────────────────────────────────
      setTimeout(function () {
        if (user.role === "admin") {
          window.location.href = "pages/admin/dashboard.html";
        } else if (user.role === "seller") {
          window.location.href = "pages/seller/html/seller-dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      }, 1500);
    } catch (error) {
      console.error(error);
      toastr.error("Login failed, try again!");
      btnText.classList.remove("d-none");
      btnLoader.classList.add("d-none");
      loginBtn.disabled = false;
    }
  });
}); // end DOMContentLoaded
