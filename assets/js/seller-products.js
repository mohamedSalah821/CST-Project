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

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   DOM
========================= */

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
const descInput = document.getElementById("description");
// زر الحفظ في المودال
const saveBtn = modalEl?.querySelector(".modal-footer .btn.btn-primary");

// bootstrap modal instance
const bsModal = modalEl ? new bootstrap.Modal(modalEl) : null;

// ✅ Bulk Delete UI
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const selectAll = document.getElementById("selectAll");

// ✅ Confirm Bulk Delete Modal
const bulkDeleteModalEl = document.getElementById("bulkDeleteModal");
const bulkCountEl = document.getElementById("bulkCount");
const confirmBulkDeleteBtn = document.getElementById("confirmBulkDeleteBtn");
const bsBulkModal = bulkDeleteModalEl ? new bootstrap.Modal(bulkDeleteModalEl) : null;

// ✅ Toast
const toastEl = document.getElementById("appToast");
const toastText = document.getElementById("toastText");
const bsToast = toastEl ? new bootstrap.Toast(toastEl, { delay: 2200 }) : null;

function showToast(msg) {
  if (!bsToast || !toastText) return alert(msg);
  toastText.textContent = msg;
  bsToast.show();
}

/* =========================
   State
========================= */

// وضع التعديل
let editingId = null;

// كاش للمنتجات
let cacheData = {};

// ✅ selected ids
let selectedIds = new Set();

function refreshBulkUI() {
  const count = selectedIds.size;

  if (bulkDeleteBtn) bulkDeleteBtn.disabled = count === 0;
  if (bulkCountEl) bulkCountEl.textContent = String(count);

  if (selectAll) {
    const total = Object.keys(cacheData || {}).length;
    selectAll.checked = total > 0 && count === total;
    selectAll.indeterminate = count > 0 && count < total;
  }
}

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

  if (!res.ok) {
    console.error("Cloudinary error:", data);
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url;
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

  previewImg.src = URL.createObjectURL(file);
  previewImg.classList.remove("d-none");
});

/* =========================
   4) Realtime Listener (عرض المنتجات)
========================= */

