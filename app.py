from flask import Flask, request, jsonify, render_template, session
import os
from flask_apscheduler import APScheduler  # 新增定時任務套件

# 從 database 資料夾匯入所有函式
from database.database import (
    init_db, register_user, login_user, get_products, 
    get_cart_items, add_to_cart, delete_cart_item, 
    checkout_cart, get_orders, get_db, reset_all_stocks, process_checkout
)

app = Flask(__name__)
app.secret_key = os.urandom(24)

# =====================================
# 定時任務配置 (每日 04:00 刷新庫存)
# =====================================
class Config:
    SCHEDULER_API_ENABLED = True

app.config.from_object(Config())
scheduler = APScheduler()

@scheduler.task('cron', id='daily_stock_refresh', hour=4, minute=0)
def scheduled_stock_reset():
    """每日凌晨四點執行庫存刷新"""
    with app.app_context():
        print("【定時任務】觸發凌晨 4:00 庫存刷新...")
        reset_all_stocks(100)  # 預設恢復為 100，可自行調整數值

# =====================================
# 1. 頁面路由 (渲染 HTML)
# =====================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
@app.route('/register')
def auth_page():
    return render_template('auth.html')

@app.route('/cart')
def cart_page():
    return render_template('cart.html')

@app.route('/orders')
def orders_page():
    return render_template('orders.html')

# =====================================
# 2. 使用者 API
# =====================================

@app.route('/api/register', methods=['POST'])
def handle_register():
    data = request.json
    success, message = register_user(data.get('gmail'), data.get('name'), data.get('password'))
    if success:
        return jsonify({"success": True, "message": message}), 201
    return jsonify({"success": False, "message": message}), 400

@app.route('/api/login', methods=['POST'])
def handle_login():
    data = request.json
    user = login_user(data.get('gmail'), data.get('password'))
    if user:
        return jsonify({"success": True, "gmail": user['gmail'], "name": user['name']}), 200
    return jsonify({"success": False, "message": "帳號或密碼錯誤"}), 401

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    gmail = data.get('gmail')
    new_name = data.get('name')
    new_password = data.get('password')

    if not gmail:
        return jsonify({"message": "找不到使用者帳號"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        if new_name:
            cursor.execute("UPDATE users SET name = ? WHERE gmail = ?", (new_name, gmail))
        if new_password:
            cursor.execute("UPDATE users SET password = ? WHERE gmail = ?", (new_password, gmail))
        conn.commit()
        return jsonify({"message": "資料更新成功"}), 200
    except Exception as e:
        conn.rollback()
        print(f"更新錯誤: {e}")
        return jsonify({"message": "系統更新失敗"}), 500
    finally:
        conn.close()

# =====================================
# 3. 商品與購物車 API
# =====================================

@app.route('/api/products', methods=['GET'])
def api_fetch_products():
    gmail = request.args.get('gmail') 
    return jsonify(get_products(gmail))

@app.route('/api/max_price')
def get_max_price():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(price) FROM products")
        result = cursor.fetchone()
        conn.close()
        max_price = result[0] if result and result[0] else 2000
        return jsonify({"max_price": max_price})
    except Exception as e:
        return jsonify({"max_price": 2000, "error": str(e)})

@app.route('/api/cart', methods=['GET', 'POST'])
def handle_cart():
    if request.method == 'GET':
        gmail = request.args.get('gmail')
        if not gmail:
            return jsonify({"message": "缺少使用者身分"}), 400
        return jsonify(get_cart_items(gmail))

    if request.method == 'POST':
        data = request.json
        if not data:
            return jsonify({"message": "無效的請求"}), 400
        
        gmail = data.get('gmail')
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)

        if add_to_cart(gmail, product_id, quantity):
            return jsonify({"message": "已加入購物車"}), 200
        return jsonify({"message": "加入失敗"}), 500

@app.route('/api/cart/<int:cart_id>', methods=['DELETE'])
def handle_delete_cart(cart_id):
    gmail = request.args.get('gmail')
    if not gmail:
        return jsonify({"success": False, "message": "未授權"}), 401
    
    success = delete_cart_item(cart_id, gmail)
    return jsonify({"success": success}), (200 if success else 400)

# =====================================
# 4. 結帳與訂單 API
# =====================================
# app.py 結帳與訂單區塊

@app.route('/api/checkout', methods=['POST'])
def handle_checkout():
    data = request.json
    result = process_checkout(data.get('gmail'), data.get('selected_items'))
    return jsonify({"success": result["success"], "message": result["message"]}), (200 if result["success"] else 400)

@app.route('/api/orders', methods=['GET'])
def api_get_orders():
    gmail = request.args.get('gmail')
    return jsonify(get_orders(gmail))

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def api_delete_order(order_id):
    gmail = request.args.get('gmail')
    if not gmail:
        return jsonify({"success": False, "message": "未授權"}), 401
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM orders WHERE order_id = ? AND gmail = ?", (order_id, gmail))
    conn.commit()
    count = cursor.rowcount
    conn.close()
    
    if count > 0:
        return jsonify({"success": True}), 200
    return jsonify({"success": False, "message": "找不到訂單"}), 404

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    # 從 URL 參數獲取 gmail (?gmail=...)
    gmail = request.args.get('gmail')
    
    if not gmail:
        return jsonify({"success": False, "message": "缺少使用者資訊"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM orders WHERE order_id = ? AND gmail = ?", (order_id, gmail))
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"success": True, "message": "訂單已刪除"}), 200
        else:
            return jsonify({"success": False, "message": "找不到該訂單"}), 404
            
    except Exception as e:
        print(f"刪除出錯: {e}")
        return jsonify({"success": False, "message": "資料庫操作失敗"}), 500
    finally:
        conn.close()

# =====================================
# 5. 啟動伺服器
# =====================================

if __name__ == "__main__":
    init_db() 
    
    # 啟動排程器
    scheduler.init_app(app)
    scheduler.start()
    
    # 注意：debug=True 模式下 reloader 可能會導致任務執行兩次，建議設為 False
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)