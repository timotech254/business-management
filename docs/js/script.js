/* =========================
   FIREBASE SETUP
   ========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* 🔐 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAGITfHWQ5B0-bsMn4VSe3QlZ3ZtBEIP00",
  authDomain: "business-management-55657.firebaseapp.com",
  projectId: "business-management-55657",
  storageBucket: "business-management-55657.firebasestorage.app",
  messagingSenderId: "1092549824400",
  appId: "1:1092549824400:web:cceba12bef33f9f07bad15"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const itemsRef = collection(db, "items");
const ordersRef = collection(db, "orders");

/* =========================
   DOM ELEMENTS
   ========================= */
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

const form = document.getElementById("itemForm");
const itemName = document.getElementById("itemName");
const incomingPrice = document.getElementById("incomingPrice");
const outgoingPrice = document.getElementById("outgoingPrice");
const quantityInput = document.getElementById("quantity");
const table = document.getElementById("itemTable");
const searchInput = document.getElementById("searchInput");
const totalProfitEl = document.getElementById("totalProfit");
const exportBtn = document.getElementById("exportBtn");
const searchMessage = document.getElementById("searchMessage");

// Orders DOM Elements
const orderForm = document.getElementById("orderForm");
const customerName = document.getElementById("customerName");
const orderedItem = document.getElementById("orderedItem");
const orderedQuantity = document.getElementById("orderedQuantity");
const orderNotes = document.getElementById("orderNotes");
const orderTable = document.getElementById("orderTable");
const orderSearchInput = document.getElementById("orderSearchInput");
const orderExportBtn = document.getElementById("orderExportBtn");
const orderSearchMessage = document.getElementById("orderSearchMessage");

let items = [];
let orders = [];
let editId = null;
let editOrderId = null;

/* =========================
   LOGIN
   ========================= */
const loginBtn = document.getElementById("loginBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginMessage.textContent = "";
  loginMessage.style.color = "";

  loginBtn.disabled = true;
  loginBtn.classList.add("loading");

  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    loginMessage.style.color = "green";
    loginMessage.textContent = "Login successful";

  } catch (err) {
    loginMessage.style.color = "red";
    loginMessage.textContent = err.message;

  } finally {
    loginBtn.disabled = false;
    loginBtn.classList.remove("loading");
  }
});



/* =========================
   LOGOUT
   ========================= */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

/* =========================
   AUTH STATE LISTENER
   ========================= */
onAuthStateChanged(auth, user => {
  if (user) {
    document.querySelector(".container").style.display = "block";
    document.getElementById("authSection").style.display = "none";
    loadItems();
    loadOrders();
  } else {
    document.querySelector(".container").style.display = "none";
    document.getElementById("authSection").style.display = "block";
    items = [];
    orders = [];
    table.innerHTML = "";
    orderTable.innerHTML = "";
    totalProfitEl.textContent = "0";
  }
});

/* =========================
   BUSINESS LOGIC
   ========================= */
function calculateSingleItemProfit(item) {
  return item.outgoing - item.incoming;
}

function calculateProfit(item) {
  return calculateSingleItemProfit(item) * item.quantity;
}

async function loadItems() {
  const snapshot = await getDocs(itemsRef);
  items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderItems(searchInput.value);
}

function renderItems(filter = "") {
  table.innerHTML = "";
  let totalProfit = 0;

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(filter.toLowerCase())
  );

  searchMessage.textContent = filtered.length === 0 ? "Item not found" : "";

  filtered.forEach(item => {
    const singleItemProfit = calculateSingleItemProfit(item);
    const profit = calculateProfit(item);
    totalProfit += profit;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.incoming}</td>
      <td>${item.outgoing}</td>
      <td>${item.quantity}</td>
      <td>${singleItemProfit}</td>
      <td>${profit}</td>
      <td>
        <button onclick="editItem('${item.id}')">Edit</button>
        <button onclick="deleteItem('${item.id}')">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });

  totalProfitEl.textContent = totalProfit;
}

/* =========================
   ADD / UPDATE
   ========================= */
form.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    name: itemName.value,
    incoming: Number(incomingPrice.value),
    outgoing: Number(outgoingPrice.value),
    quantity: Number(quantityInput.value)
  };

  if (editId) {
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    await addDoc(itemsRef, data);
  }

  form.reset();
  loadItems();
});

/* =========================
   EDIT
   ========================= */
window.editItem = id => {
  const item = items.find(i => i.id === id);
  if (!item) return;

  itemName.value = item.name;
  incomingPrice.value = item.incoming;
  outgoingPrice.value = item.outgoing;
  quantityInput.value = item.quantity;
  editId = id;
};

