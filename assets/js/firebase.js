import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"; // ✅ add

const firebaseConfig = {
  apiKey: "AIzaSyAcUjMCb5t25FCqkYGBCkja8wdQHkYb8xM",
  authDomain: "ecommerce-multi-actor.firebaseapp.com",
  databaseURL: "https://ecommerce-multi-actor-default-rtdb.firebaseio.com",
  projectId: "ecommerce-multi-actor",
  storageBucket: "ecommerce-multi-actor.firebasestorage.app",
  messagingSenderId: "186521474859",
  appId: "1:186521474859:web:45d4a0f4a153cdd8b4176e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app); // ✅ add