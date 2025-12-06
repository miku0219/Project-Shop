from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from database.database import add_user, check_user, get_all_products, add_cart

app = Flask(__name__, static_folder="static")
CORS(app)

# ==========================================
#             頁面路由
# ==========================================

# 首頁
@app.route("/")
def index_page():
    return render_template("index.html")

# 登入頁
@app.route("/login")
def login_page():
    return render_template("login.html")

# 註冊頁
@app.route("/register")
def register_page():
    return render_template("register.html")


# ==========================================
#              API 路由
# ==========================================

# 註冊 API
@app.route('/api/register', methods=['POST'])
def register_api():
    data = request.get_json()
    account = data.get("account")
    password = data.get("password")
    result = add_user(account, password)
    return jsonify(result)

# 登入 API
@app.route('/api/login', methods=['POST'])
def login_api():
    data = request.get_json()
    account = data.get("account")
    password = data.get("password")
    result = check_user(account, password)
    return jsonify(result)

@app.route("/api/products")
def api_get_products():
    products = get_all_products()
    return jsonify(products)

@app.route("/api/add_cart", methods=["POST"])
def api_add_cart():
    data = request.get_json()
    account = data.get("account")
    product_id = data.get("product_id")
    quantity = data.get("quantity")

    result = add_cart(account, product_id, quantity)
    return jsonify(result)


# ==========================================
# 啟動後端
# ==========================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
