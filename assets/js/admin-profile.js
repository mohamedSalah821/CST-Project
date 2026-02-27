import { db, auth } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const FIREBASE_URL = "https://ecommerce-multi-actor-default-rtdb.firebaseio.com/";


const uploadInput = document.getElementById('uploadImg');
const profileDisplay = document.getElementById('profileDisplay');
const uploadStatus = document.getElementById('uploadStatus');
const loadingOverlay = document.getElementById('loadingOverlay');

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dtw2jaesz/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "seller";

let currentUser = null;

/* ===========================
   🔐 AUTH CHECK & LOAD DATA
=========================== */
const userData = JSON.parse(localStorage.getItem("currentUser"));

if (!userData) {
    console.log("No user in localStorage, redirecting...");
    window.location.href = "../../login.html";
} else {
    currentUser = userData; 
    loadProfileData(userData.email); 
}

async function loadProfileData(email) {
    try {
        const response = await fetch(`${FIREBASE_URL}/users.json`);
        const users = await response.json();
        
        const userKey = Object.keys(users).find(key => users[key].email === email);
        const data = users[userKey];

        if (data) {
            document.getElementById('adminNameDisplay').textContent = data.name || "مدير النظام";
            document.getElementById('adminEmail').innerHTML = data.email;
            document.getElementById('profileDisplay').src = data.profileImg || "https://via.placeholder.com/150";
        }
        
        loadingOverlay.style.display = 'none';
    } catch (error) {
        console.error("Error:", error);
        loadingOverlay.style.display = 'none';
    }
}

async function loadUserData(user) {
    try {
        const snapshot = await get(ref(db, `users/${user.uid}`));
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    } catch (error) {
        console.error("Error:", error);
    }
}

/* ===========================
   📷 IMAGE UPLOAD
=========================== */
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return; 


    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        uploadStatus.innerHTML = '<span class="text-primary">⏳ جاري رفع الصورة...</span>';

        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await response.json();
        const imageUrl = data.secure_url;

        profileDisplay.src = imageUrl;

        const usersRes = await fetch(`${FIREBASE_URL}/users.json`);
        const users = await usersRes.json();
        
        const userKey = Object.keys(users).find(key => users[key].email === currentUser.email);

        if (userKey) {
            await update(ref(db, `users/${userKey}`), {
                profileImg: imageUrl
            });            
            const updatedUser = { ...currentUser, profileImg: imageUrl };
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            
            uploadStatus.innerHTML = '<span class="text-success">updated image succfully</span>';
        }

    } catch (error) {
        console.error("Upload error:", error);
        uploadStatus.innerHTML = '<span class="text-danger">failed to update image</span>';
    }
});

/* ===========================
   🔄 RE-AUTHENTICATE USER
=========================== */
async function reauthenticateUser(currentPassword) {
    const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
    );
    await reauthenticateWithCredential(currentUser, credential);
}

/* ===========================
   💾 SAVE PROFILE CHANGES
=========================== */
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newName = document.getElementById('adminName').value.trim();
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();

    if (!newName) {
        alert("please insert a name!");
        return;
    }

    if (newName.length < 3) {
        alert(" name must be at least 3 characters long!");
        return;
    }

    if (newPassword && !currentPassword) {
        alert("To change your password, please enter your current password!");
        return;
    }

    if (newPassword && newPassword.length < 6) {
        alert("New password must be at least 6 characters long!");
        return;
    }

    try {
        loadingOverlay.style.display = 'flex';

        // ✅ تحديث الاسم في Firebase Database
        await update(ref(db, `users/${currentUser.uid}`), {
            displayName: newName
        });

        document.getElementById('adminNameDisplay').textContent = newName;

        if (newPassword) {
            try {
                // ابحث أولاً عن اليوزر في الـ Database لتتأكد من الباسورد القديم
        const response = await fetch(`${FIREBASE_URL}/users.json`);
        const users = await response.json();
        const userKey = Object.keys(users).find(key => users[key].email === currentUser.email);

        if (users[userKey].password !== currentPassword) {
            alert("Current password is incorrect!");
            loadingOverlay.style.display = 'none';
            return;
        }

        await update(ref(db, `users/${userKey}`), {
            password: newPassword,
            displayName: newName 
        });

        alert("✅ Profile updated successfully!");
    } catch (err) {
        console.error(err);
        alert("❌ Error updating password: " + err.message);
    }
}

        loadingOverlay.style.display = 'none';

    } catch (error) {
        console.error("Update error:", error);
        loadingOverlay.style.display = 'none';
        alert("❌ Error updating profile: " + error.message);
    }
});