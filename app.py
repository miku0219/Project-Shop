from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from database.database import (
    add_user,
    check_user,
    get_all_products,
    add_cart,
    get_cart,       
    delete_cart_item,
    checkout_cart,
    get_orders,
    delete_order,
    get_max_price
)

app = Flask(__name__, static_folder="static")
CORS(app)

# ==========================================
#                 頁面路由 (保持不變)
# ==========================================

@app.route("/")
def index_page():
    return render_template("index.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/register")
def register_page():
    return render_template("register.html")


@app.route("/cart")
def cart_page():
    return render_template("cart.html")


@app.route("/orders")
def orders_page():
    return render_template("orders.html")


# ==========================================
#                API 路由 (合併 def)
# ==========================================

# 1. 認證路由 (合併登入和註冊)
@app.route('/api/<action>', methods=['POST'])
def api_auth(action):
    data = request.get_json()
    account = data.get("account")
    password = data.get("password")
    
    if action == 'register':
        result = add_user(account, password)
    elif action == 'login':
        result = check_user(account, password)
    else:
        # 如果路徑不是 /api/register 或 /api/login，則回傳 404 (或 400)
        return jsonify({"success": False, "message": "無效的認證操作"}), 404
        
    return jsonify(result)

# 2. 商品查詢路由 (合併商品列表和最高價格)
@app.route("/api/<resource>", methods=["GET"])
def api_product_info(resource):
    if resource == 'products':
        products = get_all_products()
        return jsonify(products)
    elif resource == 'max_price':
        max_price = get_max_price()
        return jsonify({"max_price": max_price})
    else:
        return jsonify({"success": False, "message": "無效的資源"}), 404


# 3. 購物車核心路由 (合併查詢和新增)
@app.route("/api/cart", methods=["GET", "POST"])
def api_cart():
    
    # --- 處理 GET 請求 (查詢購物車內容) ---
    if request.method == "GET":
        account = request.args.get("account")
        if not account:
            return jsonify({"success": False, "message": "請先登入"}), 401

        items = get_cart(account)
        
        # 進行資料欄位轉換，以符合 cart.js 的期望
        transformed_items = []
        for item in items:
            current_qty = item.pop('cart_qty', 1) 
            stock_qty = item.pop('stock_qty', 100)
            
            item['current_qty'] = current_qty 
            item['quantity'] = stock_qty
            
            transformed_items.append(item)

        return jsonify(transformed_items)

    # --- 處理 POST 請求 (新增商品到購物車，原 /api/add_cart) ---
    elif request.method == "POST":
        data = request.get_json()
        account = data.get("account")
        product_id = data.get("product_id")
        try:
            quantity = int(data.get("quantity", 1))
        except (ValueError, TypeError):
            quantity = 1

        if not account:
            return jsonify({"success": False, "message": "請先登入"}), 401

        if quantity < 1:
            quantity = 1
            
        result = add_cart(account, product_id, quantity)
        return jsonify(result)


# 4. 刪除購物車項目 (不能合併，因為路徑不同)
@app.route("/api/cart/<int:cart_id>", methods=["DELETE"])
def api_delete_cart(cart_id):
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    res = delete_cart_item(cart_id, account)
    return jsonify(res)


# 5. 結帳 (獨立的 POST 請求)
@app.route("/api/checkout", methods=["POST"])
def api_checkout():
    data = request.get_json()
    account = data.get("account")
    selected_items = data.get("selected_items", [])

    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401
    if not selected_items:
        return jsonify({"success": False, "message": "未選擇商品"}), 400
    
    if not isinstance(selected_items, list) or not all(isinstance(item, list) and len(item) == 2 for item in selected_items):
         return jsonify({"success": False, "message": "結帳資料格式錯誤"}), 400

    res = checkout_cart(account, selected_items)
    return jsonify(res)


# 6. 歷史訂單查詢 (不能合併，因為刪除路徑不同)
@app.route("/api/orders", methods=["GET"])
def api_orders_get():
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    orders = get_orders(account)
    return jsonify(orders)


# 7. 刪除歷史訂單 (不能合併，因為路徑不同)
@app.route("/api/orders/<int:order_id>", methods=["DELETE"])
def api_delete_order(order_id):
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    res = delete_order(order_id, account)
    return jsonify(res)


# ==========================================
#               啟動後端
# ==========================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)