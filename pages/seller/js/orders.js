const ordersBody = document.getElementById("ordersBody");

// ✅ Demo data (ضيفت address + items)
let orders = [
  {
    id: "ORD-001",
    customer: "Alice Johnson",
    date: "2026-01-15",
    status: "delivered",
    address: "12 Street, Cairo, Egypt",
    items: [
      { name: "Wireless Headphones", price: 249.99, qty: 1 },
      { name: "USB-C Cable", price: 59.98, qty: 1 }
    ]
  },
  {
    id: "ORD-002",
    customer: "Bob Smith",
    date: "2026-02-01",
    status: "shipped",
    address: "5 Road, Giza, Egypt",
    items: [
      { name: "Mechanical Keyboard", price: 159.99, qty: 1 }
    ]
  },
  {
    id: "ORD-003",
    customer: "Charlie Brown",
    date: "2026-02-10",
    status: "processing",
    address: "10 Avenue, Alexandria, Egypt",
    items: [
      { name: "Bluetooth Speaker", price: 79.99, qty: 2 },
      { name: "Mouse Pad", price: 20.00, qty: 1 }
    ]
  },
  {
    id: "ORD-004",
    customer: "Alice Johnson",
    date: "2026-02-14",
    status: "pending",
    address: "12 Street, Cairo, Egypt",
    items: [
      { name: "Phone Case", price: 15.00, qty: 2 },
      { name: "Screen Protector", price: 9.50, qty: 3 }
    ]
  }
];

function calcTotal(order) {
  return order.items.reduce((sum, it) => sum + (it.price * it.qty), 0);
}

function statusClass(s){
  if (s === "delivered") return "st-delivered";
  if (s === "shipped") return "st-shipped";
  if (s === "processing") return "st-processing";
  return "st-pending";
}

function render(){
  ordersBody.innerHTML = orders.map(o => {
    const total = calcTotal(o);
    return `
      <tr>
        <td class="fw-bold">${o.id}</td>
        <td>${o.customer}</td>
        <td class="text-nowrap">${o.date}</td>
        <td class="text-nowrap">$${total.toFixed(2)}</td>
        <td><span class="badge-status ${statusClass(o.status)}">${o.status}</span></td>
        <td class="text-end">
          <button class="icon-btn" title="View" data-view="${o.id}">
            <i class="fa-regular fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // bind view buttons
  ordersBody.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => viewOrder(btn.dataset.view));
  });
}

// ===== Modal wiring =====
const modalEl = document.getElementById("viewOrderModal");
const bsModal = new bootstrap.Modal(modalEl);

const mOrderId = document.getElementById("mOrderId");
const mCustomer = document.getElementById("mCustomer");
const mDate = document.getElementById("mDate");
const mAddress = document.getElementById("mAddress");
const mTotal = document.getElementById("mTotal");
const mItems = document.getElementById("mItems");
const mStatus = document.getElementById("mStatus");
const saveStatusBtn = document.getElementById("saveStatusBtn");
const statusMsg = document.getElementById("statusMsg");

let currentOrderId = null;

function viewOrder(orderId){
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  currentOrderId = orderId;

  // fill modal
  mOrderId.textContent = order.id;
  mCustomer.textContent = order.customer;
  mDate.textContent = order.date;
  mAddress.textContent = order.address;

  const total = calcTotal(order);
  mTotal.textContent = `$${total.toFixed(2)}`;

  mStatus.value = order.status;
  statusMsg.textContent = "";

  mItems.innerHTML = order.items.map(it => {
    const lineTotal = it.price * it.qty;
    return `
      <tr>
        <td>${it.name}</td>
        <td class="text-nowrap">$${it.price.toFixed(2)}</td>
        <td class="text-nowrap">${it.qty}</td>
        <td class="text-nowrap">$${lineTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  bsModal.show();
}

saveStatusBtn.addEventListener("click", () => {
  if (!currentOrderId) return;

  const order = orders.find(o => o.id === currentOrderId);
  if (!order) return;

  order.status = mStatus.value;
  statusMsg.textContent = "Saved ✅";

  render();

  // ✅ هنا لما نربط Firebase هنكتب update للـ status
  // update(ref(db, `orders/${order.id}`), { status: order.status })
});

render();
