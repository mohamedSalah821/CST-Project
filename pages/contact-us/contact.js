// ========================== Firebase URL ==========================
const FIREBASE_URL = "https://ecommerce-multi-actor-default-rtdb.firebaseio.com/";

// ========================== toastr options ==========================
toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: "2500"
};

// ========================== Select inputs ==========================
const nameInput = document.querySelector("input[name='name']");
const emailInput = document.querySelector("input[name='email']");
const phoneInput = document.querySelector("input[name='phone']");
const messageInput = document.querySelector("textarea[name='message']");
const contactForm = document.querySelector(".form");
const phoneError = document.querySelector(".phone-error");
const messageError = document.querySelector(".message-error");

// ========================== Auto-fill User ==========================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (currentUser) {
  nameInput.value = currentUser.name;
  nameInput.readOnly = true;

  emailInput.value = currentUser.email;
  emailInput.readOnly = true;
} else {
  nameInput.value = "Welcome Guest";
  nameInput.readOnly = true;

  emailInput.value = "guest@example.com";
  emailInput.readOnly = true;
}

// ========================== Live validation for phone ==========================
phoneInput.addEventListener("input", () => {
  const phonePattern = /^0\d{10}$/; 
  if (!phonePattern.test(phoneInput.value.trim())) {
    phoneError.innerText = "Please enter a valid phone number ex:01153141015";
  } else {
    phoneError.innerText = "";
  }
});

messageInput.addEventListener("input", () => {
  if (messageInput.value.trim() === "") {
    messageError.innerText = "Message cannot be empty";
  } else {
    messageError.innerText = "";
  }
});

// ========================== Form Submit ==========================
contactForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  phoneError.innerText = "";
  messageError.innerText = "";

  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    toastr.warning("Please login first to send a message");
    setTimeout(() => {
      window.location.href = "../../login.html"; 
    }, 2000);
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const message = messageInput.value.trim();
  const role = user.role;

  let valid = true;
  const phonePattern = /^0\d{10}$/;
  if (!phonePattern.test(phone)) {
    phoneError.innerText = "Please enter a valid phone number ex:01153141015";
    valid = false;
  }

  if (message === "") {
    messageError.innerText = "Message cannot be empty";
    valid = false;
  }

  if (!valid) return;

  const timestamp = new Date().toISOString();

  const msgData = {
    name,
    email,
    phone,
    message,
    role,
    time: timestamp
  };

  try {
    const response = await fetch(`${FIREBASE_URL}/contactMessages.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msgData)
    });

    if (!response.ok) throw new Error("Cannot send message");

    toastr.success("Your message has been sent successfully!");
    phoneInput.value = "";
    messageInput.value = "";

  } catch (error) {
    console.error(error);
    toastr.error("Something went wrong. Please try again.");
  }
});