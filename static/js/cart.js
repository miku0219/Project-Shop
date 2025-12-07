const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("請先登入！");
  window.location.href = "/login";
}

let cartData = [];

// 計算總額（只計算勾選商品）
function calculateTotal() {
  const checkboxes = document.querySelectorAll(".item-checkbox");
  let total = 0;
  checkboxes.forEach((cb) => {
    if (cb.checked) total += parseFloat(cb.dataset.subtotal) || 0;
  });
  document.getElementById("totalAmount").innerText = `總計: $${total.toFixed(
    2
  )}`;
}

// 單品勾選事件
function onItemCheckboxChange() {
  calculateTotal();
  updateSelectAllStatus();
}

// 更新全選框狀態
function updateSelectAllStatus() {
  const checkboxes = document.querySelectorAll(".item-checkbox");
  const selectAll = document.getElementById("selectAll");
  if (!selectAll) return;

  const allChecked =
    checkboxes.length > 0 && Array.from(checkboxes).every((cb) => cb.checked);
  selectAll.checked = allChecked; // 只有全部勾選才勾全選框
}

// 全選框勾選或取消事件
function onSelectAllChange(e) {
  const checked = e.target.checked;
  document
    .querySelectorAll(".item-checkbox")
    .forEach((cb) => (cb.checked = checked));
  calculateTotal();
}

// 綁定全選框事件
function bindSelectAll() {
  const selectAll = document.getElementById("selectAll");
  if (selectAll && !selectAll.dataset.bound) {
    selectAll.addEventListener("change", onSelectAllChange);
    selectAll.dataset.bound = "true";
  }
}

// 載入購物車
async function loadCart() {
  const res = await fetch(
    `http://127.0.0.1:5000/api/cart?account=${currentUser}`
  );
  const data = await res.json();
  cartData = data;

  const cartList = document.getElementById("cartList");
  cartList.innerHTML = "";

  if (!data || data.length === 0) {
    cartList.innerHTML =
      '<tr><td colspan="7" style="font-size: 40px; color:#dec381; text-align:center;">購物車目前沒有商品</td></tr>';
    calculateTotal();
    const selectAll = document.getElementById("selectAll");
    if (selectAll) selectAll.checked = false;
    return;
  }

  data.forEach((item) => {
    const subtotal = parseFloat(item.subtotal) || 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="item-checkbox"
                 data-cart-id="${item.cart_id}"
                 data-product-id="${item.product_id}"
                 data-quantity="${item.quantity}"
                 data-subtotal="${subtotal}"></td>
      <td><img src="${item.image}" class="product-img"></td>
      <td>${item.name}</td>
      <td>$${item.price}</td>
      <td>${item.quantity}</td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button class="deleteBtn" data-id="${item.cart_id}">刪除</button></td>
    `;
    cartList.appendChild(tr);
  });

  // 綁定單品勾選事件
  document
    .querySelectorAll(".item-checkbox")
    .forEach((cb) => cb.addEventListener("change", onItemCheckboxChange));

  // 綁定刪除按鈕
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(
        `http://127.0.0.1:5000/api/cart/${btn.dataset.id}?account=${currentUser}`,
        { method: "DELETE" }
      );
      loadCart();
    });
  });

  // 初始更新全選框狀態與總額
  calculateTotal();
  updateSelectAllStatus();
}

// 結帳
document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const selectedItems = [];
  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    if (cb.checked)
      selectedItems.push([
        parseInt(cb.dataset.productId),
        parseInt(cb.dataset.quantity),
      ]);
  });

  if (selectedItems.length === 0) {
    alert("請先勾選商品！");
    return;
  }

  const res = await fetch("http://127.0.0.1:5000/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: currentUser,
      selected_items: selectedItems,
    }),
  });

  const data = await res.json();
  alert(data.message);
  loadCart();
});

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  bindSelectAll();
  loadCart();
  updateNavbarUser();
});
