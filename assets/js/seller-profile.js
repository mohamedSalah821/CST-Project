import { db } from "./firebase.js";
import { ref, get, update }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

function getSellerId(){
  return localStorage.getItem("sellerId");
}

const emailInput = document.getElementById("editEmail");
const passInput = document.getElementById("editPassword");
const confirmInput = document.getElementById("confirmPassword");
const saveBtn = document.getElementById("saveProfileBtn");
const msg = document.getElementById("profileMsg");

function showMsg(text){
  msg.textContent = text;
  msg.classList.remove("d-none");
}

function hideMsg(){
  msg.classList.add("d-none");
}

async function loadProfile(){
  const sellerId = getSellerId();
  if(!sellerId){
    window.location.href = "../../../login.html";
    return;
  }

  const snap = await get(ref(db, `users/${sellerId}`));
  const seller = snap.val();
  if(!seller) return;

  emailInput.value = seller.email || "";
}

saveBtn.addEventListener("click", async ()=>{

  hideMsg();

  const sellerId = getSellerId();
  if(!sellerId) return;

  const newEmail = emailInput.value.trim();
  const newPass = passInput.value.trim();
  const confirmPass = confirmInput.value.trim();

  if(!newEmail.includes("@")){
    showMsg("Enter valid email");
    return;
  }

  if(newPass){
    if(newPass.length < 6){
      showMsg("Password must be at least 6 characters");
      return;
    }
    if(newPass !== confirmPass){
      showMsg("Passwords do not match");
      return;
    }
  }

  try{

    const updates = {
      email: newEmail,
      updatedAt: Date.now()
    };

    // لو كتب باسورد جديد
    if(newPass){
      updates.password = newPass;
    }

    await update(ref(db, `users/${sellerId}`), updates);

    // تحديث localStorage
    const current = JSON.parse(localStorage.getItem("currentUser"));
    current.email = newEmail;
    localStorage.setItem("currentUser", JSON.stringify(current));

    alert("Security settings updated successfully!");

    passInput.value = "";
    confirmInput.value = "";

  }catch(err){
    console.error(err);
    showMsg("Update failed");
  }

});

loadProfile();