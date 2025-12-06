const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("請先登入！");
  window.location.href = "/login";
}

async function loadOrders() {
  const res = await fetch(
    `http://127.0.0.1:5000/api/orders?account=${currentUser}`
  );
  const orders = await res.json();
  const ordersList = document.getElementById("ordersList");
  ordersList.innerHTML = "";

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = `
      <tr>
        <td colspan="7" style="
          font-size: 40px;
          color: #dec381;
          padding: 40px;
          text-align: center;">
          您尚未購買過任何商品，因此沒有歷史訂單。
        </td>
      </tr>`;
    return;
  }

  orders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${order.image}" class="product-img"></td>
      <td>${order.name}</td>
      <td>$${order.price}</td>
      <td>${order.quantity}</td>
      <td>$${order.total}</td>
      <td>${order.checkout_time}</td>
      <td><button class="deleteOrderBtn" data-id="${order.order_id}">刪除</button></td>
    `;
    ordersList.appendChild(tr);
  });

  // 綁定刪除事件
  document.querySelectorAll(".deleteOrderBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const order_id = btn.dataset.id;

      if (!confirm("確定要刪除此筆訂單紀錄嗎？")) return;

      await fetch(
        `http://127.0.0.1:5000/api/orders/${order_id}?account=${currentUser}`,
        {
          method: "DELETE",
        }
      );

      loadOrders();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadOrders();
  updateNavbarUser();
});
