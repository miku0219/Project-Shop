// =====================================
// 1. 取得登入資訊
// =====================================
const userGmail = localStorage.getItem("currentGmail");
const userName = localStorage.getItem("currentName");

// 強制登入檢查
if (!userGmail) {
  alert("請先登入！");
  window.location.href = "/login?mode=login";
}

// =====================================
// 2. 初始化執行
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  updateNavbarUser();
  loadOrders();
});

// =====================================
// 3. Navbar 使用者資訊
// =====================================
function updateNavbarUser() {
  const userArea = document.getElementById("userArea");
  if (!userArea) return;

  const displayName =
    userName && userName !== "undefined" ? userName : userGmail;

  if (userGmail) {
    userArea.innerHTML = `
            <span style="color:#a57c14ff; margin-right:15px; font-weight:bold;">歡迎，${displayName}</span>
            <button id="logoutBtn" class="logout-btn" style="cursor:pointer;">登出</button>
        `;
    document.getElementById("logoutBtn").onclick = logout;
  } else {
    userArea.innerHTML = `<a href="/login" style="color:#dec381;">登入 / 註冊</a>`;
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "/";
}

// =====================================
// 4. 載入歷史訂單 (關鍵變色修改)
// =====================================
async function loadOrders() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  try {
    const res = await fetch(`/api/orders?gmail=${userGmail}`);
    const orders = await res.json();
    ordersList.innerHTML = "";

    if (!orders || orders.length === 0) {
      ordersList.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:50px; color:#dec381;">暫無訂單紀錄</td></tr>`;
      return;
    }

    orders.forEach((order) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><img src="${
                  order.image
                }" style="width:100px; border-radius:5px;"></td>
                <td class="product-name" data-level="${
                  order.level || "一般"
                }">${order.product_name}</td>
                <td>$${Math.round(order.price)}</td>
                <td>${order.quantity}</td>
                <td>$${Math.round(order.price * order.quantity)}</td>
                <td>${order.checkout_time}</td>
                <td>
                    <button class="deleteOrderBtn" data-id="${
                      order.order_id
                    }">刪除</button>
                </td>
            `;
      ordersList.appendChild(tr);
    });

    // 重點：渲染完 HTML 後，立刻綁定事件
    attachDeleteEvents();
  } catch (err) {
    console.error("載入訂單失敗:", err);
  }
}

function attachDeleteEvents() {
  const buttons = document.querySelectorAll(".deleteOrderBtn");
  buttons.forEach((btn) => {
    btn.onclick = null;

    btn.onclick = async () => {
      const orderId = btn.getAttribute("data-id");
      if (!confirm("確定要刪除這筆歷史訂單嗎？")) return;

      try {
        // 發送 DELETE 請求，並帶上 gmail
        const res = await fetch(`/api/orders/${orderId}?gmail=${userGmail}`, {
          method: "DELETE",
        });
        const result = await res.json();

        if (res.ok && result.success) {
          alert("刪除成功");
          loadOrders(); // 刪除後立即刷新列表
        } else {
          alert("刪除失敗：" + (result.message || "原因不明"));
        }
      } catch (err) {
        console.error("網路錯誤:", err);
        alert("系統連線失敗");
      }
    };
  });
}
