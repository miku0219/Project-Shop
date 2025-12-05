// ====== 註冊功能 ======
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const account = document.getElementById("regAccount").value;
    const password = document.getElementById("regPassword").value;

    if (!account || !password) {
      alert("請輸入帳號與密碼");
      return;
    }

    const res = await fetch("http://127.0.0.1:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.href = "/login"; // ← 導向後端 login URL
    }
  });
}

// ====== 登入功能 ======
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const account = document.getElementById("loginAccount").value;
    const password = document.getElementById("loginPassword").value;

    if (!account || !password) {
      alert("請輸入帳號與密碼");
      return;
    }

    const res = await fetch("http://127.0.0.1:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentUser", data.account);
      window.location.href = "/"; // ← 導向首頁
    }
  });
}
