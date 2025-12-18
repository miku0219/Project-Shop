// 1. 取得登入資訊
const cartUserGmail = localStorage.getItem("currentGmail");

document.addEventListener("DOMContentLoaded", () => {
  if (!cartUserGmail) {
    alert("請先登入！");
    window.location.href = "/login";
    return;
  }
  loadCartData();
});

// 2. 載入購物車資料 (加入庫存檢查邏輯)
async function loadCartData() {
  const cartList = document.getElementById("cartList");
  if (!cartList) return;

  try {
    const [cartRes, productsRes] = await Promise.all([
      fetch(`/api/cart?gmail=${cartUserGmail}`),
      fetch("/api/products"),
    ]);

    const cartData = await cartRes.json();
    const allProducts = await productsRes.json();

    cartList.innerHTML = "";

    if (!cartData || cartData.length === 0) {
      cartList.innerHTML =
        '<tr><td colspan="7" style="font-size: 50px; color:#dec381; text-align:center; padding: 50px;">購物車目前沒有商品</td></tr>';
      updateTotalDisplay();
      return;
    }

    cartData.forEach((item) => {
      // 1. 從所有商品中尋找該商品的詳細資料
      const productInfo = allProducts.find((p) => p.id === item.product_id);

      // 2. 獲取庫存與等級（若找不到則給予預設值）
      const maxStock = productInfo ? productInfo.stock : 99;
      const productLevel = productInfo ? productInfo.level : "一般";

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><input type="checkbox" class="item-checkbox" data-product-id="${
                  item.product_id
                }"></td>
                <td><img src="${
                  item.image
                }" style="width:120px; height:120px; object-fit:cover; border-radius:5px;"></td>
                
                <td class="product-name" data-level="${productLevel}">${
        item.name
      }</td>
                
                <td class="unit-price">$${Math.round(item.price)}</td>
                <td>
                    <input type="number" class="buy-qty" 
                           min="1" max="${maxStock}" 
                           value="${item.quantity || 1}" 
                           data-price="${item.price}" 
                           style="width: 120px; text-align: center;">
                    <div style="font-size: 14px; color: #888;">庫存: ${maxStock}</div>
                </td>
                <td>$<span class="subtotal">${Math.round(
                  item.price * (item.quantity || 1)
                )}</span></td>
                <td><button class="deleteBtn" data-id="${
                  item.cart_id
                }">刪除</button></td>
            `;
      cartList.appendChild(tr);
    });

    initSelectionLogic();
    rebindCartEvents();
    updateTotalDisplay();

    // 如果你有 updateNavbarUser 函式，記得在這裡呼叫
    if (typeof updateNavbarUser === "function") updateNavbarUser();
  } catch (err) {
    console.error("載入出錯:", err);
  }
}

// 3. 全選與子選項連動邏輯 (修正點 1)
function initSelectionLogic() {
  const selectAll = document.getElementById("selectAll");
  const itemCheckboxes = document.querySelectorAll(".item-checkbox");

  if (!selectAll) return;

  // 全選控製子項
  selectAll.onchange = (e) => {
    itemCheckboxes.forEach((cb) => (cb.checked = e.target.checked));
    updateTotalDisplay();
  };

  // 子項控製全選
  itemCheckboxes.forEach((cb) => {
    cb.onchange = () => {
      const allChecked = Array.from(itemCheckboxes).every((c) => c.checked);
      selectAll.checked = allChecked;
      updateTotalDisplay();
    };
  });
}

// 4. 事件重新綁定 (修正點 2)
function rebindCartEvents() {
  document.querySelectorAll(".buy-qty").forEach((input) => {
    input.oninput = (e) => {
      const row = e.target.closest("tr");
      const price = parseFloat(e.target.dataset.price);
      const max = parseInt(e.target.max);
      let qty = parseInt(e.target.value);

      // 超過庫存自動跳回最大值
      if (qty > max) {
        alert(`抱歉，該商品庫存僅剩 ${max} 件`);
        qty = max;
        e.target.value = max;
      }
      if (isNaN(qty) || qty < 1) qty = 1;

      row.querySelector(".subtotal").innerText = Math.round(price * qty);
      updateTotalDisplay();
    };
  });

  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("確定要移除此商品嗎？")) return;
      const res = await fetch(
        `/api/cart/${btn.dataset.id}?gmail=${cartUserGmail}`,
        { method: "DELETE" }
      );
      if (res.ok) loadCartData();
    };
  });
}

// 5. 總金額計算
function updateTotalDisplay() {
  let total = 0;
  document.querySelectorAll(".item-checkbox:checked").forEach((cb) => {
    const row = cb.closest("tr");
    const sub = parseInt(row.querySelector(".subtotal").innerText);
    total += sub;
  });
  const totalElem = document.getElementById("totalAmount");
  if (totalElem) totalElem.innerText = `總計: $${total}`;
}

// 6. 結帳功能
// cart.js 中的結帳按鈕邏輯
document.getElementById("checkoutBtn").onclick = async () => {
  const selected = [];
  const checkedBoxes = document.querySelectorAll(".item-checkbox:checked");

  if (checkedBoxes.length === 0) {
    alert("請先勾選欲結帳的商品！");
    return;
  }

  checkedBoxes.forEach((cb) => {
    const row = cb.closest("tr");
    const qty = parseInt(row.querySelector(".buy-qty").value);
    selected.push([parseInt(cb.dataset.productId), qty]);
  });

  if (!confirm(`確定要結帳嗎？`)) return;

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gmail: cartUserGmail, selected_items: selected }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("結帳成功！庫存已扣除。");
      window.location.href = "/orders";
    } else {
      // 這裡會顯示「商品庫存不足」的具體訊息
      alert("結帳失敗：" + data.message);
    }
  } catch (err) {
    alert("系統連線失敗");
  }
};