/* =========================
   DELETE
   ========================= */
window.deleteItem = async id => {
  if (confirm("Delete this item?")) {
    await deleteDoc(doc(db, "items", id));
    loadItems();
  }
};

/* =========================
   SEARCH
   ========================= */
searchInput.addEventListener("input", () => {
  renderItems(searchInput.value);
});

/* =========================
   EXPORT TO EXCEL
   ========================= */
exportBtn.addEventListener("click", () => {
  let csv = "Item,Incoming,Outgoing,Quantity,Single Item Profit,Profit\n";
  items.forEach(item => {
    csv += `${item.name},${item.incoming},${item.outgoing},${item.quantity},${calculateSingleItemProfit(item)},${calculateProfit(item)}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "business_report.csv";
  a.click();
  URL.revokeObjectURL(url);
});

/* =========================
   ORDERS MANAGEMENT
   ========================= */

async function loadOrders() {
  const snapshot = await getDocs(ordersRef);
  orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderOrders(orderSearchInput.value);
}

function renderOrders(filter = "") {
  orderTable.innerHTML = "";

  const filtered = orders.filter(o =>
    o.customerName.toLowerCase().includes(filter.toLowerCase()) ||
    o.itemName.toLowerCase().includes(filter.toLowerCase())
  );

  orderSearchMessage.textContent = filtered.length === 0 && filter ? "Order not found" : "";

  filtered.forEach(order => {
    const orderDate = order.date ? new Date(order.date).toLocaleDateString() : "N/A";
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.customerName}</td>
      <td>${order.itemName}</td>
      <td>${order.quantity}</td>
      <td>${order.notes || "-"}</td>
      <td>${orderDate}</td>
      <td>
        <button onclick="editOrder('${order.id}')">Edit</button>
        <button onclick="deleteOrder('${order.id}')">Delete</button>
      </td>
    `;
    orderTable.appendChild(row);
  });
}

orderForm.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    customerName: customerName.value,
    itemName: orderedItem.value,
    quantity: Number(orderedQuantity.value),
    notes: orderNotes.value,
    date: new Date().toISOString()
  };

  if (editOrderId) {
    await updateDoc(doc(db, "orders", editOrderId), data);
    editOrderId = null;
  } else {
    await addDoc(ordersRef, data);
  }

  orderForm.reset();
  loadOrders();
});

window.editOrder = id => {
  const order = orders.find(o => o.id === id);
  if (!order) return;

  customerName.value = order.customerName;
  orderedItem.value = order.itemName;
  orderedQuantity.value = order.quantity;
  orderNotes.value = order.notes || "";
  editOrderId = id;
};

window.deleteOrder = async id => {
  if (confirm("Delete this order?")) {
    await deleteDoc(doc(db, "orders", id));
    loadOrders();
  }
};

orderSearchInput.addEventListener("input", () => {
  renderOrders(orderSearchInput.value);
});

/* =========================
   EXPORT ORDERS TO PDF
   ========================= */
orderExportBtn.addEventListener("click", () => {
  if (orders.length === 0) {
    alert("No orders to export");
    return;
  }

  let pdfContent = "%PDF-1.4\n";
  let objectCount = 1;
  let objects = [];

  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Object 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Object 3: Page
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");

  // Object 4: Stream (Content)
  let content = "BT\n";
  content += "/F1 20 Tf\n50 750 Td\n(Customer Orders & Out of Stock) Tj\n";
  content += "0 -30 Td\n/F1 12 Tf\n";

  let yPos = 700;
  const lineHeight = 15;

  orders.forEach((order, index) => {
    const orderDate = order.date ? new Date(order.date).toLocaleDateString() : "N/A";
    content += `(${index + 1}. ${order.customerName} - ${order.itemName} x${order.quantity} - ${orderDate}) Tj\nT*\n`;
    yPos -= lineHeight;
  });

  content += "ET\n";

  objects.push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  // Object 5: Font
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  // Build PDF
  let pdf = "%PDF-1.4\n";
  let offset = 9;
  let xref = [];

  objects.forEach((obj, i) => {
    xref.push(offset);
    pdf += obj;
    offset += obj.length;
  });

  // XRef table
  let xrefOffset = offset;
  let xrefTable = "xref\n";
  xrefTable += `0 ${objects.length + 1}\n`;
  xrefTable += "0000000000 65535 f\n";
  xref.forEach(pos => {
    xrefTable += `${pos.toString().padStart(10, "0")} 00000 n\n`;
  });

  pdf += xrefTable;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "customer_orders.pdf";
  a.click();
  URL.revokeObjectURL(url);
});
