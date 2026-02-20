import { db, storage } from "./firebase.js";
import { ref, push, set, onValue, update, remove }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
  ref as sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

function getSellerId() {
  return localStorage.getItem("sellerId") || "seller_demo_1";
}

const tableBody = document.getElementById("productTable");

const modalEl = document.getElementById("productModal");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const priceInput = document.getElementById("price");


const quantityInput = document.getElementById("quntity");

const imageInput = document.getElementById("image");
const previewImg = document.getElementById("preview");

const saveBtn = modalEl.querySelector(".modal-footer .btn.btn-primary");
const bsModal = new bootstrap.Modal(modalEl);

let editingId = null;
let editingImagePath = null;
let cacheData = {};

// ✅ Preview للصورة
imageInput?.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) {
    previewImg.classList.add("d-none");
    previewImg.src = "";
    return;
  }
  previewImg.src = URL.createObjectURL(file);
  previewImg.classList.remove("d-none");
});

function listenProducts() {
  const sellerId = getSellerId();
  const productsRef = ref(db, `products/${sellerId}`);

  onValue(productsRef, (snap) => {
    cacheData = snap.val() || {};
    const list = Object.entries(cacheData);

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-muted">No products yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(([id, p]) => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:42px;height:42px;object-fit:cover;border-radius:10px;">` : ""}
            <div>${escapeHtml(p.name ?? "")}</div>
          </div>
        </td>
        <td>${escapeHtml(p.category ?? "")}</td>
        <td>$${Number(p.price ?? 0).toFixed(2)}</td>

        <!-- ✅ جديد: quantity -->
        <td>${Number(p.quantity ?? 0)}</td>

        <td><span class="badge bg-primary">${escapeHtml(p.status ?? "active")}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-2" data-edit="${id}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-del="${id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");

    tableBody.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.del));
    });

    tableBody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => startEdit(btn.dataset.edit));
    });
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function resetModal() {
  editingId = null;
  editingImagePath = null;

  modalEl.querySelector(".modal-title").textContent = "Add Product";
  nameInput.value = "";
  categoryInput.value = "";
  priceInput.value = "";
  if (quantityInput) quantityInput.value = "";

  imageInput.value = "";
  previewImg.src = "";
  previewImg.classList.add("d-none");
}

document.querySelector('[data-bs-target="#productModal"]')
  ?.addEventListener("click", resetModal);

// ✅ Upload image helper
async function uploadImage(file, sellerId, productId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `products/${sellerId}/${productId}.${ext}`;
  const storageRef = sRef(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return { url, path };
}

saveBtn.addEventListener("click", async () => {
  const sellerId = getSellerId();

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const price = Number(priceInput.value);

  // ✅ جديد: quantity
  const quantity = Number(quantityInput?.value ?? 0);

  const file = imageInput.files?.[0];

  if (!name) return alert("Enter product name");
  if (!category) return alert("Enter category");
  if (Number.isNaN(price) || price < 0) return alert("Enter valid price");

  // quantity لازم يكون رقم صحيح >= 0
  if (!Number.isInteger(quantity) || quantity < 0) return alert("Enter valid quantity");

  try {
    if (!editingId) {
      // ✅ ADD
      const newRef = push(ref(db, `products/${sellerId}`));
      const productId = newRef.key;

      let imageUrl = "";
      let imagePath = "";

      if (file) {
        const up = await uploadImage(file, sellerId, productId);
        imageUrl = up.url;
        imagePath = up.path;
      }

      await set(newRef, {
        name,
        category,
        price,
        quantity, // ✅ جديد
        status: "active",
        imageUrl,
        imagePath,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

    } else {
      // ✅ UPDATE
      const updates = {
        name,
        category,
        price,
        quantity, // ✅ جديد
        updatedAt: Date.now()
      };

      // لو اختار صورة جديدة: ارفعها وامسح القديمة
      if (file) {
        const oldPath = editingImagePath;
        const up = await uploadImage(file, sellerId, editingId);

        updates.imageUrl = up.url;
        updates.imagePath = up.path;

        if (oldPath) {
          try { await deleteObject(sRef(storage, oldPath)); } catch {}
        }
      }

      await update(ref(db, `products/${sellerId}/${editingId}`), updates);
    }

    resetModal();
    bsModal.hide();

  } catch (err) {
    console.error(err);
    alert("Upload/Save failed. Check Storage Rules.");
  }
});

function startEdit(id) {
  const p = cacheData[id];
  if (!p) return;

  editingId = id;
  editingImagePath = p.imagePath || null;

  modalEl.querySelector(".modal-title").textContent = "Edit Product";

  nameInput.value = p.name ?? "";
  categoryInput.value = p.category ?? "";
  priceInput.value = p.price ?? 0;

  // ✅ جديد: fill quantity
  if (quantityInput) quantityInput.value = p.quantity ?? 0;

  imageInput.value = "";
  if (p.imageUrl) {
    previewImg.src = p.imageUrl;
    previewImg.classList.remove("d-none");
  } else {
    previewImg.src = "";
    previewImg.classList.add("d-none");
  }

  bsModal.show();
}

async function deleteProduct(id) {
  const sellerId = getSellerId();
  if (!confirm("Delete this product?")) return;

  try {
    const p = cacheData[id];

    await remove(ref(db, `products/${sellerId}/${id}`));

    if (p?.imagePath) {
      try { await deleteObject(sRef(storage, p.imagePath)); } catch {}
    }
  } catch (err) {
    console.error(err);
    alert("Delete failed. Check Rules.");
  }
}

listenProducts();
