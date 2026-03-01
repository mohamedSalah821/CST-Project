import { db } from './firebase.js'; 
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

    let totalRevenue = 0;
    let productSales = {};
    let categoryCounts = {};
    let weeklyRevenue = {};
    let orderCount = 0;
    
    Object.values(allOrders).forEach(userOrders => {
        
        Object.values(userOrders).forEach(order => {
            
            orderCount++;
            let orderTotal = 0;

            if (order.items && Array.isArray(order.items)) {
                
                order.items.forEach(item => {
                    
                    const price = parseFloat(item.price) || 0;
                    const qty = parseInt(item.qty) || 1;
                    
                    orderTotal += price * qty;

                    const productName = item.name || 'Unknown';
                    productSales[productName] = (productSales[productName] || 0) + qty;
                });
            }

            totalRevenue += orderTotal;

                if (order.date) {
            const dateObj = new Date(order.date);
            
            const dayOfWeek = dateObj.getDay(); 
            const diff = dateObj.getDate() - dayOfWeek; 
            const startOfWeek = new Date(dateObj.setDate(diff));
            
            const weekLabel = "Week of " + startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' });
            
            weeklyRevenue[weekLabel] = (weeklyRevenue[weekLabel] || 0) + orderTotal;
        }

        updateCharts(totalSellers, totalCustomers, categoryCounts, weeklyRevenue);
        });
    });

       /* ===== PRODUCTS LOOP ===== */
    Object.values(allProducts).forEach(product => {
        const cat = product.category || "Other";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    /* ===== UPDATE CARDS ===== */
    document.getElementById('totalUsers').textContent = usersArray.length;
    document.getElementById('totalProducts').textContent = Object.keys(allProducts).length;
    document.getElementById('totalOrders').textContent = orderCount;
    document.getElementById('totalSales').textContent = "$" + totalRevenue.toFixed(2);

    /* ===== UPDATE TABLE ===== */
    renderMostSoldTable(productSales);

    /* ===== UPDATE CHARTS ===== */
    updateCharts(totalSellers, totalCustomers, categoryCounts, weeklyRevenue);
}

/* ===========================
   4️⃣ UPDATE CHARTS
=========================== */
function updateCharts(sellers, customers, categoryCounts, weeklyRevenue) {
    const usersCtx = document.getElementById('usersChart').getContext('2d');
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

    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: ['#4361ee', '#f72585', '#7209b7', '#3a0ca3', '#4cc9f0', '#2ec4b6']
            }]
        }
    });

 const revenueCtx = document.getElementById('revenueChart').getContext('2d');

const gradientFill = revenueCtx.createLinearGradient(0, 0, 0, 400);
gradientFill.addColorStop(0, 'rgba(46, 196, 182, 0.6)'); 
gradientFill.addColorStop(0.5, 'rgba(46, 196, 182, 0.2)'); 
gradientFill.addColorStop(1, 'rgba(46, 196, 182, 0)');    

if (revenueChart) revenueChart.destroy();

revenueChart = new Chart(revenueCtx, {
    type: 'line',
    data: {
        labels: Object.keys(weeklyRevenue),
        datasets: [{
            label: 'Weekly Revenue',
            data: Object.values(weeklyRevenue),
            
            borderColor: '#2ec4b6',
            borderWidth: 4,
            fill: true,
            backgroundColor: gradientFill,
            tension: 0.5, 
            
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 3,
            pointHoverRadius: 8,
            pointHoverBorderWidth: 4,
            
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 10
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { top: 20 } 
        },
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: { color: '#999', font: { size: 11 } }
            },
            y: {
                display: true,
                beginAtZero: true,
                grid: { 
                    color: 'rgba(200, 200, 200, 0.1)',
                    drawBorder: false 
                },
                ticks: {
                    color: '#999',
                    padding: 10,
                    callback: (value) => '$' + value
                }
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeInOutQuart'
        }
    }
});
}

/* ===========================
   5️⃣ MOST SOLD TABLE
=========================== */
function renderMostSoldTable(productSales) {
    const tbody = document.getElementById('mostSoldProductsTable');
    const sorted = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No sales data yet</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(([id, count], index) => {
        const product = allProducts[id] || 
            Object.values(allProducts).find(p => p.name === id) ||
            { name: id, category: "N/A", price: 0, quantity: 0 };

        return `
            <tr>
                <td>${index + 1}</td>
                <td class="fw-bold">${product.name && product.name.length > 25 ? product.name.substring(0, 25) + "..." : product.name || "Unnamed Product"}</td>
                <td><span class="badge bg-light text-dark border">${product.category}</span></td>
                <td>$${Number(product.price).toFixed(2)}</td>
                <td class="fw-bold text-primary">${count}</td>
                <td>
                    <span class="badge ${product.quantity > 0 ? 'bg-success' : 'bg-danger'}">
                        ${product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
            </tr>`;
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

document.addEventListener('DOMContentLoaded', function() {
        initDashboard();

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('active');
        });
    }
});
/* 🚪 EVENT LOGOUT
=========================== */
window.logout = function(e) {
    if (e) e.preventDefault(); 

    localStorage.removeItem('admin_session');
    
    localStorage.clear();
    sessionStorage.clear();

    window.location.replace("../../login.html");
};