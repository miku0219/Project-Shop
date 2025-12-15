const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("請先登入！");
  window.location.href = "/login";
}

let cartData = [];

// =====================================
// 總額計算
// =====================================
function calculateTotal() {
  let total = 0;
  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    if (cb.checked) {
      // 這裡改為從 input 取得實際的購買數量來計算
      const row = cb.closest("tr");
      const qty = parseInt(row.querySelector(".buy-qty").value) || 0;
      const price =
        parseFloat(row.querySelector(".buy-qty").dataset.price) || 0;

      total += qty * price;
    }
  });

  // 【修改點 1】移除 .toFixed(2)，顯示整數總計
  document.getElementById("totalAmount").innerText = `總計: $${Math.round(
    total
  )}`;
}

// =====================================
// 單品 checkbox/數量處理 (簡化邏輯)
// =====================================

// 單品 checkbox 切換事件 (只控制啟用/禁用)
function onItemCheckboxChange(e) {
  const cb = e.target;
  const row = cb.closest("tr");
  const qtyInput = row.querySelector(".buy-qty");
  const subtotalSpan = row.querySelector(".subtotal");

  qtyInput.disabled = !cb.checked;
  if (cb.checked) {
    qtyInput.dispatchEvent(new Event("input"));
  } else {
    // 如果取消勾選，小計歸零 (顯示整數 0)
    subtotalSpan.innerText = "0";
  }

  calculateTotal();
  updateSelectAllStatus();
}

// 更新全選框狀態 (保持不變)
function updateSelectAllStatus() {
  const checkboxes = document.querySelectorAll(".item-checkbox");
  const selectAll = document.getElementById("selectAll");
  if (!selectAll || checkboxes.length === 0) return;

  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  const anyChecked = Array.from(checkboxes).some((cb) => cb.checked);
  selectAll.checked = allChecked;
  selectAll.indeterminate = anyChecked && !allChecked;
}

// 全選框事件 (保持不變)
function onSelectAllChange(e) {
  const checked = e.target.checked;

  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    if (cb.checked !== checked) {
      cb.checked = checked;
      cb.dispatchEvent(new Event("change"));
    }
  });
}

// 綁定全選框 (保持不變)
function bindSelectAll() {
  const selectAll = document.getElementById("selectAll");
  if (selectAll && !selectAll.dataset.bound) {
    selectAll.addEventListener("change", onSelectAllChange);
    selectAll.dataset.bound = "true";
  }
}

// =====================================
// 載入購物車
// =====================================
async function loadCart() {
  try {
    const res = await fetch(`/api/cart?account=${currentUser}`);
    if (!res.ok) throw new Error("無法取得購物車資料");
    const data = await res.json();
    cartData = data;

    const cartList = document.getElementById("cartList");
    cartList.innerHTML = "";

    if (!data || data.length === 0) {
      cartList.innerHTML =
        '<tr><td colspan="7" style="font-size: 40px; color:#dec381; text-align:center;">購物車目前沒有商品</td></tr>';
      calculateTotal();
      return;
    }

    data.forEach((item) => {
      const initialQty = item.current_qty || 1;
      const maxQty = item.quantity;
      const subtotalValue = item.price * initialQty;

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><input type="checkbox" class="item-checkbox"data-product-id="${
                  item.product_id
                }"></td>
                <td><img src="${item.image}" class="product-img"></td>
                <td class="product-name" data-level="${item.level}">${
        item.name
      }</td>
                <td>$${item.price}</td>
                
                <td><input type="number" class="buy-qty" min="1" max="${maxQty}" value="${initialQty}" disabled data-price="${
        item.price
      }"></td>
                
                <td>$<span class="subtotal">${Math.round(
                  subtotalValue
                )}</span></td>
                
                <td><button class="deleteBtn" data-id="${
                  item.cart_id
                }">刪除</button></td>
            `;
      cartList.appendChild(tr);
    });

    document.querySelectorAll(".buy-qty").forEach((input) => {
      input.addEventListener("input", (e) => {
        let qty = parseInt(e.target.value);
        const price = parseFloat(e.target.dataset.price);
        const max = parseInt(e.target.max);

        if (qty < 1 || isNaN(qty)) qty = 1;
        if (qty > max) {
          qty = max;
          alert(`購買數量不可高於庫存上限：${max}`);
        }

        e.target.value = qty;

        const newSubtotal = qty * price;

        const row = e.target.closest("tr");

        // 【修改點 3】移除 .toFixed(2)，顯示整數小計
        row.querySelector(".subtotal").innerText = Math.round(newSubtotal);

        calculateTotal();
      });
    });

    document
      .querySelectorAll(".item-checkbox")
      .forEach((cb) => cb.addEventListener("change", onItemCheckboxChange));

    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productName = btn
          .closest("tr")
          .querySelector(".product-name")
          .innerText.trim();
        if (!confirm(`確定要將商品「${productName}」從購物車中移除嗎？`)) {
          return;
        }
        try {
          const delRes = await fetch(
            `/api/cart/${btn.dataset.id}?account=${currentUser}`,
            {
              method: "DELETE",
            }
          );
          if (!delRes.ok) throw new Error("刪除失敗");

          const data = await delRes.json();
          if (data.success) {
            loadCart();
          } else {
            alert(data.message || "刪除失敗");
          }
        } catch (error) {
          console.error("刪除商品發生錯誤:", error);
          alert("刪除商品失敗，請稍後再試。");
        }
      });
    });

    calculateTotal();
    updateSelectAllStatus();
  } catch (err) {
    console.error(err);
    const cartList = document.getElementById("cartList");
    cartList.innerHTML =
      '<tr><td colspan="7" style="font-size: 20px; color:red; text-align:center;">載入購物車資料失敗！</td></tr>';
  }
}

// =====================================
// 結帳 (邏輯調整：移除小數點顯示)
// =====================================
document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const selectedItems = [];
  let totalAmount = 0;

  let isValid = true;
  document.querySelectorAll(".item-checkbox").forEach((cb) => {
    if (cb.checked) {
      const row = cb.closest("tr");
      const qtyInput = row.querySelector(".buy-qty");
      const price = parseFloat(qtyInput.dataset.price);
      const qty = parseInt(qtyInput.value);
      const max = parseInt(qtyInput.max);

      if (qty <= 0 || isNaN(qty) || qty > max) {
        alert(
          `商品：${row
            .querySelector(".product-name")
            .innerText.trim()} 的數量不合法 (數量必須在 1 到 ${max} 之間)，請重新檢查！`
        );
        isValid = false;
        return;
      }

      selectedItems.push([parseInt(cb.dataset.productId), qty]);
      totalAmount += qty * price;
    }
  });

  if (!isValid) return;

  if (selectedItems.length === 0) {
    alert("請先勾選商品！");
    return;
  }

  // 【修改點 4】移除 .toFixed(2)，顯示整數總計
  const totalDisplay = Math.round(totalAmount);

  if (!confirm(`確定要結帳嗎？\n總計: $${totalDisplay}`)) {
    return;
  }

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: currentUser,
        selected_items: selectedItems,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `伺服器錯誤: ${res.status}`);
    }

    const data = await res.json();
    alert(data.message);
    loadCart();
  } catch (err) {
    console.error("結帳失敗:", err);
    alert(err.message || "結帳失敗，請檢查網路或稍後再試。");
  }
});

// =====================================
// 初始化 (保持不變)
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  bindSelectAll();
  loadCart();
  updateNavbarUser();
});
