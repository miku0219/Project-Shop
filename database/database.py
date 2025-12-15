import sqlite3
from datetime import datetime, timedelta
import os

# ====== 資料庫路徑 ======
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "shop_management.db")

# ====== 取得台灣時間 ======
def get_taiwan_time():
    return (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")

# ====== 初始化資料庫 (保持不變) ======
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

# ====== 商品表 (保持不變) ======
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

# ====== 購物車表 (保持不變) ======
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

# ====== 訂單表 (保持不變) ======
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

# ====== 使用者機制 (保持不變) ======
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

# ====== 商品機制 (保持不變) ======
def get_all_products():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image, level, category, price, stock, description FROM product")
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(["id","name","image","level","category","price","stock","description"], r)) for r in rows]

# ====== 取得商品最高價格 (保持不變) ======
def get_max_price():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(price) FROM product")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row and row[0] is not None else 0

# ====== 購物車機制 (已包含庫存檢查) ======
def add_cart(account, product_id, quantity):

    quantity = int(quantity)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    taiwan_time = get_taiwan_time()
    
    # 檢查該商品是否已在購物車中
    cursor.execute("""
        SELECT id, quantity FROM cart
        WHERE account=? AND product_id=?
    """, (account, product_id))
    row = cursor.fetchone()
    
    # 【庫存檢查 1】檢查商品總庫存是否為零或商品是否存在
    cursor.execute("SELECT stock FROM product WHERE id=?", (product_id,))
    stock_row = cursor.fetchone()
    if not stock_row or stock_row[0] <= 0:
        conn.close()
        return {"success": False, "message": "該商品庫存不足或不存在"}
    
    max_stock = stock_row[0]

    if row:
        cart_id, old_qty = row
        new_qty = old_qty + quantity
        
        # 【庫存檢查 2a】更新時，檢查總數是否超過庫存
        if new_qty > max_stock:
            conn.close()
            return {"success": False, "message": f"加入失敗：總數 ({new_qty}) 超出庫存 ({max_stock})"}
            
        cursor.execute("""
            UPDATE cart SET quantity=?, added_at=?
            WHERE id=?
        """, (new_qty, taiwan_time, cart_id))
    else:
        # 【庫存檢查 2b】新增時，檢查數量是否超過庫存
        if quantity > max_stock:
            conn.close()
            return {"success": False, "message": f"加入失敗：數量 ({quantity}) 超出庫存 ({max_stock})"}

        cursor.execute("""
            INSERT INTO cart (account, product_id, quantity, added_at)
            VALUES (?, ?, ?, ?)
        """, (account, product_id, quantity, taiwan_time))

    conn.commit()
    conn.close()
    return {"success": True, "message": "加入購物車成功"}

# ====== 取得購物車 (回傳購物車數量 cart_qty 和總庫存 stock_qty) ======
def get_cart(account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            c.id, 
            c.product_id, 
            c.quantity AS cart_qty,      -- 購物車數量
            p.name, 
            p.image, 
            p.price,
            (c.quantity * p.price),
            p.level,
            p.stock AS stock_qty         -- 總庫存
        FROM cart c
        JOIN product p ON c.product_id = p.id
        WHERE c.account=?
    """, (account,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip([
        "cart_id", "product_id", "cart_qty",   
        "name", "image", "price", "subtotal", "level", "stock_qty" 
    ], r)) for r in rows]

def delete_cart_item(cart_id, account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE id=? AND account=?", (cart_id, account))
    conn.commit()
    conn.close()
    return {"success": True, "message": "已刪除購物車項目"}

# ====== 結帳 (包含交易、庫存扣除和購物車清理) ======
def checkout_cart(account, selected_items):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    taiwan_time = get_taiwan_time()
    
    try:
        # 1. 檢查庫存並處理交易
        for product_id, quantity in selected_items:
            # 確保 quantity 是整數
            try:
                quantity = int(quantity)
            except ValueError:
                conn.close()
                return {"success": False, "message": "數量格式錯誤"}
            
            # 檢查商品價格和庫存
            cursor.execute("SELECT price, stock FROM product WHERE id=?", (product_id,))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return {"success": False, "message": f"商品 ID:{product_id} 不存在"}
            
            price, stock = row
            
            if quantity <= 0:
                conn.close()
                return {"success": False, "message": "購買數量必須大於 0"}
                
            if quantity > stock:
                conn.close()
                return {"success": False, "message": f"商品 ID:{product_id} 庫存不足，剩餘:{stock}"}

            # 2. 插入訂單 (orders)
            cursor.execute(
                "INSERT INTO orders (account, product_id, quantity, price, checkout_time) VALUES (?, ?, ?, ?, ?)",
                (account, product_id, quantity, price, taiwan_time)
            )
            
            # 3. 扣除庫存 (product.stock)
            new_stock = stock - quantity
            cursor.execute(
                "UPDATE product SET stock=? WHERE id=?",
                (new_stock, product_id)
            )
            
            # 4. 刪除購物車項目 (cart)
            cursor.execute("DELETE FROM cart WHERE account=? AND product_id=?", (account, product_id))

        conn.commit()
        return {"success": True, "message": "結帳成功，庫存已扣除"}

    except Exception as e:
        conn.rollback()
        print(f"結帳處理發生錯誤: {e}")
        return {"success": False, "message": "結帳失敗，請聯繫客服"}
    finally:
        conn.close()


# ====== 歷史訂單 (保持不變) ======
# database.py - get_orders 函式

def get_orders(account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT o.id, o.product_id, o.quantity, o.price, o.checkout_time,
                 p.name, p.image, (o.quantity * o.price), 
                 p.level  -- 【新增】確保查詢結果包含 level
        FROM orders o
        JOIN product p ON o.product_id = p.id
        WHERE o.account=?
        ORDER BY o.checkout_time DESC
    """, (account,))
    rows = cursor.fetchall()
    conn.close()
    
    # 【修改】更新字典鍵，加入 "level"
    return [dict(zip([
        "order_id","product_id","quantity","price","checkout_time","name","image","total", "level"
    ], r)) for r in rows]

# ====== 刪除歷史訂單 (保持不變) ======
def delete_order(order_id, account):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM orders WHERE id=? AND account=?", (order_id, account))
    conn.commit()
    conn.close()
    return {"success": True, "message": "已刪除歷史訂單"}

# ====== 主程式初始化 (保持不變) ======
if __name__ == "__main__":
    init_db()
    print("資料庫初始化完成")