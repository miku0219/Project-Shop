from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from database.database import add_user, check_user

app = Flask(__name__)
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


# ==========================================
# 啟動後端
# ==========================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
