// ====== 註冊功能 ======
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    const account = document.getElementById("regAccount").value;
    const password = document.getElementById("regPassword").value;

    if (!account || !password) {
      alert("請輸入帳號與密碼");
      return;
    }

    // 儲存到 localStorage（模擬 DB）
    localStorage.setItem("userAccount", account);
    localStorage.setItem("userPassword", password);

    alert("註冊成功！");
    window.location.href = "login.html";
  });
}

// ====== 登入功能 ======
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const account = document.getElementById("loginAccount").value;
    const password = document.getElementById("loginPassword").value;

    const savedAccount = localStorage.getItem("userAccount");
    const savedPassword = localStorage.getItem("userPassword");

    if (account === savedAccount && password === savedPassword) {
      // 設定登入狀態
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentUser", account);

      alert("登入成功！");
      window.location.href = "index.html"; // 返回首頁
    } else {
      alert("帳號或密碼錯誤");
    }
  });
}
