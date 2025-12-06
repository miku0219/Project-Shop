// 取得當前使用者
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("請先登入！");
  window.location.href = "/login";
}

// 載入購物車
async function loadCart() {
  const res = await fetch(
    `http://127.0.0.1:5000/api/cart?account=${currentUser}`
  );
  const data = await res.json();
  const cartList = document.getElementById("cartList");
  cartList.innerHTML = "";

  if (!data || data.length === 0) {
    cartList.innerHTML =
      '<tr><td colspan="6" style="font-size: 80px; color: #dec381">購物車目前沒有商品</td></tr>';
    return;
  }

  data.forEach((item) => {
    const subtotal = (item.price * item.quantity).toFixed(2);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${item.image}" class="product-img"></td>
      <td>${item.name}</td>
      <td>$${item.price}</td>
      <td>${item.quantity}</td>
      <td>$${subtotal}</td>
      <td><button class="deleteBtn" data-id="${item.cart_id}">刪除</button></td>
    `;
    cartList.appendChild(tr);
  });

  // 刪除按鈕事件
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cart_id = btn.dataset.id;
      await fetch(
        `http://127.0.0.1:5000/api/cart/${cart_id}?account=${currentUser}`,
        {
          method: "DELETE",
        }
      );
      loadCart();
    });
  });
}

// 結帳
document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const res = await fetch("http://127.0.0.1:5000/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: currentUser }),
  });
  const data = await res.json();
  alert(data.message);
  loadCart();
});

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  updateNavbarUser();
});
