const API_ORIGIN = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:5000";
const API_BASE = `${API_ORIGIN}/api`;
const DELIVERY_FEE = 2500;

const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("marketnestCart") || "[]"),
  category: "All",
  search: "",
  sort: "newest"
};

const productsEl = document.getElementById("products");
const statusEl = document.getElementById("statusMessage");
const cartDrawer = document.getElementById("cartDrawer");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const categoryListEl = document.getElementById("categoryList");
const sortSelect = document.getElementById("sortSelect");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutNote = document.getElementById("checkoutNote");

const money = value => `NGN ${Number(value || 0).toLocaleString()}`;
const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[char]));

const imageUrl = image => {
  if (!image) return "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=80";
  if (image.startsWith("http")) return image;
  return `${API_ORIGIN}/uploads/${image}`;
};

function persistCart() {
  localStorage.setItem("marketnestCart", JSON.stringify(state.cart));
}

function cartTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  return {
    subtotal,
    total: state.cart.length ? subtotal + DELIVERY_FEE : 0
  };
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function loadProducts() {
  setStatus("Loading products...");
  const params = new URLSearchParams({ sort: state.sort });

  if (state.search) params.set("search", state.search);
  if (state.category !== "All") params.set("category", state.category);

  try {
    state.products = await api(`/products?${params.toString()}`);
    renderCategories();
    renderProducts();
    setStatus(state.products.length ? "" : "No products match that search yet.", state.products.length ? "" : "empty");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderCategories() {
  const categories = ["All", ...new Set(state.products.map(product => product.category || "General"))];
  categoryListEl.innerHTML = categories.map(category => `
    <button class="${category === state.category ? "active" : ""}" type="button" data-category="${category}">
      ${escapeHtml(category)}
    </button>
  `).join("");
}

function renderProducts() {
  productsEl.innerHTML = state.products.map(product => {
    const inStock = product.quantity > 0;
    return `
      <article class="product-card">
        <img src="${imageUrl(product.image)}" alt="${escapeHtml(product.name)}">
        <div class="product-body">
          <div class="product-meta">
            <span>${escapeHtml(product.category || "General")}</span>
            <span>${inStock ? `${product.quantity} left` : "Sold out"}</span>
          </div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.details || "A dependable pick for everyday use.")}</p>
          <div class="product-footer">
            <strong>${money(product.amount)}</strong>
            <button type="button" data-add="${product._id}" ${inStock ? "" : "disabled"}>
              ${inStock ? "Add to cart" : "Out of stock"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderCart() {
  const totals = cartTotals();
  const itemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  cartCountEl.textContent = itemCount;
  document.getElementById("cartSubtotal").textContent = money(totals.subtotal);
  document.getElementById("deliveryFee").textContent = money(state.cart.length ? DELIVERY_FEE : 0);
  document.getElementById("cartTotal").textContent = money(totals.total);
  document.getElementById("checkoutButton").disabled = state.cart.length === 0;

  cartItemsEl.innerHTML = state.cart.length ? state.cart.map(item => `
    <div class="cart-item">
      <img src="${imageUrl(item.image)}" alt="${escapeHtml(item.name)}">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${money(item.amount)}</p>
        <div class="qty-control">
          <button type="button" data-decrease="${item.productId}">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-increase="${item.productId}">+</button>
        </div>
      </div>
      <button class="remove-button" type="button" data-remove="${item.productId}">Remove</button>
    </div>
  `).join("") : `<p class="empty-cart">Your cart is ready when you are.</p>`;
}

function addToCart(productId) {
  const product = state.products.find(item => item._id === productId);
  if (!product || product.quantity < 1) return;

  const cartItem = state.cart.find(item => item.productId === productId);
  if (cartItem) {
    if (cartItem.quantity >= product.quantity) return;
    cartItem.quantity += 1;
  } else {
    state.cart.push({
      productId: product._id,
      name: product.name,
      amount: product.amount,
      image: product.image,
      quantity: 1
    });
  }

  persistCart();
  renderCart();
  openCart();
}

function updateCart(productId, change) {
  const item = state.cart.find(cartItem => cartItem.productId === productId);
  const product = state.products.find(productItem => productItem._id === productId);
  if (!item) return;

  item.quantity += change;
  if (product && item.quantity > product.quantity) item.quantity = product.quantity;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(cartItem => cartItem.productId !== productId);
  }

  persistCart();
  renderCart();
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

productsEl.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});

categoryListEl.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  loadProducts();
});

cartItemsEl.addEventListener("click", event => {
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  const remove = event.target.closest("[data-remove]");

  if (increase) updateCart(increase.dataset.increase, 1);
  if (decrease) updateCart(decrease.dataset.decrease, -1);
  if (remove) {
    state.cart = state.cart.filter(item => item.productId !== remove.dataset.remove);
    persistCart();
    renderCart();
  }
});

document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  state.search = document.getElementById("searchInput").value.trim();
  loadProducts();
});

sortSelect.addEventListener("change", event => {
  state.sort = event.target.value;
  loadProducts();
});

document.getElementById("openCart").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("checkoutButton").addEventListener("click", () => {
  checkoutNote.textContent = `Order total: ${money(cartTotals().total)}`;
  checkoutModal.showModal();
});
document.getElementById("closeCheckout").addEventListener("click", () => checkoutModal.close());

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  const formData = new FormData(checkoutForm);
  const customer = Object.fromEntries(formData.entries());
  const paymentMethod = customer.paymentMethod;
  delete customer.paymentMethod;

  checkoutNote.textContent = "Placing your order...";

  try {
    const order = await api("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        paymentMethod,
        items: state.cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
      })
    });

    state.cart = [];
    persistCart();
    renderCart();
    checkoutForm.reset();
    checkoutModal.close();
    closeCart();
    setStatus(`Order ${order.orderNumber} placed successfully. We will contact you shortly.`, "success");
    loadProducts();
  } catch (error) {
    checkoutNote.textContent = error.message;
  }
});

renderCart();
loadProducts();
