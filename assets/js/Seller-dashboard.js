// assets/js/dashboard.js
import { db } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
   Helpers
========================= */

function getSellerId() {
  return localStorage.getItem("sellerId") || null;
}

function money(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
  else console.warn("Missing element id:", id);
}

function calcSellerOrderTotal(order, sellerId) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const sellerItems = items.filter((it) => it?.sellerId === sellerId);

  return sellerItems.reduce((sum, it) => {
    const price = Number(it.price ?? it.unitPrice ?? 0);
    const qty = Number(it.qty ?? it.quantity ?? 1);
    return sum + price * qty;
  }, 0);
}

function getMonthIndex(order) {
  const t = order?.createdAt ?? order?.created_at ?? order?.timestamp ?? order?.date;
  if (!t) return null;

  const d = new Date(typeof t === "number" ? (t < 10_000_000_000 ? t * 1000 : t) : t);
  return isNaN(d.getTime()) ? null : d.getMonth();
}

/* =========================
   Charts
========================= */

let revenueChart = null;
let productsChart = null;

function initRevenueChart() {
  const canvas = document.getElementById("revenueChart");
  if (!canvas) return console.warn("Missing canvas #revenueChart");

  revenueChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{
        label: "Monthly Revenue ($)",
        data: Array(12).fill(0),
        borderRadius: 8,
        backgroundColor: "rgba(54, 163, 235, 0.39)",
        borderColor: "rgba(54, 162, 235, 1)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function initProductsChart() {
  const canvas = document.getElementById("productsChart");
  if (!canvas) return console.warn("Missing canvas #productsChart");

  productsChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: [],
     datasets: [{
  data: [],
  borderWidth: 2,
  backgroundColor: [],
  borderColor: "#fff"
}]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 14, padding: 15 }
        }
      }
    }
  });
}

/* =========================
   Firebase Listeners
========================= */

function listenDashboardFromFirebase() {
  const sellerId = getSellerId();

  if (!sellerId) {
    console.error("sellerId missing in localStorage");
    setText("totalOrders", 0);
    setText("totalRevenue", money(0));
    setText("avgOrderValue", money(0));
    setText("totalProducts", 0);
    return;
  }

  // ===== ORDERS =====
  const ordersRootRef = ref(db, "orders");
  onValue(ordersRootRef, (snap) => {
    const root = snap.val() || {};

    const allOrders = [];
    for (const customerKey of Object.keys(root)) {
      const customerOrders = root[customerKey] || {};
      for (const orderPushId of Object.keys(customerOrders)) {
        allOrders.push(customerOrders[orderPushId]);
      }
    }

    const sellerOrders = allOrders.filter((o) => {
      const items = Array.isArray(o?.items) ? o.items : [];
      return items.some((it) => it?.sellerId === sellerId);
    });

    const totalOrders = sellerOrders.length;
    let totalRevenue = 0;
    const monthly = Array(12).fill(0);

    for (const o of sellerOrders) {
      const t = calcSellerOrderTotal(o, sellerId);
      totalRevenue += t;

      const mi = getMonthIndex(o);
      if (mi !== null) monthly[mi] += t;
    }

    const avgOrderValue = totalOrders ? (totalRevenue / totalOrders) : 0;

    setText("totalOrders", totalOrders);
    setText("totalRevenue", money(totalRevenue));
    setText("avgOrderValue", money(avgOrderValue));

    if (revenueChart) {
      revenueChart.data.datasets[0].data = monthly.map(v => Number(v.toFixed(2)));
      revenueChart.update();
    }
  });

  // ===== PRODUCTS (total + by category chart) =====
// ===== PRODUCTS (total + by category chart) =====
const productsRef = ref(db, `seller-products/${sellerId}`);
const categoriesRef = ref(db, `seller-categories/${sellerId}`);

function normalizeName(name) {
  return String(name ?? "").trim();
}
function normalizeKey(name) {
  return normalizeName(name).toLowerCase().replace(/\s+/g, " ");
}
// عرض الاسم بشكل ثابت (اختياري)
function displayName(name) {
  const n = normalizeName(name).replace(/\s+/g, " ");
  // Title Case بسيطة:
  return n.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

let catsMap = new Map(); // key -> display label
let productCounts = {};  // key -> number

function updateProductsChart() {
  if (!productsChart) return;

  // mergedCounts: key -> count
  const mergedCounts = {};

  // 1) كل الكاتيجوري من جدول seller-categories
  for (const [key, label] of catsMap.entries()) {
    mergedCounts[key] = 0;
  }

  // 2) أضف counts من المنتجات
  for (const [key, n] of Object.entries(productCounts)) {
    mergedCounts[key] = (mergedCounts[key] || 0) + n;
  }

  // (اختياري) لو عايزة uncategorized يظهر حتى لو صفر:
  if (!mergedCounts["uncategorized"]) mergedCounts["uncategorized"] = 0;

  // entries array for sorting
  const entries = Object.entries(mergedCounts).sort((a, b) => b[1] - a[1]);

  // labels: استخدم display label من catsMap، ولو مش موجودة (uncategorized) اعملها Label
  const labels = entries.map(([key]) => catsMap.get(key) || (key === "uncategorized" ? "Uncategorized" : key));
  const values = entries.map(([_, n]) => n);

  const colors = [
    "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
    "#8B5CF6", "#EF4444", "#14B8A6", "#F43F5E", "#84CC16"
  ];

  productsChart.data.labels = labels;
  productsChart.data.datasets[0].data = values;
  productsChart.data.datasets[0].backgroundColor =
    labels.map((_, i) => colors[i % colors.length]);

  productsChart.update();
}

// ✅ اقرأ الأقسام من seller-categories
onValue(categoriesRef, (snap) => {
  const data = snap.val() || {};

  // catsMap: key -> label
  const map = new Map();

  Object.values(data).forEach((c) => {
    const raw = c?.name ?? "";
    const key = normalizeKey(raw);
    if (!key) return;

    // لو الاسم موجود قبل كده بحروف مختلفة، نخلي أول واحد هو الـ label
    if (!map.has(key)) map.set(key, displayName(raw));
  });

  catsMap = map;
  updateProductsChart();
});

// ✅ اقرأ المنتجات واحسب counts على نفس الـ key الموحد
onValue(productsRef, (snap) => {
  const data = snap.val() || {};

  const totalProducts = Object.keys(data).length;
  setText("totalProducts", totalProducts);

  const counts = {}; // key -> number

  Object.values(data).forEach((p) => {
    // المنتجات القديمة أو الجديدة:
    const rawCat = p?.categoryName ?? p?.category ?? "";
    const key = normalizeKey(rawCat);

    const finalKey = key || "uncategorized";
    counts[finalKey] = (counts[finalKey] || 0) + 1;
  });

  productCounts = counts;
  updateProductsChart();
});
}

/* =========================
   Boot
========================= */

window.addEventListener("load", async () => {
  // 1) load sidebar first (عشان العناصر تبقى موجودة لو بتتأثر)
  try {
    const res = await fetch("sidebar.html");
    const data = await res.text();
    const container = document.getElementById("sidebar-container");
    if (container) container.innerHTML = data;

    const mod = await import("./sidebar-account.js");
    await mod.initSidebarAccount();
  } catch (e) {
    console.error("Sidebar load error:", e);
  }

  // 2) init charts once
  initRevenueChart();
  initProductsChart();

  // 3) listeners
  listenDashboardFromFirebase();
});