// =====================================
//  全域變數
// =====================================
let allProducts = [];
let currentFilters = {
  level: "",
  category: "",
  price: 0,
};
let currentProduct = null;

// =====================================
//  從後端取得商品
// =====================================
async function fetchProducts() {
  const res = await fetch("http://127.0.0.1:5000/api/products");
  return await res.json();
}

// =====================================
//  渲染商品到畫面
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
//  套用所有篩選 + 新增排序
// =====================================
function applyFilters() {
  let filtered = [...allProducts];

  // Level 篩選
  if (currentFilters.level !== "") {
    filtered = filtered.filter((p) => p.level === currentFilters.level);
  }

  // 種類篩選
  if (currentFilters.category !== "") {
    filtered = filtered.filter((p) => p.category === currentFilters.category);
  }

  // 價格上限
  if (currentFilters.price > 0) {
    filtered = filtered.filter((p) => p.price <= currentFilters.price);
  }

  // ⭐ 新增：排序功能
  const sortOption = document.getElementById("sortOption")?.value;
  if (sortOption === "price_low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortOption === "price_high") {
    filtered.sort((a, b) => b.price - a.price);
  }

  renderProducts(filtered);
}

// 排序選單事件
const sortSelect = document.getElementById("sortOption");
if (sortSelect) {
  sortSelect.addEventListener("change", applyFilters);
}

// =====================================
//  初次載入商品
// =====================================
async function loadProducts() {
  allProducts = await fetchProducts();
  applyFilters();
}

// =====================================
//  Navbar 使用者資訊（登入/登出）
// =====================================
function updateNavbarUser() {
  const userArea = document.getElementById("userArea");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const currentUser = localStorage.getItem("currentUser");

  if (!userArea) return;

  if (isLoggedIn === "true") {
    userArea.innerHTML = `<span>${currentUser}</span>  <button id="logoutBtn">登出</button>`;
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
//  商品 Modal
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
//  加入購物車 Modal
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
    document.getElementById("subtotal").innerText = currentProduct.price;
    qtyInput.value = 1;

    cartModal.style.display = "block";
  }
});

cartClose.onclick = () => (cartModal.style.display = "none");

// 小計更新
qtyInput.addEventListener("input", () => {
  if (!currentProduct) return;
  const qty = Number(qtyInput.value) || 1;
  document.getElementById("subtotal").innerText = (
    qty * currentProduct.price
  ).toFixed(2);
});

// =====================================
//  確定加入購物車
// =====================================
document.getElementById("confirmAdd").onclick = async () => {
  const qty = Number(qtyInput.value);
  const currentUser = localStorage.getItem("currentUser");

  if (!currentUser) {
    alert("請先登入！");
    return;
  }

  if (!currentProduct) {
    alert("商品未選取，請重新選擇！");
    return;
  }

  if (qty < 1) {
    alert("數量至少為 1");
    qtyInput.value = 1;
    return;
  }

  if (qty > currentProduct.stock) {
    alert(`超過庫存數量！庫存剩餘 ${currentProduct.stock} 件`);
    qtyInput.value = currentProduct.stock;
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:5000/api/add_cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: currentUser,
        product_id: currentProduct.id,
        quantity: qty,
      }),
    });

    if (!res.ok) {
      throw new Error(`伺服器錯誤: ${res.status}`);
    }

    const data = await res.json();
    alert(data.message);
    cartModal.style.display = "none";
  } catch (err) {
    console.error(err);
    alert("加入購物車失敗，請稍後再試");
  }
};

// =====================================
//  側邊篩選
// =====================================
document.getElementById("applyFilter").addEventListener("click", () => {
  currentFilters.category = document.getElementById("filterCategory").value;
  currentFilters.price =
    Number(document.getElementById("filterPrice").value) || 0;
  applyFilters();
});

// =====================================
//  Navbar Level 篩選
// =====================================
document.querySelectorAll(".dropdown-menu a[data-level]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilters.level = a.dataset.level || "";
    applyFilters();
  });
});

// =====================================
//  初始化
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  updateNavbarUser();
});
