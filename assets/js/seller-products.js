import { db } from "./firebase.js";
import { ref, push, set, onValue, update, remove }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
   1) Helpers + DOM عناصر الصفحة
========================= */

// (مؤقت) sellerId لأن مفيش Authentication
function getSellerId() {
  return localStorage.getItem("sellerId") || "seller_demo_1";
}

// جدول المنتجات
const tableBody = document.getElementById("productTable");

// عناصر المودال
const modalEl = document.getElementById("productModal");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const priceInput = document.getElementById("price");
const quantityInput = document.getElementById("quntity"); 
const imageInput = document.getElementById("image");
const previewImg = document.getElementById("preview");

// زر الحفظ في المودال
const saveBtn = modalEl.querySelector(".modal-footer .btn.btn-primary");

// bootstrap modal instance
const bsModal = new bootstrap.Modal(modalEl);

// وضع التعديل
let editingId = null;

// كاش للمنتجات (بيساعدنا وقت edit/delete بدون fetch جديد)
let cacheData = {};

/* =========================
   2) Cloudinary Upload
========================= */

async function uploadToCloudinary(file) {
  const cloudName = "dtw2jaesz";
  const uploadPreset = "seller"; // لازم يكون unsigned preset

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();

  // لو فيه خطأ من Cloudinary
  if (!res.ok) {
    console.error("Cloudinary error:", data);
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url; // رابط الصورة النهائي
}

/* =========================
   3) Preview للصورة قبل الرفع
========================= */

imageInput?.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) {
    previewImg.classList.add("d-none");
    previewImg.src = "";
    return;
  }

  // Preview محلي
  previewImg.src = URL.createObjectURL(file);
  previewImg.classList.remove("d-none");
});

/* =========================
   4) Realtime Listener (عرض المنتجات)
========================= */

function listenProducts() {
  const sellerId = getSellerId();
  const productsRef = ref(db, `products/${sellerId}`);

  onValue(productsRef, (snap) => {
    cacheData = snap.val() || {};
    const list = Object.entries(cacheData);

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-muted">No products yet</td></tr>`;
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
        <td>${Number(p.quantity ?? 0)}</td>
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

    // bind delete
    tableBody.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.del));
    });

    // bind edit
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

/* =========================
   5) Reset Modal (لما تضغطي Add Product)
========================= */

function resetModal() {
  editingId = null;

  modalEl.querySelector(".modal-title").textContent = "Add Product";
  nameInput.value = "";
  categoryInput.value = "";
  priceInput.value = "";
  if (quantityInput) quantityInput.value = "";

  imageInput.value = "";
  previewImg.src = "";
  previewImg.classList.add("d-none");
}

// زر Add Product
document.querySelector('[data-bs-target="#productModal"]')
  ?.addEventListener("click", resetModal);

/* =========================
   6) Save (Add / Update)
========================= */

saveBtn.addEventListener("click", async () => {
  const sellerId = getSellerId();

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const price = Number(priceInput.value);
  const quantity = Number(quantityInput?.value ?? 0);
  const file = imageInput.files?.[0];

  // ✅ Validations
  if (!name) return alert("Enter product name");
  if (!category) return alert("Enter category");
  if (Number.isNaN(price) || price < 0) return alert("Enter valid price");
  if (!Number.isInteger(quantity) || quantity < 0) return alert("Enter valid quantity");

  // disable button أثناء الحفظ
  const oldText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    if (!editingId) {
      // ✅ ADD
      const newRef = push(ref(db, `products/${sellerId}`));

      let imageUrl = "";
      if (file) {
        imageUrl = await uploadToCloudinary(file);
      }

      await set(newRef, {
        name,
        category,
        price,
        quantity,
        imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

    } else {
      // ✅ UPDATE
      const updates = {
        name,
        category,
        price,
        quantity,
        updatedAt: Date.now()
      };

      // لو اختارت صورة جديدة: نرفع على Cloudinary ونحدث imageUrl
      if (file) {
        updates.imageUrl = await uploadToCloudinary(file);
      }

      await update(ref(db, `products/${sellerId}/${editingId}`), updates);
    }

    resetModal();
    bsModal.hide();

  } catch (err) {
    console.error(err);
    alert(err.message || "Save failed");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = oldText;
  }
});

/* =========================
   7) Edit (فتح المودال وتعبئة البيانات)
========================= */

function startEdit(id) {
  const p = cacheData[id];
  if (!p) return;

  editingId = id;
  modalEl.querySelector(".modal-title").textContent = "Edit Product";

  nameInput.value = p.name ?? "";
  categoryInput.value = p.category ?? "";
  priceInput.value = p.price ?? 0;
  if (quantityInput) quantityInput.value = p.quantity ?? 0;

  // preview للصورة الحالية لو موجودة
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

/* =========================
   8) Delete (حذف من Firebase DB)
========================= */

async function deleteProduct(id) {
  const sellerId = getSellerId();
  if (!confirm("Delete this product?")) return;

  try {
    await remove(ref(db, `products/${sellerId}/${id}`));

    // ملاحظة: بما إن الصور على Cloudinary، حذف الصورة من Cloudinary
    // محتاج Backend / Function (لأسباب أمان)، فمش بنحذفها هنا.
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  }
}

/* =========================
   Start
========================= */

listenProducts();