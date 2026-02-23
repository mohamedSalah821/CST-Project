 const FIREBASE_URL = "https://ecommerce-multi-actor-default-rtdb.firebaseio.com/";

const form = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const roleInput = document.getElementById("accountType");
const registerBtn = document.getElementById("registerBtn");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");


// toastr setup
toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: "2500"
};




// regex
const nameRegex = /^[A-Za-z ]{3,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

// helper functions
function setValid(input) {
  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  const feedback = input.parentElement.querySelector(".invalid-feedback");
  if (feedback) feedback.innerText = "";
}

function setInvalid(input, message) {
  input.classList.remove("is-valid");
  input.classList.add("is-invalid");
  const feedback = input.parentElement.querySelector(".invalid-feedback");
  if (feedback) feedback.innerText = message;
}

function checkFormValidity() {
  const allValid =
    nameInput.classList.contains("is-valid") &&
    emailInput.classList.contains("is-valid") &&
    passwordInput.classList.contains("is-valid") &&
    confirmPasswordInput.classList.contains("is-valid");

  registerBtn.disabled = !allValid;
}

// live validation
nameInput.addEventListener("input", () => {
  if (!nameRegex.test(nameInput.value.trim())) {
    setInvalid(nameInput, "Name must be at least 3 letters ");
  } else {
    setValid(nameInput);
  }
  checkFormValidity();
});

emailInput.addEventListener("input", () => {
  if (!emailRegex.test(emailInput.value.trim())) {
    setInvalid(emailInput, "Enter a valid email ex:mohamedsalah@gmail.com");
  } else {
    setValid(emailInput);
  }
  checkFormValidity();
});

passwordInput.addEventListener("input", () => {
  if (!passwordRegex.test(passwordInput.value)) {
    setInvalid(passwordInput, "Password must be 6+ chars ex:Mo123456");
  } else {
    setValid(passwordInput);
  }
  validateConfirmPassword(); 
  checkFormValidity();
});

confirmPasswordInput.addEventListener("input", () => {
  validateConfirmPassword();
  checkFormValidity();
});

function validateConfirmPassword() {
   if (confirmPasswordInput.value === "") {
    confirmPasswordInput.classList.remove("is-invalid");
    confirmPasswordInput.classList.remove("is-valid");
    return;
  }

  if (confirmPasswordInput.value !== passwordInput.value) {
    setInvalid(confirmPasswordInput, "Passwords do not match");
  } else {
    setValid(confirmPasswordInput);
  }
}

// toggle password show/hide
document.querySelectorAll(".toggle-password").forEach(icon => {
  icon.addEventListener("click", () => {
    const input = document.getElementById(icon.dataset.target);
    const type = input.type === "password" ? "text" : "password";
    input.type = type;
    icon.classList.toggle("fa-eye-slash");
  });
});



// ---------------------------------------- Database --------------------------------------
const userData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value, 
    role: roleInput.value
};


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  btnText.classList.add("d-none");
  btnLoader.classList.remove("d-none");
  registerBtn.disabled = true;

  const userData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value,
    role: roleInput.value
  };

  if (await isEmailTaken(userData.email)) {
    setInvalid(emailInput, "This email is already taken!");
    toastr.warning("Email already exists. Try another.");

    btnText.classList.remove("d-none");
  btnLoader.classList.add("d-none");
  registerBtn.disabled = false;
  
    return;
  } else {
    setValid(emailInput);
  }

  try {
    const response = await fetch(`${FIREBASE_URL}/users.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      toastr.success("Account created successfully🤩");
       
//////////////////////////
 // ✅ لو عايزة بس السيلر يتعمله auto login بعد الريجيستر
if (userData.role === "seller") {
  localStorage.setItem("sellerEmail", userData.email);
  localStorage.setItem("sellerPassword", userData.password);

  // ✅ flag ان السيلر logged in
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("currentRole", "seller");
   // ✅ التوجيه حسب نوع الحساب
  setTimeout(() => {
    if (userData.role === "seller") {
      window.location.href = "./seller-dashboard.html";
    } else {
      window.location.href = "./login.html";
    }
  }, 1500);
}
/////////////////////////

      form.reset();
      [nameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        input.classList.remove("is-valid");
        input.classList.remove("is-invalid");
      });
      registerBtn.disabled = true;

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1500);

    } else {
      throw new Error("Failed to create account⚠️");
    }

  } catch (error) {
    console.error(error);
    toastr.error("Error creating account. Try again!");
  }
});



async function isEmailTaken(email) {
  try {
    const response = await fetch(`${FIREBASE_URL}/users.json`);
    if (!response.ok) throw new Error("Cannot fetch users");

    const users = await response.json();
    if (!users) return false;

    return Object.values(users).some(user => user.email === email);
    
  } catch (error) {
    console.error(error);
    toastr.error("Error checking email. Try again!");
    btnText.classList.remove("d-none");
  btnLoader.classList.add("d-none");
  registerBtn.disabled = false;
    return true; 
  }
}

