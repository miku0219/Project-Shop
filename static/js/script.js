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
  const currentUser = localStorage.getItem("currentGmail") || "";
  const res = await fetch(`/api/products?gmail=${currentUser}`);
  return await res.json();
}

// =====================================
// 取得資料庫最貴商品價格
// =====================================
async function fetchMaxPrice() {
  try {
    const res = await fetch("/api/max_price");
    if (!res.ok) throw new Error("網路回應不正常");

    const data = await res.json();

    // 確保回傳值是數字，且若 API 失敗則給予保底值
    const price = Number(data.max_price);
    return isNaN(price) ? 2000 : price;
  } catch (err) {
    console.warn("無法取得資料庫最高價，使用預設值 2000:", err);
    return 2000;
  }
}

// =====================================
// 渲染商品表格
// =====================================
function renderProducts(products) {
  const productList = document.getElementById("productList");
  if (!productList) return;

  productList.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${
        p.image
      }" class="product-img" style="width:150px; height:150px; object-fit:cover;"></td>
      <td class="product-name" data-id="${p.id}" data-level="${p.level}">${
      p.name
    }</td>
      <td>${p.category}</td>
      <td>${p.stock}</td> 
      <td>$${Math.round(p.price)}</td> 
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
  // 1. 先取得最高價
  const maxPrice = await fetchMaxPrice();

  // 2. 更新 UI 滑桿
  const filterPrice = document.getElementById("filterPrice");
  const priceDisplay = document.getElementById("priceDisplay");

  if (filterPrice) {
    filterPrice.max = maxPrice; // 動態設定滑桿最大值

    // 如果是第一次載入，將滑桿拉到最右邊（顯示全部商品）
    if (currentFilters.price === 0) {
      filterPrice.value = maxPrice;
      currentFilters.price = maxPrice;
    }

    if (priceDisplay) {
      priceDisplay.innerText = filterPrice.value;
    }
  }

  // 3. 載入商品資料
  allProducts = await fetchProducts();
  applyFilters();
}
// =====================================
// Navbar 使用者資訊 (與 auth.js 邏輯同步)
// =====================================
function updateNavbarUser() {
  const userArea = document.getElementById("userArea");
  const name = localStorage.getItem("currentName"); // 統一使用 currentName
  if (!userArea) return;

  if (name && name !== "undefined") {
    userArea.innerHTML = `
            <span style="color:#a57c14ff; margin-right:10px;">歡迎，${name}</span>
            <button onclick="logout()" class="logout-btn">登出</button>
        `;
  } else {
    userArea.innerHTML = `<a href="/login" style="text-decoration: none; color: inherit;">登入 / 註冊</a>`;
  }
}

function logout() {
  localStorage.clear();
  location.href = "/";
}

// =====================================
// 商品詳情 Modal 邏輯
// =====================================
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("product-name")) {
    const id = e.target.dataset.id;
    const p = allProducts.find((x) => x.id == id);
    if (!p) return;
    document.getElementById("modalName").innerText = p.name;
    document.getElementById("modalDesc").innerText =
      p.description || "暫無描述";
    document.getElementById("modalImg").src = p.image;
    modal.style.display = "block";
  }
});
if (modalClose) modalClose.onclick = () => (modal.style.display = "none");

// =====================================
// 加入購物車 Modal 與數量邏輯
// =====================================
const cartModal = document.getElementById("cartModal");
const cartClose = document.getElementById("cartClose");
const qtyInput = document.getElementById("quantityInput");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("addCartBtn")) {
    const id = e.target.dataset.id;
    currentProduct = allProducts.find((x) => x.id == id);
    if (!currentProduct) return;

    // 關鍵修正：將 ID 存入 Modal 供後續確認按鈕讀取
    cartModal.dataset.productId = id;

    document.getElementById("cartProductName").innerText = currentProduct.name;
    document.getElementById("cartImg").src = currentProduct.image;
    qtyInput.value = 1;
    document.getElementById("subtotal").innerText = Math.round(
      currentProduct.price
    );
    cartModal.style.display = "block";
  }
});

function updateSubtotal() {
  if (!currentProduct) return;
  let qty = Number(qtyInput.value) || 1;
  if (qty < 1) qty = 1;
  // 如果有庫存限制可開啟此行：if (qty > currentProduct.stock) qty = currentProduct.stock;
  qtyInput.value = qty;
  document.getElementById("subtotal").innerText = Math.round(
    qty * currentProduct.price
  );
}

if (qtyInput) qtyInput.addEventListener("input", updateSubtotal);
document.getElementById("btnDecrease")?.addEventListener("click", () => {
  if (qtyInput.value > 1) {
    qtyInput.value--;
    updateSubtotal();
  }
});
document.getElementById("btnIncrease")?.addEventListener("click", () => {
  qtyInput.value++;
  updateSubtotal();
});

if (cartClose) cartClose.onclick = () => (cartModal.style.display = "none");

// =====================================
// 確定加入購物車 (發送到後端)
// =====================================
document.getElementById("confirmAdd").onclick = async () => {
  const gmail = localStorage.getItem("currentGmail");
  if (!gmail) {
    alert("請先登入");
    window.location.href = "/login";
    return;
  }

  // 從 Modal 的 dataset 讀取剛才存入的 productId
  const productId = cartModal.dataset.productId;
  const quantity = parseInt(qtyInput.value);

  if (!productId) {
    alert("商品資訊錯誤");
    return;
  }

  try {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gmail: gmail,
        product_id: parseInt(productId),
        quantity: quantity,
      }),
    });

    if (res.ok) {
      alert("成功加入購物車！");
      cartModal.style.display = "none";
    } else {
      const data = await res.json();
      alert("加入失敗：" + (data.message || "請稍後再試"));
    }
  } catch (err) {
    console.error("加入購物車請求失敗:", err);
    alert("連線伺服器失敗");
  }
};

// =====================================
// 篩選監聽器
// =====================================
document.getElementById("applyFilter")?.addEventListener("click", () => {
  currentFilters.category = document.getElementById("filterCategory").value;
  currentFilters.price =
    Number(document.getElementById("filterPrice").value) || 0;
  applyFilters();
});

document.getElementById("filterPrice")?.addEventListener("input", (e) => {
  document.getElementById("priceDisplay").innerText = e.target.value;
});

document.querySelectorAll(".dropdown-menu a[data-level]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilters.level = a.dataset.level || "";
    applyFilters();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  updateNavbarUser();
});
