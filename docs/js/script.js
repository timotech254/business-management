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

let items = [];
let editId = null;

/* =========================
   LOGIN
   ========================= */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "";

  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
    loginMessage.style.color = "green";
    loginMessage.textContent = "Login successful";
    loginForm.reset();
  } catch (err) {
    loginMessage.style.color = "red";
    loginMessage.textContent = err.message;
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
  } else {
    document.querySelector(".container").style.display = "none";
    document.getElementById("authSection").style.display = "block";
    items = [];
    table.innerHTML = "";
    totalProfitEl.textContent = "0";
  }
});

/* =========================
   BUSINESS LOGIC
   ========================= */
function calculateProfit(item) {
  return (item.outgoing - item.incoming) * item.quantity;
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
    const profit = calculateProfit(item);
    totalProfit += profit;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.incoming}</td>
      <td>${item.outgoing}</td>
      <td>${item.quantity}</td>
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
  let csv = "Item,Incoming,Outgoing,Quantity,Profit\n";
  items.forEach(item => {
    csv += `${item.name},${item.incoming},${item.outgoing},${item.quantity},${calculateProfit(item)}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "business_report.csv";
  a.click();
  URL.revokeObjectURL(url);
});
