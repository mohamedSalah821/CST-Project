// assets/js/dashboard.js
import { db } from "../../../assets/js/firebase.js";
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
const priceInput = document.getElementById("price");
const quantityInput = document.getElementById("quntity");
const imageInput = document.getElementById("image");
const previewImg = document.getElementById("preview");
const descInput = document.getElementById("description");

// Category UI
const categorySelect = document.getElementById("categorySelect");
const categoryModalEl = document.getElementById("categoryModal");
const categoryNameInput = document.getElementById("categoryName");
const saveCategoryBtn = document.getElementById("saveCategoryBtn");
const bsCategoryModal = categoryModalEl ? new bootstrap.Modal(categoryModalEl) : null;

// ===== Filters DOM =====
const searchInputEl = document.getElementById("searchInput");
const categoryFilterEl = document.getElementById("categoryFilter");
const priceSortEl = document.getElementById("priceSort");
const flagFilterEl = document.getElementById("flagFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// categories cache
let categoriesCache = {}; // {catId: {name, createdAt}}
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

function renderProducts(entries) {
  if (!entries.length) {
    tableBody.innerHTML =
      `<tr><td colspan="7" class="text-muted text-center py-4">
        No products found
      </td></tr>`;
    refreshBulkUI();
    return;
  }

  tableBody.innerHTML = entries.map(([id, p]) => {

    const name = String(p?.name ?? "");
    const desc = String(p?.description ?? "");
    const categoryLabel =
      String(p?.categoryName ?? p?.category ?? "Uncategorized").trim();
    const isFlagged = Boolean(p?.flagged);

    return `
      <tr class="product-row ${isFlagged ? "flagged-row" : ""}">
        
        <!-- Checkbox -->
        <td style="width:42px;">
          <input class="form-check-input product-check"
                 type="checkbox"
                 data-check="${id}"
                 ${selectedIds.has(id) ? "checked" : ""}>
        </td>

        <!-- Product -->
        <td>
          <div class="d-flex align-items-center gap-3">
            ${p.imageUrl
              ? `<img src="${p.imageUrl}"
                     style="width:46px;height:46px;object-fit:cover;border-radius:12px;">`
              : `<div style="width:46px;height:46px;border-radius:12px;background:#eef2ff;"></div>`
            }

            <div class="fw-semibold">
              ${escapeHtml(name)}
            </div>
          </div>
        </td>

        <!-- Description -->
        <td title="${escapeHtml(desc)}">
          ${escapeHtml(desc.slice(0, 60))}
          ${desc.length > 60 ? "..." : ""}
        </td>

        <!-- Category -->
        <td>
          <span class="cat-pill">
            <i class="fa-solid fa-tag me-1"></i>
            ${escapeHtml(categoryLabel)}
          </span>
        </td>

        <!-- Price -->
        <td class="fw-semibold">
          $${Number(p?.price ?? 0).toFixed(2)}
        </td>

        <!-- Quantity -->
        <td>
          <span class="qty-pill">
            ${Number(p?.quantity ?? 0)}
          </span>
        </td>

        <!-- Actions -->
        <td class="text-end actions-col">
          <div class="action-buttons">
            <button class="btn btn-sm btn-outline-primary"
                    data-edit="${id}">
              <i class="fa-solid fa-pen"></i>
            </button>

            <button class="btn btn-sm btn-outline-danger"
                    data-del="${id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>

      </tr>
    `;
  }).join("");

  // bind delete
  tableBody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () =>
      deleteProduct(btn.dataset.del)
    );
  });

  // bind edit
  tableBody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () =>
      startEdit(btn.dataset.edit)
    );
  });

  // bind checkboxes
  tableBody.querySelectorAll("[data-check]").forEach((ch) => {
    ch.addEventListener("change", () => {
      const id = ch.dataset.check;
      if (ch.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      refreshBulkUI();
    });
  });

  refreshBulkUI();
}


function populateCategoryFilterFromData() {
  if (!categoryFilterEl) return;

  const cats = new Set();
  Object.values(cacheData || {}).forEach(p => {
   const c = String(p?.categoryName ?? p?.category ?? "Uncategorized").trim();
    if (c) cats.add(c);
  });

  const current = categoryFilterEl.value || "all";
  const options = ["all", ...Array.from(cats).sort((a, b) => a.localeCompare(b))];

  categoryFilterEl.innerHTML = options
    .map(v => `<option value="${escapeHtml(v)}">${v === "all" ? "All Categories" : escapeHtml(v)}</option>`)
    .join("");

  // حاول يحافظ على الاختيار الحالي لو موجود
  if (options.includes(current)) categoryFilterEl.value = current;
  else categoryFilterEl.value = "all";
}

