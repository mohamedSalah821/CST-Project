// assets/js/dashboard.js
import { db } from "../../../assets/js/firebase.js";
import { ref, onValue, push, set, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
   Helpers
========================= */
function getSellerId() {
    const id = localStorage.getItem("sellerId");
    if (!id) {
        alert("Seller not found. Please login again.");
        throw new Error("sellerId missing in localStorage");
    }
    return id;
}

function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeName(name) {
    return String(name ?? "").trim();
}

// key للمقارنة ومنع التكرار
function normalizeKey(name) {
    return normalizeName(name).toLowerCase().replace(/\s+/g, " ");
}

/* =========================
   DOM
========================= */
const tableBody = document.getElementById("categoriesTable");
const searchEl = document.getElementById("catSearchInput");
const newNameEl = document.getElementById("newCategoryInput");
const addBtn = document.getElementById("addCategoryBtn");

// toast
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
const sellerId = getSellerId();
let categories = {};   // seller-categories/{sellerId}
let products = {};     // seller-products/{sellerId}
let editingId = null;  // categoryId

/* =========================
   Firebase listeners
========================= */
const catsRef = ref(db, `seller-categories/${sellerId}`);
const productsRef = ref(db, `seller-products/${sellerId}`);

onValue(catsRef, (snap) => {
    categories = snap.val() || {};
    render();
});

onValue(productsRef, (snap) => {
    products = snap.val() || {};
    render();
});

/* =========================
   Counts by category
   - يدعم الشكلين:
     الجديد: categoryId / categoryName
     القديم: category (string)
========================= */
function buildProductCounts() {
    const counts = {}; // key => number

    Object.values(products || {}).forEach((p) => {
        const cid = p?.categoryId ? String(p.categoryId) : "";
        const cname = normalizeKey(p?.categoryName ?? p?.category ?? "");

        // الأولوية للـ categoryId لو موجود
        const key = cid || (cname ? `name:${cname}` : "uncategorized");
        counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
}

function categoryCountFor(catId, catName, counts) {
    const byId = counts[String(catId)] || 0;

    // دعم المنتجات القديمة اللي مخزنة category كـ string
    const byName = counts[`name:${normalizeKey(catName)}`] || 0;

    return byId + byName;
}

/* =========================
   Render
========================= */
function render() {
    if (!tableBody) return;

    const q = normalizeKey(searchEl?.value || "");
    const counts = buildProductCounts();

    // entries: [id, {name, createdAt}]
    let entries = Object.entries(categories || {}).map(([id, c]) => [id, c]);

    // filter search
    if (q) {
        entries = entries.filter(([id, c]) => normalizeKey(c?.name).includes(q));
    }

    // sort alphabetically
    entries.sort((a, b) => String(a[1]?.name || "").localeCompare(String(b[1]?.name || "")));

    if (!entries.length) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-muted">No categories found</td></tr>`;
        return;
    }

    tableBody.innerHTML = entries.map(([id, c]) => {
        const name = c?.name ?? "";
        const n = categoryCountFor(id, name, counts);
        const used = n > 0;

        return `
      <tr class="${used ? "row-disabled" : ""}">
 <td>
  <span class="cat-name">${escapeHtml(name)}</span>
</td>

        <td>
          <span class="count-badge">${n}</span>
        </td>

        <td class="text-end">
          <div class="actions">
            <button class="icon-btn edit" data-edit="${escapeHtml(id)}" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>

            <button class="icon-btn del" data-del="${escapeHtml(id)}" title="${used ? "Can't delete (used)" : "Delete"}" ${used ? "disabled" : ""}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join("");

    // bind edit/delete
    tableBody.querySelectorAll("[data-del]").forEach(btn => {
        btn.addEventListener("click", () => deleteCategory(btn.dataset.del));
    });

    tableBody.querySelectorAll("[data-edit]").forEach(btn => {
        btn.addEventListener("click", () => startEdit(btn.dataset.edit));
    });
}

/* =========================
   Add / Edit
========================= */
async function addCategory(name) {
    const key = normalizeKey(name);
    if (!key) return alert("Enter category name");

    // منع التكرار بالاسم (case-insensitive)
    const exists = Object.values(categories || {}).some(c => normalizeKey(c?.name) === key);
    if (exists) return alert("Category already exists");

    addBtn.disabled = true;
    const old = addBtn.innerHTML;
    addBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving`;

    try {
        const newRef = push(ref(db, `seller-categories/${sellerId}`));
        await set(newRef, { name: normalizeName(name), createdAt: Date.now() });
        newNameEl.value = "";
        showToast("Category added ✅");
    } catch (e) {
        console.error(e);
        alert("Failed to add category");
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = old;
    }
}

function startEdit(catId) {
    const c = categories?.[catId];
    if (!c) return;

    editingId = catId;
    newNameEl.value = c?.name ?? "";
    newNameEl.focus();
    addBtn.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Save`;
}

async function saveEdit(catId, newName) {
    const key = normalizeKey(newName);
    if (!key) return alert("Enter category name");

    // منع التكرار (ماعدا نفس الـ id)
    const exists = Object.entries(categories || {}).some(([id, c]) =>
        id !== catId && normalizeKey(c?.name) === key
    );
    if (exists) return alert("Category already exists");

    addBtn.disabled = true;
    const old = addBtn.innerHTML;
    addBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving`;

    try {
        await update(ref(db, `seller-categories/${sellerId}/${catId}`), {
            name: normalizeName(newName),
            updatedAt: Date.now()
        });

        editingId = null;
        newNameEl.value = "";
        addBtn.innerHTML = `<i class="fa-solid fa-plus me-2"></i>Add`;
        showToast("Category updated ✅");
    } catch (e) {
        console.error(e);
        alert("Failed to update category");
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = old;
    }
}

/* =========================
   Delete
========================= */
async function deleteCategory(catId) {
    if (!confirm("Delete this category?")) return;

    try {
        await remove(ref(db, `seller-categories/${sellerId}/${catId}`));
        showToast("Category deleted ✅");
    } catch (e) {
        console.error(e);
        alert("Failed to delete category");
    }
}

/* =========================
   Events
========================= */
searchEl?.addEventListener("input", render);

addBtn?.addEventListener("click", () => {
    const name = newNameEl?.value || "";

    if (editingId) {
        saveEdit(editingId, name);
    } else {
        addCategory(name);
    }
});

// Enter key
newNameEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn?.click();
});