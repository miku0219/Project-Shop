import sqlite3
import os

# 取得目前這個 database.py 的絕對路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 組合出資料庫絕對路徑（與 database.py 同資料夾）
DB_PATH = os.path.join(BASE_DIR, "shop_management.db")

# ====== 初始化資料庫 ======
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY,
        account TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()

# ====== 新增使用者 ======
def add_user(account, password):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO user (account, password) VALUES (?, ?)",(account, password))
        conn.commit()
        conn.close()
        return {"success": True, "message": "註冊成功"}
    except sqlite3.IntegrityError:
        return {"success": False, "message": "帳號已存在"}

# ====== 驗證使用者登入 ======
def check_user(account, password):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM user WHERE account=?", (account,))
    row = cursor.fetchone()
    conn.close()

    if row and row[0] == password:
        return {"success": True, "message": "登入成功", "account": account}

    return {"success": False, "message": "帳號或密碼錯誤"}