function applyFilters() {
  const q = (searchInputEl?.value || "").trim().toLowerCase();
  const cat = categoryFilterEl?.value || "all";
  const sort = priceSortEl?.value || "none";
  const flag = flagFilterEl?.value || "all";

  let entries = Object.entries(cacheData || {});

  // 1) search
  if (q) {
    entries = entries.filter(([id, p]) => {
      const name = String(p?.name ?? "").toLowerCase();
      const desc = String(p?.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }
// 2) category
if (cat !== "all") {
  entries = entries.filter(([id, p]) =>
    String(p?.categoryName ?? p?.category ?? "Uncategorized").trim() === cat
  );
}

  // 3) flagged
  if (flag !== "all") {
    entries = entries.filter(([id, p]) => {
      const isFlagged = Boolean(p?.flagged);
      return flag === "flagged" ? isFlagged : !isFlagged;
    });
  }

  // 4) price sort
  if (sort !== "none") {
    entries.sort((a, b) => {
      const pa = Number(a[1]?.price ?? 0);
      const pb = Number(b[1]?.price ?? 0);
      return sort === "asc" ? (pa - pb) : (pb - pa);
    });
  }

  renderProducts(entries);
}

function clearFilters() {
  if (searchInputEl) searchInputEl.value = "";
  if (categoryFilterEl) categoryFilterEl.value = "all";
  if (priceSortEl) priceSortEl.value = "none";
  if (flagFilterEl) flagFilterEl.value = "all";
  applyFilters();
}
// ===== Filters events =====
searchInputEl?.addEventListener("input", applyFilters);
categoryFilterEl?.addEventListener("change", applyFilters);
priceSortEl?.addEventListener("change", applyFilters);
flagFilterEl?.addEventListener("change", applyFilters);
clearFiltersBtn?.addEventListener("click", clearFilters);
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
   3) Categories
========================= */

function normalizeCategoryName(name) {
  return String(name ?? "").trim();
}

function renderCategoryOptions(selectedId = "") {
  if (!categorySelect) return;

  const entries = Object.entries(categoriesCache || {});
  entries.sort((a, b) => (a[1]?.name || "").localeCompare(b[1]?.name || ""));

  categorySelect.innerHTML = `
    <option value="" disabled ${selectedId ? "" : "selected"}>Select Category</option>
    ${entries.map(([id, c]) => `
      <option value="${id}" ${id === selectedId ? "selected" : ""}>
        ${escapeHtml(c?.name ?? "")}
      </option>
    `).join("")}
  `;
}

function listenCategories() {
  const sellerId = getSellerId();
  const catsRef = ref(db, `seller-categories/${sellerId}`);

  onValue(catsRef, (snap) => {
    categoriesCache = snap.val() || {};
    renderCategoryOptions();
  });
}
saveCategoryBtn?.addEventListener("click", async () => {
  const sellerId = getSellerId();
  const name = normalizeCategoryName(categoryNameInput?.value);

  if (!name) return alert("Enter category name");

  // prevent duplicates by name (case-insensitive)
  const exists = Object.values(categoriesCache || {}).some(c =>
    (c?.name || "").toLowerCase() === name.toLowerCase()
  );
  if (exists) return alert("Category already exists");

  saveCategoryBtn.disabled = true;
  const old = saveCategoryBtn.textContent;
  saveCategoryBtn.textContent = "Saving...";

  try {
    const newRef = push(ref(db, `seller-categories/${sellerId}`));
    await set(newRef, {
      name,
      createdAt: Date.now(),
    });

    categoryNameInput.value = "";
    bsCategoryModal?.hide();
    showToast("Category added ✅");
  } catch (e) {
    console.error(e);
    alert("Failed to add category");
  } finally {
    saveCategoryBtn.disabled = false;
    saveCategoryBtn.textContent = old;
  }
});

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

    // لو اتحذفت منتجات كانت متعلمة bulk
    const idsNow = new Set(Object.keys(cacheData || {}));
    selectedIds.forEach((id) => { if (!idsNow.has(id)) selectedIds.delete(id); });

    populateCategoryFilterFromData();
    applyFilters(); // بدل الرندر اليدوي
  });
}

/* =========================
   5) Reset Modal (لما تضغطي Add Product)
========================= */

function resetModal() {
  editingId = null;

  modalEl.querySelector(".modal-title").textContent = "Add Product";
  nameInput.value = "";
  priceInput.value = "";
  if (quantityInput) quantityInput.value = "";
  if (descInput) descInput.value = "";

  // reset category dropdown
  if (categorySelect) categorySelect.value = "";

  imageInput.value = "";
  previewImg.src = "";
  previewImg.classList.add("d-none");
}

/* =========================
   6) Save (Add / Update)
========================= */

saveBtn?.addEventListener("click", async () => {
  const sellerId = getSellerId();

  const name = nameInput.value.trim();

  const price = Number(priceInput.value);
  const quantity = Number(quantityInput?.value ?? 0);
  const file = imageInput.files?.[0];
  const description = descInput?.value.trim() || "";
  const categoryId = categorySelect?.value || "";
  if (!categoryId) return alert("Select category");

  const categoryName = categoriesCache?.[categoryId]?.name || "";
  if (!categoryName) return alert("Invalid category");
  if (!name) return alert("Enter product name");

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
        categoryId,
        categoryName,
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
        categoryId,
        categoryName,
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
  priceInput.value = p.price ?? 0;
  if (quantityInput) quantityInput.value = p.quantity ?? 0;
  if (descInput) descInput.value = p.description ?? "";

  // category: prefer categoryId, fallback to old string category
  const cid = p.categoryId ?? "";
  if (categorySelect) {
    if (cid) {
      renderCategoryOptions(cid);
    } else {
      // لو المنتج القديم كان مخزن category كـ string
      renderCategoryOptions();
      // محاولة اختيار بنفس الاسم (لو موجود)
      const oldName = String(p.categoryName ?? p.category ?? "").toLowerCase();
      const found = Object.entries(categoriesCache || {}).find(([_, c]) =>
        String(c?.name || "").toLowerCase() === oldName
      );
      if (found) categorySelect.value = found[0];
    }
  }

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
listenCategories();
listenProducts();
