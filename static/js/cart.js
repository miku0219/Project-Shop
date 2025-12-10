const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("請先登入！");
  window.location.href = "/login";
}

let cartData = [];

// 計算總額（只計算勾選商品）
function calculateTotal() {
  let total = 0;
  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    if (cb.checked) {
      total += parseFloat(cb.dataset.subtotal) || 0;
    }
  });

  document.getElementById("totalAmount").innerText = `總計: $${total.toFixed(
    2
  )}`;
}

// 單品 checkbox 切換事件（自動處理數量 & 小計）
function onItemCheckboxChange(e) {
  const cb = e.target;
  const row = cb.closest("tr");
  const qtyInput = row.querySelector(".buy-qty");
  const subtotalSpan = row.querySelector(".subtotal");
  const price = parseFloat(qtyInput.dataset.price);

  if (cb.checked) {
    qtyInput.disabled = false;
    qtyInput.value = 1;
    const subtotal = price * 1;
    subtotalSpan.innerText = subtotal.toFixed(2);
    cb.dataset.subtotal = subtotal;
  } else {
    qtyInput.disabled = true;
    qtyInput.value = 0;
    subtotalSpan.innerText = "0.00";
    cb.dataset.subtotal = 0;
  }

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
  selectAll.checked = allChecked;
}

// 全選框事件
function onSelectAllChange(e) {
  const checked = e.target.checked;

  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    cb.checked = checked;
    cb.dispatchEvent(new Event("change")); // 讓每個 checkbox 自動執行數量處理
  });
}

// 綁定全選框
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
      '<tr><td colspan="8" style="font-size: 40px; color:#dec381; text-align:center;">購物車目前沒有商品</td></tr>';
    calculateTotal();
    return;
  }

  data.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="item-checkbox"
                 data-product-id="${item.product_id}"
                 data-subtotal="0"></td>

      <td><img src="${item.image}" class="product-img"></td>

      <td class="product-name" data-level="${item.level}">
          ${item.name}
      </td>

      <td>$${item.price}</td>

      <td>${item.quantity}</td>

      <td>
        <input type="number" 
               class="buy-qty"
               min="1" 
               max="${item.quantity}"
               value="0"
               disabled
               data-price="${item.price}">
      </td>

      <td>$<span class="subtotal">0.00</span></td>

      <td><button class="deleteBtn" data-id="${item.cart_id}">刪除</button></td>
    `;
    cartList.appendChild(tr);
  });

  // 數量變動：更新小計
  document.querySelectorAll(".buy-qty").forEach((input) => {
    input.addEventListener("input", (e) => {
      let qty = parseInt(e.target.value);
      const price = parseFloat(e.target.dataset.price);

      if (qty < 1) qty = 1;
      if (qty > parseInt(e.target.max)) qty = parseInt(e.target.max);
      e.target.value = qty;

      const newSubtotal = qty * price;

      const row = e.target.closest("tr");
      row.querySelector(".subtotal").innerText = newSubtotal.toFixed(2);

      // 更新 checkbox subtotal
      const checkbox = row.querySelector(".item-checkbox");
      checkbox.dataset.subtotal = newSubtotal;

      calculateTotal();
    });
  });

  // checkbox 事件
  document
    .querySelectorAll(".item-checkbox")
    .forEach((cb) => cb.addEventListener("change", onItemCheckboxChange));

  // 刪除
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(
        `http://127.0.0.1:5000/api/cart/${btn.dataset.id}?account=${currentUser}`,
        { method: "DELETE" }
      );
      loadCart();
    });
  });

  calculateTotal();
  updateSelectAllStatus();
}

// 結帳
document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const selectedItems = [];

  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    if (cb.checked) {
      const row = cb.closest("tr");
      const qty = parseInt(row.querySelector(".buy-qty").value);

      selectedItems.push([parseInt(cb.dataset.productId), qty]);
    }
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
