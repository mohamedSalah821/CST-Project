// assets/js/dashboard.js
import { db } from "../../../assets/js/firebase.js";
import {
  ref,
  onValue,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
  Helpers
========================= */
function getSellerId() {
  const id = localStorage.getItem("sellerId") || "";
  if (!id) {
    alert("sellerId not found in localStorage");
    throw new Error("sellerId missing");
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

function money(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function normKey(s) {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function safeLower(s) {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * في cart.js عندك غالبًا price = (unitPrice * qty) => line total
 * فإجمالي السطر = item.price
 */
function computePricing(item) {
  const qty = Number(item?.qty || 0) || 0;
  const rawPrice = Number(item?.price || 0) || 0;

  // لو في المستقبل ضفتي lineTotal
  if (item?.lineTotal != null) {
    const line = Number(item.lineTotal) || 0;
    const unit = qty > 0 ? line / qty : rawPrice;
    return { qty, unitPrice: unit, lineTotal: line };
  }

  // اعتبر rawPrice هو lineTotal (ده الأنسب مع cart.js الحالي)
  const unit = qty > 0 ? rawPrice / qty : rawPrice;
  return { qty, unitPrice: unit, lineTotal: rawPrice };
}

/* =========================
  DOM
========================= */
const sellerId = getSellerId();

const ordersBody = document.getElementById("ordersBody");

// ✅ filters (لازم IDs دي موجودة في HTML)
const orderSearchEl = document.getElementById("orderSearch");
const statusFilterEl = document.getElementById("statusFilter");
const sortFilterEl = document.getElementById("sortFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");

// modal dom
const viewOrderModalEl = document.getElementById("viewOrderModal");
const bsViewModal = viewOrderModalEl ? new bootstrap.Modal(viewOrderModalEl) : null;

const mOrderId = document.getElementById("mOrderId");
const mCustomer = document.getElementById("mCustomer");
const mDate = document.getElementById("mDate");
const mAddress = document.getElementById("mAddress");
const mTotal = document.getElementById("mTotal");
const mItems = document.getElementById("mItems");
const mStatus = document.getElementById("mStatus");
const saveStatusBtn = document.getElementById("saveStatusBtn");
const statusMsg = document.getElementById("statusMsg");

/* =========================
  State
========================= */
let cacheOrders = []; // [{ customerKey, orderKey, order, myItems, myTotal }]
let currentOpen = null; // { customerKey, orderKey, orderId }

/* =========================
  Build seller orders
========================= */
function buildSellerOrders(allOrders) {
  const res = [];

  for (const [customerKey, ordersObj] of Object.entries(allOrders || {})) {
    for (const [orderKey, order] of Object.entries(ordersObj || {})) {
      const items = Array.isArray(order?.items) ? order.items : [];

      const myItems = items.filter(
        (it) => String(it?.sellerId || "") === String(sellerId),
      );

      if (!myItems.length) continue;

      const myTotal = myItems.reduce(
        (sum, it) => sum + computePricing(it).lineTotal,
        0,
      );

      res.push({ customerKey, orderKey, order, myItems, myTotal });
    }
  }

  // default: newest first
  res.sort((a, b) =>
    String(b.order?.date || "").localeCompare(String(a.order?.date || "")),
  );

  return res;
}

/* =========================
  Render table (product-like action buttons + nicer status)
========================= */
function renderTable(list) {
  if (!ordersBody) return;

  if (!list.length) {
    ordersBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-muted text-center py-4">
          No orders found for this seller
        </td>
      </tr>
    `;
    return;
  }

  ordersBody.innerHTML = list
    .map(({ customerKey, orderKey, order, myTotal }) => {
      const orderId = String(order?.id || orderKey);
      const customer = String(order?.customer || "");
      const date = String(order?.date || "");
      const statusRaw = String(order?.status || "pending");
      const status = safeLower(statusRaw);

      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(orderId)}</td>
          <td>${escapeHtml(customer)}</td>
          <td class="text-nowrap">${escapeHtml(date)}</td>
          <td class="text-nowrap fw-bold">${money(myTotal)}</td>
          <td>
            <span class="badge-status ${escapeHtml(status)}">
              ${escapeHtml(statusRaw)}
            </span>
          </td>
          <td class="text-end">
            <button class="icon-btn view"
                    data-view="1"
                    data-customer="${escapeHtml(customerKey)}"
                    data-order="${escapeHtml(orderKey)}"
                    title="View">
              <i class="fa-solid fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  ordersBody.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openOrderModal(btn.dataset.customer, btn.dataset.order);
    });
  });
}

/* =========================
  Filters
========================= */
function applyFilters() {
  const q = safeLower(orderSearchEl?.value || "");
  const st = safeLower(statusFilterEl?.value || "all");
  const sort = safeLower(sortFilterEl?.value || "date_desc");

  let list = [...cacheOrders];

  // search: order id / customer / date / item name
  if (q) {
    list = list.filter((o) => {
      const order = o.order || {};
      const orderId = String(order?.id || o.orderKey || "");
      const customer = String(order?.customer || "");
      const date = String(order?.date || "");
      const inOrder =
        safeLower(orderId).includes(q) ||
        safeLower(customer).includes(q) ||
        safeLower(date).includes(q);

      const inItems = (o.myItems || []).some((it) =>
        safeLower(it?.name).includes(q),
      );

      return inOrder || inItems;
    });
  }

  // status
  if (st !== "all") {
    list = list.filter(
      (o) => safeLower(o.order?.status || "pending") === st,
    );
  }

  // sort
  list.sort((a, b) => {
    if (sort === "date_asc") return String(a.order?.date || "").localeCompare(String(b.order?.date || ""));
    if (sort === "date_desc") return String(b.order?.date || "").localeCompare(String(a.order?.date || ""));
    if (sort === "total_asc") return (Number(a.myTotal) || 0) - (Number(b.myTotal) || 0);
    if (sort === "total_desc") return (Number(b.myTotal) || 0) - (Number(a.myTotal) || 0);
    return 0;
  });

  renderTable(list);
}

/* =========================
  Modal open
========================= */
function openOrderModal(customerKey, orderKey) {
  const found = cacheOrders.find(
    (o) => o.customerKey === customerKey && o.orderKey === orderKey,
  );
  if (!found) return;

  const { order, myItems, myTotal } = found;
  const orderId = String(order?.id || orderKey);

  currentOpen = { customerKey, orderKey, orderId };

  if (statusMsg) statusMsg.textContent = "";

  if (mOrderId) mOrderId.textContent = orderId;
  if (mCustomer) mCustomer.textContent = String(order?.customer || "");
  if (mDate) mDate.textContent = String(order?.date || "");
  if (mAddress) mAddress.textContent = String(order?.address || "");
  if (mTotal) mTotal.textContent = money(myTotal);

  if (mItems) {
    mItems.innerHTML = myItems
      .map((it) => {
        const { qty, unitPrice, lineTotal } = computePricing(it);
        return `
          <tr>
            <td>${escapeHtml(it?.name || "")}</td>
            <td class="text-nowrap">${money(unitPrice)}</td>
            <td class="text-nowrap">${qty}</td>
            <td class="text-nowrap fw-bold">${money(lineTotal)}</td>
          </tr>
        `;
      })
      .join("");
  }

  if (mStatus) mStatus.value = String(order?.status || "pending");

  bsViewModal?.show();
}

/* =========================
  Stock deduction (by product name)
  - بدون تعديل cart.js
========================= */
async function deductStockForSellerItems(order) {
  const productsSnap = await get(ref(db, `seller-products/${sellerId}`));
  const products = productsSnap.val() || {};

  const byName = new Map();
  for (const [pid, p] of Object.entries(products)) {
    const k = normKey(p?.name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push({
      id: pid,
      name: p?.name || "",
      quantity: Number(p?.quantity || 0),
    });
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const myItems = items.filter((it) => String(it?.sellerId || "") === String(sellerId));

  const planned = [];
  for (const it of myItems) {
    const k = normKey(it?.name);
    const qtyNeed = Number(it?.qty || 0);

    if (!k || qtyNeed <= 0) continue;

    const matches = byName.get(k) || [];
    if (matches.length === 0) throw new Error(`Product not found for item: ${it?.name}`);
    if (matches.length > 1) throw new Error(`Duplicate product names found for: ${it?.name}. Make names unique.`);

    const prod = matches[0];
    const newQty = prod.quantity - qtyNeed;

    if (newQty < 0) {
      throw new Error(`Not enough stock for "${prod.name}". Available: ${prod.quantity}, requested: ${qtyNeed}`);
    }

    planned.push({ pid: prod.id, newQty });
  }

  for (const x of planned) {
    await update(ref(db, `seller-products/${sellerId}/${x.pid}`), { quantity: x.newQty });
  }
}

/* =========================
  Save Status button
========================= */
saveStatusBtn?.addEventListener("click", async () => {
  if (!currentOpen) return;

  const { customerKey, orderKey } = currentOpen;
  const newStatus = mStatus?.value || "pending";

  if (statusMsg) statusMsg.textContent = "Saving...";

  try {
    const orderRef = ref(db, `orders/${customerKey}/${orderKey}`);
    const snap = await get(orderRef);
    const order = snap.val() || {};
    const oldStatus = String(order?.status || "pending");

    // ✅ خصم مرة واحدة عند pending -> processing
    if (oldStatus === "pending" && newStatus === "processing") {
      await deductStockForSellerItems(order);
    }

    await update(orderRef, { status: newStatus });

    if (statusMsg) statusMsg.textContent = "Saved ✅";

    // ✅ update UI immediately
    const local = cacheOrders.find(o => o.customerKey === customerKey && o.orderKey === orderKey);
    if (local) local.order.status = newStatus;
    applyFilters();

  } catch (e) {
    console.error(e);
    if (statusMsg) statusMsg.textContent = e?.message ? `Failed: ${e.message}` : "Failed ❌";
    alert(e?.message || "Failed to save status / deduct stock");
  }
});

/* =========================
  Filter events
========================= */
orderSearchEl?.addEventListener("input", applyFilters);
statusFilterEl?.addEventListener("change", applyFilters);
sortFilterEl?.addEventListener("change", applyFilters);

clearFiltersBtn?.addEventListener("click", () => {
  if (orderSearchEl) orderSearchEl.value = "";
  if (statusFilterEl) statusFilterEl.value = "all";
  if (sortFilterEl) sortFilterEl.value = "date_desc";
  applyFilters();
});

refreshOrdersBtn?.addEventListener("click", () => {
  // مفيش fetch manual لأن onValue شغال، فبنكتفي بإعادة apply للفلتر
  applyFilters();
});

/* =========================
  Listen orders
========================= */
const ordersRef = ref(db, "orders");
onValue(ordersRef, (snap) => {
  const all = snap.val() || {};
  cacheOrders = buildSellerOrders(all);
  applyFilters(); // ✅ بدل renderTable(cacheOrders)
});