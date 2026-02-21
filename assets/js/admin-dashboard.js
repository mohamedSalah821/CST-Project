import { db } from './firebase.js';
import { ref, get, onValue } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let allUsers = {};
let allProducts = {};
let allOrders = {};

let usersChart = null;
let categoryChart = null;
let revenueChart = null;

/* ===========================
   1️⃣ INIT DASHBOARD
=========================== */
async function initDashboard() {
    await Promise.all([
        loadUsers(),
        loadProducts(),
        loadOrders()
    ]);

    calculateStatistics();
    setupRealtimeListeners();
}

/* ===========================
   2️⃣ LOAD DATA
=========================== */

async function loadUsers() {
    const snapshot = await get(ref(db, 'users'));
    allUsers = snapshot.exists() ? snapshot.val() : {};
}

async function loadProducts() {
    const snapshot = await get(ref(db, 'seller-products'));

    let merged = {};

    if (snapshot.exists()) {
        Object.values(snapshot.val()).forEach(userProducts => {
            Object.entries(userProducts).forEach(([id, product]) => {
                merged[id] = product;
            });
        });
    }

    allProducts = merged;
}

async function loadOrders() {
    const snapshot = await get(ref(db, 'orders'));
    allOrders = snapshot.exists() ? snapshot.val() : {};
}

/* ===========================
   3️⃣ CALCULATE STATISTICS
=========================== */

function calculateStatistics() {

    const usersArray = Object.values(allUsers);

    const totalSellers = usersArray.filter(u =>
        u.role === 'seller' || u.userType === 'seller'
    ).length;

    const totalCustomers = usersArray.filter(u =>
        u.role === 'customer' || u.userType === 'customer'
    ).length;

    const totalProducts = Object.keys(allProducts).length;
    const totalOrders = Object.keys(allOrders).length;

    let totalRevenue = 0;
    let productSales = {};
    let categoryCounts = {};
    let monthlyRevenue = {};

    /* ===== ORDERS LOOP ===== */
    Object.values(allOrders).forEach(order => {

        totalRevenue += Number(order.total || 0);

        const productId = order.productId;
        const quantity = Number(order.quantity || 1);

        if (productId) {
            productSales[productId] =
                (productSales[productId] || 0) + quantity;
        }

        if (order.createdAt) {
            const date = new Date(order.createdAt);
            const month = date.toLocaleString('default', { month: 'short' });

            monthlyRevenue[month] =
                (monthlyRevenue[month] || 0) + Number(order.total || 0);
        }
    });

    /* ===== PRODUCTS LOOP ===== */
    Object.values(allProducts).forEach(product => {
        const cat = product.category || "Other";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    /* ===== UPDATE CARDS ===== */
    document.getElementById('totalUsers').textContent =
        usersArray.length;

    document.getElementById('totalProducts').textContent =
        totalProducts;

    document.getElementById('totalOrders').textContent =
        totalOrders;

    document.getElementById('totalSales').textContent =
        "$" + totalRevenue.toLocaleString();

    /* ===== UPDATE TABLE ===== */
    renderMostSoldTable(productSales);

    /* ===== UPDATE CHARTS ===== */
    updateCharts(
        totalSellers,
        totalCustomers,
        categoryCounts,
        monthlyRevenue
    );
}

/* ===========================
   4️⃣ UPDATE CHARTS
=========================== */

function updateCharts(sellers, customers, categoryCounts, monthlyRevenue) {

    /* USERS DISTRIBUTION */
    const usersCtx =
        document.getElementById('usersChart').getContext('2d');

    if (usersChart) usersChart.destroy();

    usersChart = new Chart(usersCtx, {
        type: 'doughnut',
        data: {
            labels: ['Sellers', 'Customers'],
            datasets: [{
                data: [sellers, customers],
                backgroundColor: ['#ffb703', '#4cc9f0']
            }]
        }
    });

    /* PRODUCTS BY CATEGORY */
    const categoryCtx =
        document.getElementById('categoryChart').getContext('2d');

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    '#4361ee',
                    '#f72585',
                    '#7209b7',
                    '#3a0ca3',
                    '#4cc9f0',
                    '#2ec4b6'
                ]
            }]
        }
    });

    /* MONTHLY REVENUE */
    const revenueCtx =
        document.getElementById('revenueChart').getContext('2d');

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: Object.keys(monthlyRevenue),
            datasets: [{
                label: 'Monthly Revenue',
                data: Object.values(monthlyRevenue),
                borderColor: '#2ec4b6',
                fill: true,
                tension: 0.3
            }]
        }
    });
}

/* ===========================
   5️⃣ MOST SOLD TABLE
=========================== */

function renderMostSoldTable(productSales) {

    const tbody =
        document.getElementById('mostSoldProductsTable');

    const sorted =
        Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

    if (sorted.length === 0) {
        tbody.innerHTML =
            `<tr>
                <td colspan="6" class="text-center">
                    No sales data yet
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(([id, count], index) => {

        const product =
            allProducts[id] ||
            { name: "Deleted Product", category: "N/A", price: 0, quantity: 0 };

        return `
            <tr>
                <td>${index + 1}</td>
                <td class="fw-bold">${product.name}</td>
                <td>
                    <span class="badge bg-light text-dark border">
                        ${product.category}
                    </span>
                </td>
                <td>$${Number(product.price).toFixed(2)}</td>
                <td class="fw-bold text-primary">${count}</td>
                <td>
                    <span class="badge ${
                        product.quantity > 0 ? 'bg-success' : 'bg-danger'
                    }">
                        ${product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/* ===========================
   6️⃣ REALTIME LISTENERS
=========================== */

function setupRealtimeListeners() {

    onValue(ref(db, 'orders'), () => {
        loadOrders().then(calculateStatistics);
    });

    onValue(ref(db, 'users'), () => {
        loadUsers().then(calculateStatistics);
    });

    onValue(ref(db, 'seller-products'), () => {
        loadProducts().then(calculateStatistics);
    });
}

/* ===========================
   7️⃣ SIDEBAR TOGGLE
=========================== */

document.addEventListener('DOMContentLoaded', () => {

    initDashboard();

    const toggleBtn = document.getElementById('sidebarToggle');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.getElementById('sidebar')
                .classList.toggle('show');

            document.getElementById('sidebarOverlay')
                .classList.toggle('active');
        });
    }
});