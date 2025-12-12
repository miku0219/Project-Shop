// =====================================
// 全域變數
// =====================================
let allProducts = [];
let currentFilters = { level: "", category: "", price: 0 };
let currentProduct = null;

// =====================================
// 取得商品資料
// =====================================
async function fetchProducts() {
  const res = await fetch("/api/products");
  return await res.json();
}

// =====================================
// 取得資料庫最貴商品價格
// =====================================
async function fetchMaxPrice() {
  try {
    const res = await fetch("/api/max_price");
    const data = await res.json();
    return data.max_price || 1000;
  } catch (err) {
    console.error("取得最大價格失敗:", err);
    return 1000;
  }
}

// =====================================
// 渲染商品
// =====================================
function renderProducts(products) {
  const productList = document.getElementById("productList");
  if (!productList) return;

  productList.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${p.image}" class="product-img"></td>
      <td class="product-name" data-id="${p.id}" data-level="${p.level}">${p.name}</td>
      <td>${p.category}</td>
      <td>${p.stock}</td>
      <td>$${p.price}</td>
      <td><button class="addCartBtn" data-id="${p.id}">加入</button></td>
    `;
    productList.appendChild(tr);
  });
}

// =====================================
// 套用篩選 + 排序
// =====================================
function applyFilters() {
  let filtered = [...allProducts];

  if (currentFilters.level)
    filtered = filtered.filter((p) => p.level === currentFilters.level);
  if (currentFilters.category)
    filtered = filtered.filter((p) => p.category === currentFilters.category);
  if (currentFilters.price > 0)
    filtered = filtered.filter((p) => p.price <= currentFilters.price);

  const sortOption = document.getElementById("sortOption")?.value;
  if (sortOption === "price_low") filtered.sort((a, b) => a.price - b.price);
  else if (sortOption === "price_high")
    filtered.sort((a, b) => b.price - a.price);

  renderProducts(filtered);
}

// =====================================
// 初次載入商品
// =====================================
async function loadProducts() {
  const maxPrice = await fetchMaxPrice();
  const filterPrice = document.getElementById("filterPrice");
  if (filterPrice) {
    filterPrice.max = maxPrice;
    filterPrice.value = maxPrice;
    const priceDisplay = document.getElementById("priceDisplay");
    if (priceDisplay) priceDisplay.innerText = maxPrice;
  }

  allProducts = await fetchProducts();
  currentFilters.price = Number(filterPrice.value) || 0;
  applyFilters();
}

// =====================================
// Navbar 使用者資訊
// =====================================
function updateNavbarUser() {
  const userArea = document.getElementById("userArea");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const currentUser = localStorage.getItem("currentUser");

  if (!userArea) return;

  if (isLoggedIn === "true") {
    userArea.innerHTML = `<span>${currentUser}</span> <button id="logoutBtn">登出</button>`;
  } else {
    userArea.innerHTML = `<a href="/login">登入</a> | <a href="/register">註冊</a>`;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.setItem("isLoggedIn", "false");
      localStorage.removeItem("currentUser");
      window.location.reload();
    });
  }
}

// =====================================
// 商品 Modal
// =====================================
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("product-name")) {
    const id = e.target.dataset.id;
    const p = allProducts.find((x) => x.id == id);
    if (!p) return;
    document.getElementById("modalName").innerText = p.name;
    document.getElementById("modalDesc").innerText = p.description;
    document.getElementById("modalImg").src = p.image;
    modal.style.display = "block";
  }
});

modalClose.onclick = () => (modal.style.display = "none");

// =====================================
// 加入購物車 Modal
// =====================================
const cartModal = document.getElementById("cartModal");
const cartClose = document.getElementById("cartClose");
const qtyInput = document.getElementById("quantityInput");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("addCartBtn")) {
    const id = e.target.dataset.id;
    currentProduct = allProducts.find((x) => x.id == id);
    if (!currentProduct) return;

    document.getElementById("cartProductName").innerText = currentProduct.name;
    document.getElementById("cartImg").src = currentProduct.image;

    qtyInput.value = 1;
    document.getElementById("subtotal").innerText = currentProduct.price;

    cartModal.style.display = "block";
  }
});

cartClose.onclick = () => (cartModal.style.display = "none");

// =====================================
// 小計更新 + 庫存限制
// =====================================
function updateSubtotal() {
  if (!currentProduct) return;
  let qty = Number(qtyInput.value) || 1;
  if (qty > currentProduct.stock) qty = currentProduct.stock;
  if (qty < 1) qty = 1;
  qtyInput.value = qty;
  document.getElementById("subtotal").innerText = (
    qty * currentProduct.price
  ).toFixed(2);
}

qtyInput.addEventListener("input", updateSubtotal);
document.getElementById("btnDecrease")?.addEventListener("click", () => {
  qtyInput.value = Number(qtyInput.value) - 1;
  updateSubtotal();
});
document.getElementById("btnIncrease")?.addEventListener("click", () => {
  qtyInput.value = Number(qtyInput.value) + 1;
  updateSubtotal();
});

// =====================================
// 確定加入購物車
// =====================================
document.getElementById("confirmAdd").onclick = async () => {
  if (!currentProduct) {
    alert("商品未選取！");
    return;
  }

  const qty = Number(qtyInput.value);
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) {
    alert("請先登入！");
    return;
  }

  if (qty > currentProduct.stock) {
    alert(`數量已自動調整至庫存上限 ${currentProduct.stock}`);
  }

  try {
    const res = await fetch("/api/add_cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: currentUser,
        product_id: currentProduct.id,
        quantity: qtyInput.value,
      }),
    });

    if (!res.ok) throw new Error(`伺服器錯誤: ${res.status}`);
    const data = await res.json();
    alert(data.message);
    cartModal.style.display = "none";
  } catch (err) {
    console.error(err);
    alert("加入購物車失敗");
  }
};

// =====================================
// 側邊篩選
// =====================================
document.getElementById("applyFilter").addEventListener("click", () => {
  currentFilters.category = document.getElementById("filterCategory").value;
  currentFilters.price =
    Number(document.getElementById("filterPrice").value) || 0;
  applyFilters();
});

// =====================================
// Navbar 等級篩選
// =====================================
document.querySelectorAll(".dropdown-menu a[data-level]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilters.level = a.dataset.level || "";
    applyFilters();
  });
});

// =====================================
// 價格滑桿顯示
// =====================================
const priceSlider = document.getElementById("filterPrice");
const priceDisplay = document.getElementById("priceDisplay");
if (priceSlider && priceDisplay) {
  priceDisplay.innerText = priceSlider.value;
  priceSlider.addEventListener(
    "input",
    () => (priceDisplay.innerText = priceSlider.value)
  );
}

// =====================================
// 排序
// =====================================
document.getElementById("sortOption").addEventListener("change", applyFilters);

// =====================================
// 初始化
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  updateNavbarUser();
});
