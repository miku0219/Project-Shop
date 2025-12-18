import sqlite3
import os
from datetime import datetime

# =====================================
# 1. 資料庫基礎設定
# =====================================

# 自動取得目前檔案所在的目錄路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 將資料庫檔案存放在 database 資料夾下
DB_PATH = os.path.join(BASE_DIR, 'database.db')

def get_db():
    """建立資料庫連線並設定為 Row 模式，讓查詢結果可以直接轉為字典"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化資料庫與所有資料表"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 使用者表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            gmail TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL
        )
    ''')

    # 商品資料表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
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

    # 購物車表 (記錄使用者與商品的關聯)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cart (
            cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
            gmail TEXT,
            product_id INTEGER,
            quantity INTEGER,
            FOREIGN KEY(gmail) REFERENCES users(gmail),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    ''')

    # 訂單表 (記錄結帳後的歷史清單)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            gmail TEXT,
            product_id INTEGER,
            quantity INTEGER,
            price REAL,
            checkout_time TEXT,
            FOREIGN KEY(gmail) REFERENCES users(gmail),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    ''')

    conn.commit()
    conn.close()
# =====================================
# 2. 使用者系統函式
# =====================================

def register_user(gmail, name, password):
    """註冊新使用者"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (gmail, name, password) VALUES (?, ?, ?)", (gmail, name, password))
        conn.commit()
        return True, "註冊成功"
    except sqlite3.IntegrityError:
        return False, "此 Gmail 已被註冊"
    finally:
        conn.close()

def login_user(gmail, password):
    """驗證登入並回傳使用者資料"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT gmail, name FROM users WHERE gmail = ? AND password = ?", (gmail, password))
    user = cursor.fetchone()
    conn.close()
    return user # 回傳 Row 物件或 None

# =====================================
# 3. 商品與購物車函式
# =====================================

def get_products(gmail=None):
    """取得所有商品"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_cart_items(gmail):
    """獲取指定使用者的購物車內容與商品詳情"""
    conn = get_db()
    cursor = conn.cursor()
    query = """
        SELECT c.cart_id, p.name, p.price, p.image, p.level, c.quantity, p.id as product_id
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.gmail = ?
    """
    cursor.execute(query, (gmail,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_to_cart(gmail, product_id, quantity):
    """新增商品至購物車，若已存在則合併數量"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # 檢查是否已存在於購物車
        cursor.execute("SELECT cart_id, quantity FROM cart WHERE gmail = ? AND product_id = ?", (gmail, product_id))
        item = cursor.fetchone()

        if item:
            new_qty = item['quantity'] + int(quantity)
            cursor.execute("UPDATE cart SET quantity = ? WHERE cart_id = ?", (new_qty, item['cart_id']))
        else:
            cursor.execute("INSERT INTO cart (gmail, product_id, quantity) VALUES (?, ?, ?)", (gmail, product_id, int(quantity)))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"購物車新增失敗: {e}")
        return False
    finally:
        conn.close()

def delete_cart_item(cart_id, gmail):
    """刪除指定購物車項目"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE cart_id = ? AND gmail = ?", (cart_id, gmail))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

# =====================================
# 4. 結帳與訂單函式
# =====================================

def checkout_cart(gmail, selected_items):
    """
    結帳邏輯：
    1. 將勾選的商品存入 orders 表
    2. 從 cart 表中移除該商品
    """
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        for p_id, qty in selected_items:
            # 獲取最新價格
            cursor.execute("SELECT price FROM products WHERE id = ?", (p_id,))
            res = cursor.fetchone()
            if not res: continue
            p_price = res[0]

            # 寫入訂單
            cursor.execute("""
                INSERT INTO orders (gmail, product_id, quantity, price, checkout_time)
                VALUES (?, ?, ?, ?, ?)
            """, (gmail, p_id, qty, p_price, now))

            # 移除購物車項目
            cursor.execute("DELETE FROM cart WHERE gmail = ? AND product_id = ?", (gmail, p_id))

        conn.commit()
        return True, "結帳成功"
    except Exception as e:
        conn.rollback()
        return False, str(e)
    finally:
        conn.close()

def process_checkout(gmail, selected_items):
    conn = get_db()
    cursor = conn.cursor()
    try:
        with conn:
            for item in selected_items:
                p_id, qty = int(item[0]), int(item[1])
                
                # 1. 先抓取商品資訊（檢查庫存與取得價格）
                cursor.execute("SELECT stock, price FROM products WHERE id = ?", (p_id,))
                product = cursor.fetchone()
                
                if not product or product['stock'] < qty:
                    raise Exception("庫存不足")

                # 2. 扣除庫存
                cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (qty, p_id))

                # 3. 寫入訂單 (這裡不寫入 image，因為 orders table 沒這欄位)
                cursor.execute("""
                    INSERT INTO orders (gmail, product_id, quantity, price, checkout_time)
                    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
                """, (gmail, p_id, qty, product['price']))
                
                # 4. 刪除購物車
                cursor.execute("DELETE FROM cart WHERE gmail = ? AND product_id = ?", (gmail, p_id))
        
        return {"success": True, "message": "結帳成功"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        conn.close()
        
def get_orders(gmail):
    conn = get_db()
    cursor = conn.cursor()
    # 使用 JOIN 從 products 表中抓取 image 和 level
    query = """
        SELECT 
            o.order_id, 
            o.quantity, 
            o.price, 
            o.checkout_time, 
            p.name as product_name, 
            p.image, 
            p.level 
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.gmail = ? 
        ORDER BY o.checkout_time DESC
    """
    cursor.execute(query, (gmail,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# =====================================
# 執行測試 (直接執行此檔案時會初始化)
# =====================================
if __name__ == "__main__":
    init_db()
    
# 在 database.py 最後面加入
def reset_all_stocks(default_value=100):
    """將所有商品庫存重置為預設值"""
    conn = get_db()
    try:
        cursor = conn.cursor()
        # 更新所有商品的 stock 欄位
        cursor.execute("UPDATE products SET stock = ?", (default_value,))
        conn.commit()
        print(f"【系統】庫存已於 {datetime.now()} 成功刷新為 {default_value}")
        return True
    except Exception as e:
        print(f"【系統】庫存刷新失敗: {e}")
        return False
    finally:
        conn.close()