import { db } from './firebase.js';
import { ref, remove, update, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


const cloudName = "dtw2jaesz";
const uploadPreset = "seller";

let allProducts = {};
let currentFilter = 'all';

async function initProducts() {
    setupRealtimeListeners();
    setupMobileSidebar();
}

function setupRealtimeListeners() {
    onValue(ref(db, 'seller-products'), (snapshot) => {

        if (!snapshot.exists()) {
            allProducts = {};
            updateDashboard(allProducts);
            return;
        }

        let mergedProducts = {};

        Object.entries(snapshot.val()).forEach(([userId, userProducts]) => {
            if (!userProducts) return;  
            Object.entries(userProducts).forEach(([productId, product]) => {
                mergedProducts[productId] = {
                    id: productId,
                    userId: userId,
                    name: product.name || 'Unnamed Product',
                    category: product.category || 'General',
                    price: Number(product.price || 0),
                    quantity: Number(product.quantity || 0),
                    imageUrl: product.imageUrl || 'https://via.placeholder.com/150',
                    flagged: product.flagged || false,
                    createdAt: product.createdAt || Date.now(),
                    updatedAt: product.updatedAt || Date.now()
                };
            });
        });

        allProducts = mergedProducts;
        updateDashboard(allProducts);
    });
}

function updateDashboard(products) {
    const productList = Object.values(products);

    const total = productList.length;
    const flagged = productList.filter(p => p.flagged).length;
    const outOfStock = productList.filter(p => p.quantity <= 0).length;
    const active = total - flagged;

    document.getElementById('totalProductsCount').textContent = total;
    document.getElementById('activeProductsCount').textContent = active;
    document.getElementById('flaggedProductsCount').textContent = flagged;
    document.getElementById('outOfStockCount').textContent = outOfStock;

    applyFiltersAndSearch();
}

function displayProducts(filteredList) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No products found</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredList.map(product => {
        const quantity = Number(product.quantity || 0);
        const isOutOfStock = quantity <= 0;
        const isFlagged = product.flagged || false;

        const statusBadge = isFlagged 
            ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle">⚠️ Flagged</span>'
            : (isOutOfStock 
                ? '<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Out of Stock</span>'
                : '<span class="badge bg-success-subtle text-success border border-success-subtle">Active</span>');

        const date = product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'N/A';

        return `
            <tr ${isFlagged ? 'class="product-flagged"' : ''}>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        ${product.imageUrl 
                            ? `<img src="${product.imageUrl}" alt="${product.name}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">`
                            : `<div style="width:50px;height:50px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-muted"></i></div>`}
                        <div><div class="fw-semibold">${product.name}</div></div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border">${product.category}</span></td>
                <td class="fw-bold text-success">$${product.price.toFixed(2)}</td>
                <td><span class="${isOutOfStock ? 'text-danger fw-bold' : 'text-primary fw-semibold'}">${quantity}</span></td>
                <td>${statusBadge}</td>
                <td class="text-muted small">${date}</td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button onclick="viewProduct('${product.id}')" class="btn btn-sm btn-outline-info" title="View Details"><i class="bi bi-eye"></i></button>
                        <button onclick="toggleFlag('${product.id}', ${isFlagged})" class="btn btn-sm btn-outline-warning" title="${isFlagged ? 'Unflag' : 'Flag'}"><i class="bi ${isFlagged ? 'bi-flag-fill' : 'bi-flag'}"></i></button>
                        <button onclick="deleteProduct('${product.id}')" class="btn btn-sm btn-outline-danger" title="Delete"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function applyFiltersAndSearch() {
    const searchTerm = document.getElementById('searchProduct')?.value.toLowerCase().trim() || '';
    let filtered = Object.values(allProducts);

    if (currentFilter === 'active') filtered = filtered.filter(p => !p.flagged && p.quantity > 0);
    if (currentFilter === 'flagged') filtered = filtered.filter(p => p.flagged);
    if (currentFilter === 'outofstock') filtered = filtered.filter(p => p.quantity <= 0);

    if (searchTerm) {
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(searchTerm) || (p.category || '').toLowerCase().includes(searchTerm));
    }

    displayProducts(filtered);
}

window.viewProduct = function(id) {
    const product = allProducts[id];
    if (!product) return;

    const modalContent = `
        <div class="modal fade" id="viewProductModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Product Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${product.imageUrl ? `<img src="${product.imageUrl}" class="img-fluid rounded mb-3" alt="${product.name}">` : '<div class="bg-light rounded p-5 text-center mb-3"><i class="bi bi-image fs-1 text-muted"></i></div>'}
                        <h4>${product.name}</h4>
                        <p class="text-muted">${product.category}</p>
                        <hr>
                        <div class="row">
                            <div class="col-6"><strong>Price:</strong> <span class="text-success">$${product.price.toFixed(2)}</span></div>
                            <div class="col-6"><strong>Quantity:</strong> <span class="text-primary">${product.quantity}</span></div>
                        </div>
                        <hr>
                        <p><strong>Created:</strong> ${new Date(product.createdAt).toLocaleString()}</p>
                        <p><strong>Updated:</strong> ${new Date(product.updatedAt).toLocaleString()}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('viewProductModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalContent);

    const modal = new bootstrap.Modal(document.getElementById('viewProductModal'));
    modal.show();
    document.getElementById('viewProductModal').addEventListener('hidden.bs.modal', function () { this.remove(); });
};
async function uploadToCloudinary(file) {

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if (!data.secure_url) {
        throw new Error("Image upload failed");
    }

    return data.secure_url;
}
window.addProduct = async function() {

    const nameEl = document.getElementById('productName');
    const categoryEl = document.getElementById('productCategory');
    const priceEl = document.getElementById('productPrice');
    const stockEl = document.getElementById('productStock');
    const imageFileEl = document.getElementById('productImageFile'); // 👈 بدل URL
    const addModalEl = document.getElementById('addProductModal');

    const userId = 'defaultUser';

    const name = nameEl.value.trim();
    const category = categoryEl.value;
    const price = parseFloat(priceEl.value) || 0;
    const quantity = parseInt(stockEl.value) || 0;
    const file = imageFileEl?.files[0];

    if (!name || !category || price <= 0) {
        return alert('Please enter valid product data.');
    }

    try {

        let imageUrl = "https://via.placeholder.com/150";

        // ✅ لو في صورة ارفعها على Cloudinary
        if (file) {
            imageUrl = await uploadToCloudinary(file);
        }

        const timestamp = Date.now();
        const newRef = push(ref(db, `seller-products/${userId}`));

        await set(newRef, { 
            name, 
            category, 
            price, 
            quantity, 
            imageUrl, 
            flagged: false, 
            createdAt: timestamp, 
            updatedAt: timestamp 
        });

        const modalInstance =
            bootstrap.Modal.getInstance(addModalEl) ||
            new bootstrap.Modal(addModalEl);

        modalInstance.hide();
        document.getElementById('addProductForm').reset();

        alert('✅ Product added successfully!');

    } catch (e) {
        console.error(e);
        alert('❌ Error adding product: ' + e.message);
    }
};
window.deleteProduct = async function(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const product = allProducts[id];
        if (!product) return;
        await remove(ref(db, `seller-products/${product.userId}/${id}`));
        alert('Product deleted successfully!');
    } catch (e) { console.error(e); alert('Error deleting product'); }
};

window.toggleFlag = async function(id, currentStatus) {
    try {
        const product = allProducts[id];
        if (!product) return;
        await update(ref(db, `seller-products/${product.userId}/${id}`), { flagged: !currentStatus, updatedAt: Date.now() });
    } catch (e) { console.error(e); alert('Error updating product'); }
};

window.filterProducts = function(type) {
    currentFilter = type;
    document.querySelectorAll('[id^="filter"]').forEach(btn => btn.classList.remove('active'));
    const button = document.getElementById('filter' + type.charAt(0).toUpperCase() + type.slice(1));
    if (button) button.classList.add('active');
    applyFiltersAndSearch();
};

document.getElementById('searchProduct')?.addEventListener('input', applyFiltersAndSearch);

function setupMobileSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar && sidebarOverlay) {
        sidebarToggle.addEventListener('click', e => { e.stopPropagation(); sidebar.classList.toggle('show'); sidebarOverlay.classList.toggle('show'); });
        sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('show'); sidebarOverlay.classList.remove('show'); });
        sidebar.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { if(window.innerWidth<=768){sidebar.classList.remove('show'); sidebarOverlay.classList.remove('show');}}));
        document.addEventListener('keydown', e => { if(e.key==='Escape' && sidebar.classList.contains('show')){sidebar.classList.remove('show'); sidebarOverlay.classList.remove('show');} });
    }
}

document.addEventListener('DOMContentLoaded', initProducts);