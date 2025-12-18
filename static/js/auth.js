const formTitle = document.getElementById("formTitle");
const nameGroup = document.getElementById("nameGroup");
const userName = document.getElementById("userName");
const userGmail = document.getElementById("userGmail");
const userPassword = document.getElementById("userPassword");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const switchArea = document.getElementById("switchArea");
const currentNameForNav = localStorage.getItem("currentName");

// 取得當前模式：login / register / profile
let mode = new URLSearchParams(window.location.search).get("mode") || "login";

// =====================================
// 1. UI 切換與導覽列渲染邏輯
// =====================================

function updateUI() {
  if (!formTitle) return; // 確保在非登入頁面不會報錯

  // 控制「姓名」欄位是否顯示
  nameGroup.style.display = mode === "login" ? "none" : "block";
  userGmail.disabled = mode === "profile";

  if (mode === "login") {
    formTitle.innerText = "登入";
    submitBtn.innerText = "進入系統";
    switchArea.style.display = "block";
    document.getElementById("switchText").innerText = "還沒有帳號？";
    switchBtn.innerText = "前往註冊";
  } else if (mode === "register") {
    formTitle.innerText = "註冊新帳號";
    submitBtn.innerText = "立即註冊";
    switchArea.style.display = "block";
    document.getElementById("switchText").innerText = "已經有帳號？";
    switchBtn.innerText = "前往登入";
  } else if (mode === "profile") {
    formTitle.innerText = "修改個人資料";
    submitBtn.innerText = "儲存修改";
    switchArea.style.display = "none";

    // 預填資料：統一使用 currentName
    userGmail.value = localStorage.getItem("currentGmail") || "";
    userName.value = localStorage.getItem("currentName") || "";
    userPassword.placeholder = "新密碼 (不修改請留空)";
  }
}

function updateNavbarUser() {
  const userArea = document.getElementById("userArea");
  const name = localStorage.getItem("currentName");

  if (!userArea) return;

  if (name && name !== "undefined") {
    userArea.innerHTML = `
            <span style="color:#a57c14ff; margin-right:10px;">${name}</span>
            <button onclick="logout()" class="logout-btn">登出</button>
        `;
  } else {
    userArea.innerHTML = `<a href="/login">登入 / 註冊</a>`;
  }
}

function logout() {
  localStorage.clear();
  location.href = "/";
}

// 使用監聽器，避免覆蓋其他 onload 事件
document.addEventListener("DOMContentLoaded", updateNavbarUser);

// =====================================
// 2. 提交與登出邏輯
// =====================================

async function saveProfileChanges() {
  const gmail = localStorage.getItem("currentGmail");
  const nameInput = document.getElementById("editName")?.value;
  const passwordInput = document.getElementById("editPassword")?.value;

  if (!gmail) return alert("請先登入");

  // 準備要傳送的資料（只傳送有填寫的部分）
  let updateData = { gmail: gmail };
  if (nameInput) updateData.name = nameInput;
  if (passwordInput) updateData.password = passwordInput;

  try {
    const res = await fetch("/api/update_profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (res.ok) {
      alert("修改成功！");
      // 如果名字有改，同步更新 LocalStorage
      if (nameInput) {
        localStorage.setItem("currentName", nameInput);
      }
      location.reload(); // 重新整理頁面顯示新名字
    } else {
      const err = await res.json();
      alert("修改失敗: " + err.message);
    }
  } catch (error) {
    console.error("API 錯誤:", error);
    alert("無法連線到伺服器");
  }
}

if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    const gmail = userGmail.value.trim();
    const password = userPassword.value.trim();
    const name = userName.value.trim();

    if (!gmail || (mode !== "profile" && !password)) {
      alert("請填寫必要欄位");
      return;
    }

    let endpoint = "/api/login";
    if (mode === "register") endpoint = "/api/register";
    if (mode === "profile") endpoint = "/api/update_profile";

    const payload = { gmail, name };
    if (password) payload.password = password;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        // 重要修正：統一儲存為 "currentName"
        localStorage.setItem("currentGmail", data.gmail || gmail);
        localStorage.setItem("currentName", data.name || name);

        alert(data.message || "登入成功！");
        window.location.href = "/";
      } else {
        alert(data.message || "登入失敗");
      }
    } catch (err) {
      console.error("API 請求出錯:", err);
      alert("系統連線失敗");
    }
  });
}

// =====================================
// 3. 事件監聽初始化
// =====================================

if (switchBtn) {
  switchBtn.onclick = () => {
    mode = mode === "login" ? "register" : "login";
    userPassword.value = "";
    updateUI();
  };
}

// 綁定輸入框 Enter 鍵
if (userPassword) {
  [userGmail, userName].forEach((el) => {
    if (!el) return;
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        userPassword.focus();
      }
    });
  });

  userPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitBtn.click();
    }
  });
}

// 頁面加載時執行
document.addEventListener("DOMContentLoaded", () => {
  updateUI();
  updateNavbarUser();
});