function listenProducts() {
  const sellerId = getSellerId();
  const productsRef = ref(db, `seller-products/${sellerId}`);

  onValue(productsRef, (snap) => {
    cacheData = snap.val() || {};
    const list = Object.entries(cacheData);

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-muted">No products yet</td></tr>`;
      selectedIds.clear();
      refreshBulkUI();
      return;
    }

    // لو منتجات اتحذفت من الداتا، شيلها من selectedIds
    const idsNow = new Set(list.map(([id]) => id));
    selectedIds.forEach((id) => {
      if (!idsNow.has(id)) selectedIds.delete(id);
    });

    tableBody.innerHTML = list.map(([id, p]) => `
      <tr>
        <td style="width:42px;">
          <input class="form-check-input product-check" type="checkbox" data-check="${id}"
            ${selectedIds.has(id) ? "checked" : ""}>
        </td>

        <td>
          <div class="d-flex align-items-center gap-2">
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:42px;height:42px;object-fit:cover;border-radius:10px;">` : ""}
            <div>${escapeHtml(p.name ?? "")}</div>
          </div>
        </td>
<td title="${escapeHtml(p.description ?? "")}">
  ${escapeHtml((p.description ?? "").slice(0, 40))}${(p.description ?? "").length > 40 ? "..." : ""}
</td>
        <td>${escapeHtml(p.category ?? "")}</td>
        <td>$${Number(p.price ?? 0).toFixed(2)}</td>
        <td>${Number(p.quantity ?? 0)}</td>

       <td class="text-end actions-col">
  <div class="action-buttons">
    <button class="btn btn-sm btn-outline-primary" data-edit="${id}">
      <i class="fa-solid fa-pen"></i>
    </button>

    <button class="btn btn-sm btn-outline-danger" data-del="${id}">
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>
</td>
      </tr>
    `).join("");

    // bind delete (single)
    tableBody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.del));
    });

    // bind edit
    tableBody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => startEdit(btn.dataset.edit));
    });

    // bind row checkboxes
    tableBody.querySelectorAll("[data-check]").forEach((ch) => {
      ch.addEventListener("change", () => {
        const id = ch.dataset.check;
        if (ch.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        refreshBulkUI();
      });
    });

    refreshBulkUI();
  });
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
  if (descInput) descInput.value = "";
  previewImg.src = "";
  previewImg.classList.add("d-none");
}

// زر Add Product
document.querySelector('[data-bs-target="#productModal"]')
  ?.addEventListener("click", resetModal);

/* =========================
   6) Save (Add / Update)
========================= */

saveBtn?.addEventListener("click", async () => {
  const sellerId = getSellerId();

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const price = Number(priceInput.value);
  const quantity = Number(quantityInput?.value ?? 0);
  const file = imageInput.files?.[0];
  const description = descInput?.value.trim() || ""; 
  if (!name) return alert("Enter product name");
  if (!category) return alert("Enter category");
  if (Number.isNaN(price) || price < 0) return alert("Enter valid price");
  if (!Number.isInteger(quantity) || quantity < 0) return alert("Enter valid quantity");
  if (description.length > 500) return alert("Description is too long (max 500 chars)");
  const oldText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    if (!editingId) {
      // ✅ ADD
      const newRef = push(ref(db, `seller-products/${sellerId}`));

      let imageUrl = "";
      if (file) imageUrl = await uploadToCloudinary(file);

      await set(newRef, {
        name,
        category,
        price,
        quantity,
        description,
        imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // ✅ UPDATE
      const updatesObj = {
        name,
        category,
        price,
        quantity,
        description,
        updatedAt: Date.now(),
      };

      if (file) updatesObj.imageUrl = await uploadToCloudinary(file);

      await update(ref(db, `seller-products/${sellerId}/${editingId}`), updatesObj);
    }

    resetModal();
    bsModal?.hide();
    showToast("Saved ✅");

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
  if (descInput) descInput.value = p.description ?? "";
  imageInput.value = "";
  if (p.imageUrl) {
    previewImg.src = p.imageUrl;
    previewImg.classList.remove("d-none");
  } else {
    previewImg.src = "";
    previewImg.classList.add("d-none");
  }

  bsModal?.show();
}

/* =========================
   8) Delete (single)
========================= */

async function deleteProduct(id) {
  const sellerId = getSellerId();
  if (!confirm("Delete this product?")) return;

  try {
    await remove(ref(db, `seller-products/${sellerId}/${id}`));

    // لو كان متعلم في bulk شيله من selectedIds
    selectedIds.delete(id);
    refreshBulkUI();

    showToast("Deleted ✅");
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  }
}

/* =========================
   9) Bulk Delete
========================= */

// Select All
selectAll?.addEventListener("change", () => {
  const allIds = Object.keys(cacheData || {});
  if (selectAll.checked) selectedIds = new Set(allIds);
  else selectedIds.clear();

  // update current checkbox UI
  tableBody.querySelectorAll("[data-check]").forEach((ch) => {
    ch.checked = selectAll.checked;
  });

  refreshBulkUI();
});

// Open confirm modal
bulkDeleteBtn?.addEventListener("click", () => {
  if (selectedIds.size === 0) return;
  refreshBulkUI();
  bsBulkModal?.show();
});

async function bulkDeleteProducts(ids) {
  const sellerId = getSellerId();

  // multi-path update: set paths to null
  const updatesObj = {};
  ids.forEach((id) => {
    updatesObj[`seller-products/${sellerId}/${id}`] = null;
  });

  // ✅ update root
  await update(ref(db), updatesObj);
}

// Confirm bulk delete
confirmBulkDeleteBtn?.addEventListener("click", async () => {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  confirmBulkDeleteBtn.disabled = true;
  const old = confirmBulkDeleteBtn.textContent;
  confirmBulkDeleteBtn.textContent = "Deleting...";

  try {
    await bulkDeleteProducts(ids);

    selectedIds.clear();
    refreshBulkUI();
    bsBulkModal?.hide();

    showToast(`Deleted ${ids.length} product(s) ✅`);
  } catch (e) {
    console.error(e);
    showToast("Bulk delete failed ❌");
  } finally {
    confirmBulkDeleteBtn.disabled = false;
    confirmBulkDeleteBtn.textContent = old;
  }
});

/* =========================
   Start
========================= */

listenProducts();