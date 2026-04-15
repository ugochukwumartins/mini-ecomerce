const API_ORIGIN = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:5000";
const API_BASE = `${API_ORIGIN}/api`;
const token = localStorage.getItem("adminToken");

if (!token) location.href = "admin-login.html";

const form = document.getElementById("addForm");
const tbody = document.getElementById("adminProducts");
const ordersList = document.getElementById("ordersList");
const formMessage = document.getElementById("formMessage");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");

let products = [];

const money = value => `NGN ${Number(value || 0).toLocaleString()}`;
const imageUrl = image => image ? `${API_ORIGIN}/uploads/${image}` : "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=600&q=80";
const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[char]));

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra
  };
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("adminToken");
      location.href = "admin-login.html";
    }
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function resetEditor() {
  form.reset();
  document.getElementById("productId").value = "";
  formTitle.textContent = "Add Product";
  saveButton.textContent = "Save product";
  formMessage.textContent = "";
}

function renderProducts() {
  tbody.innerHTML = products.length ? products.map(product => `
    <tr>
      <td><img class="thumb" src="${imageUrl(product.image)}" alt="${escapeHtml(product.name)}"></td>
      <td>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.details || "No details yet")}</span>
      </td>
      <td>${escapeHtml(product.category || "General")}</td>
      <td>${money(product.amount)}</td>
      <td>${product.quantity}</td>
      <td class="action-cell">
        <button type="button" data-edit="${product._id}">Edit</button>
        <button class="danger-button" type="button" data-delete="${product._id}">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6">No products yet.</td></tr>`;
}

async function loadProducts() {
  products = await api("/products");
  renderProducts();
}

async function loadOrders() {
  const orders = await api("/orders", {
    headers: authHeaders()
  });

  ordersList.innerHTML = orders.length ? orders.map(order => `
    <article class="order-card">
      <div class="order-head">
        <div>
          <h3>${order.orderNumber}</h3>
          <p>${escapeHtml(order.customer.name)} · ${escapeHtml(order.customer.phone)}</p>
        </div>
        <select data-status="${order._id}">
          ${["pending", "processing", "shipped", "delivered", "cancelled"].map(status => `
            <option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </div>
      <p class="order-address">${escapeHtml(order.customer.address)}</p>
      <div class="order-items">
        ${order.items.map(item => `<span>${item.quantity}x ${escapeHtml(item.name)}</span>`).join("")}
      </div>
      <strong>${money(order.total)}</strong>
    </article>
  `).join("") : `<p class="empty-state">No orders yet.</p>`;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "Saving...";

  const formData = new FormData(form);
  const productId = formData.get("productId");
  formData.delete("productId");

  if (!formData.get("image").name) {
    formData.delete("image");
  }

  try {
    await api(productId ? `/products/${productId}` : "/products", {
      method: productId ? "PUT" : "POST",
      headers: authHeaders(),
      body: formData
    });

    resetEditor();
    formMessage.textContent = "Product saved.";
    await loadProducts();
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

tbody.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const product = products.find(item => item._id === editButton.dataset.edit);
    if (!product) return;

    form.productId.value = product._id;
    form.name.value = product.name;
    form.amount.value = product.amount;
    form.quantity.value = product.quantity;
    form.category.value = product.category || "";
    form.details.value = product.details || "";
    form.featured.checked = Boolean(product.featured);
    formTitle.textContent = "Edit Product";
    saveButton.textContent = "Update product";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteButton && confirm("Delete this product?")) {
    await api(`/products/${deleteButton.dataset.delete}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    await loadProducts();
  }
});

ordersList.addEventListener("change", async event => {
  const select = event.target.closest("[data-status]");
  if (!select) return;

  await api(`/orders/${select.dataset.status}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status: select.value })
  });
});

document.getElementById("logoutButton").addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  location.href = "admin-login.html";
});
document.getElementById("resetForm").addEventListener("click", resetEditor);
document.getElementById("refreshProducts").addEventListener("click", loadProducts);
document.getElementById("refreshOrders").addEventListener("click", loadOrders);

loadProducts().catch(error => formMessage.textContent = error.message);
loadOrders().catch(error => formMessage.textContent = error.message);
