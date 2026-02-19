import { db } from "./firebase.js";
import {
  ref, push, set, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ====== Demo sellerId (لأن مفيش Auth) ======
function getSellerId() {
  return localStorage.getItem("sellerId") || "seller_demo_1";
}

// ====== عناصر الصفحة ======
const tableBody = document.getElementById("productTable");

const modalEl = document.getElementById("productModal");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const priceInput = document.getElementById("price");

// زرار Save اللي في المودال (هنمسكه بدل onclick)
const saveBtn = modalEl.querySelector(".modal-footer .btn.btn-primary");
const bsModal = new bootstrap.Modal(modalEl);

let editingId = null; // null => add, otherwise edit

// ====== Realtime Listen ======
function listenProducts() {
  const sellerId = getSellerId();
  const productsRef = ref(db, `products/${sellerId}`);

  onValue(productsRef, (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data); // [[id, product], ...]

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-muted">No products yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(([id, p]) => `
      <tr>
        <td>${escapeHtml(p.name ?? "")}</td>
        <td>${escapeHtml(p.category ?? "")}</td>
        <td>$${Number(p.price ?? 0).toFixed(2)}</td>
        <td><span class="badge-status">active</span></td>
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

    // bind actions
    tableBody.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.del));
    });

    tableBody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => startEdit(btn.dataset.edit, data));
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

// ====== Add/Edit (Save) ======
saveBtn.addEventListener("click", async () => {
  const sellerId = getSellerId();

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const price = Number(priceInput.value);

  if (!name) return alert("Enter product name");
  if (!category) return alert("Enter category");
  if (Number.isNaN(price) || price < 0) return alert("Enter valid price");

  try {
    if (!editingId) {
      // ADD
      const newRef = push(ref(db, `products/${sellerId}`));
      await set(newRef, {
        name,
        category,
        price,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } else {
      // UPDATE
      await update(ref(db, `products/${sellerId}/${editingId}`), {
        name,
        category,
        price,
        updatedAt: Date.now()
      });
    }

    resetModal();
    bsModal.hide();
  } catch (err) {
    console.error(err);
    alert("Firebase error. Check Rules / DB URL.");
  }
});

function resetModal() {
  editingId = null;
  modalEl.querySelector(".modal-title").textContent = "Add Product";
  nameInput.value = "";
  categoryInput.value = "";
  priceInput.value = "";
}

// لما تفتحي المودال من زر Add Product خليه يرجع Add mode
document.querySelector('[data-bs-target="#productModal"]')
  ?.addEventListener("click", resetModal);

// ====== Start Edit ======
function startEdit(id, allData) {
  const p = allData[id];
  if (!p) return;

  editingId = id;
  modalEl.querySelector(".modal-title").textContent = "Edit Product";

  nameInput.value = p.name ?? "";
  categoryInput.value = p.category ?? "";
  priceInput.value = p.price ?? 0;

  bsModal.show();
}

// ====== Delete ======
async function deleteProduct(id) {
  const sellerId = getSellerId();
  if (!confirm("Delete this product?")) return;

  try {
    await remove(ref(db, `products/${sellerId}/${id}`));
  } catch (err) {
    console.error(err);
    alert("Delete failed. Check Rules.");
  }
}

// ====== Start ======
listenProducts();
