import sqlite3
from datetime import datetime, timedelta
import os

# ====== 資料庫路徑 ======
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "shop_management.db")

# ====== 取得台灣時間 ======
def get_taiwan_time():
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")

# ====== 初始化資料庫 ======
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 使用者表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()

    init_product_table()
    init_cart_table()
    init_orders_table()

# ====== 商品表 ======
def init_product_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS product (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image TEXT,
            level TEXT,
            category TEXT,
            price REAL,
            stock INTEGER,
            description TEXT
        )
    ''')
    conn.commit()
    conn.close()

# ====== 購物車表 ======
def init_cart_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            added_at TEXT,
            FOREIGN KEY(account) REFERENCES user(account)
        )
    ''')
    conn.commit()
    conn.close()

# ====== 訂單表 ======
def init_orders_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            price REAL NOT NULL,
            checkout_time TEXT,
            FOREIGN KEY(account) REFERENCES user(account)
        )
    ''')
    conn.commit()
    conn.close()

# ====== 使用者機制 ======
def add_user(account, password):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO user (account, password) VALUES (?, ?)", (account, password))
        conn.commit()
        conn.close()
        return {"success": True, "message": "註冊成功"}
    except sqlite3.IntegrityError:
        return {"success": False, "message": "帳號已存在"}

def check_user(account, password):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM user WHERE account=?", (account,))
    row = cursor.fetchone()
    conn.close()
    if row and row[0] == password:
        return {"success": True, "message": "登入成功", "account": account}
    return {"success": False, "message": "帳號或密碼錯誤"}

# ====== 商品機制 ======
def get_all_products():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image, level, category, price, stock, description FROM product")
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(["id","name","image","level","category","price","stock","description"], r)) for r in rows]

# ====== 購物車機制 ======
def add_cart(account, product_id, quantity):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    taiwan_time = get_taiwan_time()

    cursor.execute("""
        SELECT id, quantity FROM cart
        WHERE account=? AND product_id=?
    """, (account, product_id))
    row = cursor.fetchone()

    if row:
        cart_id, old_qty = row
        new_qty = old_qty + quantity
        cursor.execute("""
            UPDATE cart SET quantity=?, added_at=?
            WHERE id=?
        """, (new_qty, taiwan_time, cart_id))
    else:
        cursor.execute("""
            INSERT INTO cart (account, product_id, quantity, added_at)
            VALUES (?, ?, ?, ?)
        """, (account, product_id, quantity, taiwan_time))

    conn.commit()
    conn.close()
    return {"success": True, "message": "加入購物車成功"}

def get_cart(account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.product_id, c.quantity, p.name, p.image, p.price,
               (c.quantity * p.price)
        FROM cart c
        JOIN product p ON c.product_id = p.id
        WHERE c.account=?
    """, (account,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(["cart_id","product_id","quantity","name","image","price","subtotal"], r)) for r in rows]

def delete_cart_item(cart_id, account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE id=? AND account=?", (cart_id, account))
    conn.commit()
    conn.close()
    return {"success": True, "message": "已刪除購物車項目"}

# ====== 結帳 ======
def checkout_cart(account, selected_items):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    taiwan_time = get_taiwan_time()

    for product_id, quantity in selected_items:
        cursor.execute("SELECT price FROM product WHERE id=?", (product_id,))
        row = cursor.fetchone()
        if row:
            price = row[0]
            cursor.execute(
                "INSERT INTO orders (account, product_id, quantity, price, checkout_time) VALUES (?, ?, ?, ?, ?)",
                (account, product_id, quantity, price, taiwan_time)
            )
            # 刪除已結帳的商品
            cursor.execute("DELETE FROM cart WHERE account=? AND product_id=?", (account, product_id))

    conn.commit()
    conn.close()
    return {"success": True, "message": "結帳成功"}


# ====== 歷史訂單 ======
def get_orders(account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT o.id, o.product_id, o.quantity, o.price, o.checkout_time,
               p.name, p.image, (o.quantity * o.price)
        FROM orders o
        JOIN product p ON o.product_id = p.id
        WHERE o.account=?
        ORDER BY o.checkout_time DESC
    """, (account,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(["order_id","product_id","quantity","price","checkout_time","name","image","total"], r)) for r in rows]

# ====== 刪除歷史訂單 ======
def delete_order(order_id, account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM orders WHERE id=? AND account=?", (order_id, account))
    conn.commit()
    conn.close()
    return {"success": True, "message": "已刪除歷史訂單"}

# ====== 主程式初始化 ======
if __name__ == "__main__":
    init_db()
    print("資料庫初始化完成")
