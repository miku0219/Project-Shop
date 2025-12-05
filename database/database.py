import sqlite3
import bcrypt

DB_PATH = "shop_management.db"

# ====== 初始化資料庫 ======
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.commit()
    conn.close()

# ====== 新增使用者 ======
def add_user(account, password):
    """
    新增使用者
    return: dict { success: bool, message: str }
    """
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO user (account, password) VALUES (?, ?)", (account, hashed))
        conn.commit()
        conn.close()
        return {"success": True, "message": "註冊成功"}
    except sqlite3.IntegrityError:
        return {"success": False, "message": "帳號已存在"}

# ====== 驗證使用者登入 ======
def check_user(account, password):
    """
    驗證使用者登入
    return: dict { success: bool, message: str }
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM user WHERE account=?", (account,))
    row = cursor.fetchone()
    conn.close()

    if row and bcrypt.checkpw(password.encode('utf-8'), row[0]):
        return {"success": True, "message": "登入成功", "account": account}
    else:
        return {"success": False, "message": "帳號或密碼錯誤"}

# ====== 查詢使用者資料 ======
def get_user_by_account(account):
    """
    回傳使用者資料（不含密碼）
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, account FROM user WHERE account=?", (account,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "account": row[1]}
    return None

# ====== 初始化 ======
init_db()

# ====== 測試 ======
if __name__ == "__main__":
    print(add_user("testuser", "123456"))
    print(check_user("testuser", "123456"))
    print(check_user("testuser", "wrongpassword"))
    print(get_user_by_account("testuser"))
