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
    delete_order
)

app = Flask(__name__, static_folder="static")
CORS(app)

# ==========================================
#                 頁面路由
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
#                API 路由
# ==========================================

# 註冊
@app.route('/api/register', methods=['POST'])
def register_api():
    data = request.get_json()
    account = data.get("account")
    password = data.get("password")
    result = add_user(account, password)
    return jsonify(result)


# 登入
@app.route('/api/login', methods=['POST'])
def login_api():
    data = request.get_json()
    account = data.get("account")
    password = data.get("password")
    result = check_user(account, password)
    return jsonify(result)


# 商品
@app.route("/api/products", methods=["GET"])
def api_get_products():
    products = get_all_products()
    return jsonify(products)


# 加入購物車
@app.route("/api/add_cart", methods=["POST"])
def api_add_cart():
    data = request.get_json()
    account = data.get("account")
    product_id = data.get("product_id")
    quantity = data.get("quantity", 1)

    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    result = add_cart(account, product_id, quantity)
    return jsonify(result)


# 取得購物車
@app.route("/api/cart", methods=["GET"])
def api_get_cart():
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    items = get_cart(account)
    return jsonify(items)


# 刪除購物車項目
@app.route("/api/cart/<int:cart_id>", methods=["DELETE"])
def api_delete_cart(cart_id):
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    res = delete_cart_item(cart_id, account)
    return jsonify(res)


# 結帳
@app.route("/api/checkout", methods=["POST"])
def api_checkout():
    data = request.get_json()
    account = data.get("account")
    selected_items = data.get("selected_items", [])

    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401
    if not selected_items:
        return jsonify({"success": False, "message": "未選擇商品"}), 400

    from database.database import checkout_cart
    res = checkout_cart(account, selected_items)
    return jsonify(res)



# 歷史訂單
@app.route("/api/orders", methods=["GET"])
def api_orders():
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    orders = get_orders(account)
    return jsonify(orders)


# 刪除單筆歷史訂單
@app.route("/api/orders/<int:order_id>", methods=["DELETE"])
def api_delete_order(order_id):
    account = request.args.get("account")
    if not account:
        return jsonify({"success": False, "message": "請先登入"}), 401

    res = delete_order(order_id, account)
    return jsonify(res)


# ==========================================
#               啟動後端
# ==========================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
