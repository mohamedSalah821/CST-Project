 const FIREBASE_URL = "https://ecommerce-multi-actor-default-rtdb.firebaseio.com/";
// ------------------------------------------------ Login  part ---------------------------------------

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
  timeOut: "3000"
};

// -------------------- Live validation --------------------
function checkLoginValidity() {
  loginBtn.disabled = !(loginEmail.classList.contains("is-valid") && loginPassword.classList.contains("is-valid"));
}

// email validation
loginEmail.addEventListener("input", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const feedback = loginEmail.parentElement.querySelector(".invalid-feedback");

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

// password validation
loginPassword.addEventListener("input", () => {
  const feedback = loginPassword.parentElement.querySelector(".invalid-feedback");

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


// toggle password show/hide
document.querySelectorAll(".toggle-password").forEach(icon => {
  icon.addEventListener("click", () => {
    const input = document.getElementById(icon.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
    icon.classList.toggle("fa-eye-slash");
  });
});

// -------------------- Submit login --------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  btnText.classList.add("d-none");
  btnLoader.classList.remove("d-none");
  loginBtn.disabled = true;

  if (!loginEmail.classList.contains("is-valid") || !loginPassword.classList.contains("is-valid")) {
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
      return;
    }

    // البحث عن اليوزر
    const user = Object.values(users).find(u => u.email === loginEmail.value.trim() && u.password === loginPassword.value);

    if (!user) {
      toastr.warning("Invalid email or password");
      btnText.classList.remove("d-none");
    btnLoader.classList.add("d-none");
    loginBtn.disabled = false;
      return;
    }

    // toastr & redirect حسب role
    toastr.success(`Welcome back, ${user.name}!`);

    localStorage.setItem("currentUser", JSON.stringify({
    name: user.name,
    email: user.email,
    role: user.role
    }));

    setTimeout(() => {
      if (user.role === "admin") {
        window.location.href = "../../../pages/admin/users.html";
      } else if (user.role === "seller") {
        window.location.href = "../../../pages/seller/html/seller-dashboard.html";
      } else {
        window.location.href = "../../../pages/customer/customer-products.html";
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


