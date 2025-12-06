// ====== 從後端載入商品 ======
async function fetchProducts() {
  const res = await fetch("http://127.0.0.1:5000/api/products");
  const data = await res.json();
  return data;
}

// ====== 渲染商品到表格（可傳入商品陣列） ======
function renderProducts(products) {
  const productList = document.getElementById("productList");
  if (!productList) return;

  productList.innerHTML = "";
  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${p.image}" class="product-img"></td>
      <td class="product-name" data-id="${p.id}" style="color:blue;cursor:pointer;">${p.name}</td>
      <td>${p.category}</td>
      <td>${p.stock}</td>
      <td>$${p.price}</td>
      <td><button class="addCartBtn" data-id="${p.id}">加入</button></td>
    `;
    productList.appendChild(tr);
  });
}

// ====== 載入商品（頁面初始化） ======
async function loadProducts() {
  const products = await fetchProducts();
  window.loadedProducts = products; // 全域存放
  renderProducts(products);
}

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  updateNavbarUser();
});

// ====== 商品 Modal ======
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("product-name")) {
    const id = e.target.dataset.id;
    const p = window.loadedProducts.find((x) => x.id == id);
    if (!p) return;

    document.getElementById("modalName").innerText = p.name;
    document.getElementById("modalDesc").innerText = p.description;
    document.getElementById("modalImg").src = p.image;

    modal.style.display = "block";
  }
});
modalClose.onclick = () => (modal.style.display = "none");

// ====== 加入購物車 Modal ======
const cartModal = document.getElementById("cartModal");
const cartClose = document.getElementById("cartClose");

let currentProduct = null;

document.addEventListener("click", (e) => {
  // 按下加入購物車按鈕
  if (e.target.classList.contains("addCartBtn")) {
    const id = e.target.dataset.id;

    // ✅ 使用 window.loadedProducts
    currentProduct = window.loadedProducts.find((x) => x.id == id);

    if (!currentProduct) {
      console.error("找不到商品：ID =", id);
      return;
    }

    document.getElementById("cartProductName").innerText = currentProduct.name;
    document.getElementById("subtotal").innerText = currentProduct.price;

    cartModal.style.display = "block";
  }
});

// 關閉 Modal
cartClose.onclick = () => (cartModal.style.display = "none");

// 計算小計
const qtyInput = document.getElementById("cartQty");
if (qtyInput) {
  qtyInput.addEventListener("input", () => {
    if (!currentProduct) return;
    const qty = Number(qtyInput.value) || 1;
    document.getElementById("subtotal").innerText = (
      qty * currentProduct.price
    ).toFixed(2);
  });
}

// 確定加入購物車
document.getElementById("confirmAdd").onclick = () => {
  if (!currentProduct) {
    alert("請先選擇商品！");
    return;
  }
  alert(`已加入購物車：${currentProduct.name} x ${qtyInput.value || 1}`);
  cartModal.style.display = "none";
};

// ====== 篩選功能 ======
const filterCategory = document.getElementById("filterCategory");
const filterPrice = document.getElementById("filterPrice");
const applyFilterBtn = document.getElementById("applyFilter");

applyFilterBtn.addEventListener("click", () => {
  let filtered = window.loadedProducts;

  const category = filterCategory.value;
  const priceLimit = Number(filterPrice.value);

  if (category !== "")
    filtered = filtered.filter((p) => p.category === category);
  if (priceLimit > 0) filtered = filtered.filter((p) => p.price <= priceLimit);

  renderProducts(filtered);
});

// ====== 更新 Navbar 登入狀態 ======
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

// ====== Navbar導向不同頁面 ======
// 選取 navbar dropdown 的所有 a 標籤
document.querySelectorAll(".dropdown-menu a[data-level]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const level = link.dataset.level; // 讀取級別
    const category = document.getElementById("filterCategory").value;
    const priceLimit = Number(document.getElementById("filterPrice").value);

    // 從全域商品抓資料
    let filtered = window.loadedProducts;

    if (level) filtered = filtered.filter((p) => p.level === level);
    if (category) filtered = filtered.filter((p) => p.category === category);
    if (priceLimit > 0)
      filtered = filtered.filter((p) => p.price <= priceLimit);

    renderProducts(filtered);
  });
});
