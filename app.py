from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, date
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
import re
import psycopg2
from psycopg2.extras import RealDictCursor


# =========================================================
# SALESNOVA APPLICATION
# PostgreSQL + Flask backend
# =========================================================

app = Flask(__name__)

# =========================================================
# CONFIGURATION
# =========================================================

app.secret_key = os.environ.get(
    "SALESNOVA_SECRET_KEY",
    "salesnova-development-secret-key"
)

VERCEL_ENV = os.environ.get("VERCEL_ENV", "development")
IS_PRODUCTION = VERCEL_ENV == "production"

DATABASE_URL = os.environ.get("DATABASE_URL")

FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    "http://127.0.0.1:5500"
).rstrip("/")

UPLOAD_FOLDER = os.environ.get(
    "UPLOAD_FOLDER",
    "/tmp/salesnova_uploads" if os.environ.get("VERCEL") else "uploads"
)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "None" if IS_PRODUCTION else "Lax"
app.config["SESSION_COOKIE_SECURE"] = IS_PRODUCTION

allowed_origins = {
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    FRONTEND_URL
}

CORS(
    app,
    supports_credentials=True,
    origins=list(allowed_origins)
)

if not os.environ.get("VERCEL"):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================================================
# DATABASE
# =========================================================

def get_db():
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is not configured."
        )

    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname TEXT NOT NULL,
                business TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                category TEXT,
                description TEXT,
                profile_picture TEXT,
                notifications INTEGER DEFAULT 1,
                theme TEXT DEFAULT 'dark',
                login_alerts INTEGER DEFAULT 1,
                security_alerts INTEGER DEFAULT 1
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                product TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                total DOUBLE PRECISION NOT NULL,
                sale_date TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                stock INTEGER NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                created_at TEXT NOT NULL,
                last_sale TEXT,
                low_stock_alert_sent INTEGER DEFAULT 0,
                out_of_stock_alert_sent INTEGER DEFAULT 0
            )
        """)

        # Safe migrations for databases created by older versions.
        user_columns = {
            "phone": "TEXT",
            "address": "TEXT",
            "category": "TEXT",
            "description": "TEXT",
            "profile_picture": "TEXT",
            "notifications": "INTEGER DEFAULT 1",
            "theme": "TEXT DEFAULT 'dark'",
            "login_alerts": "INTEGER DEFAULT 1",
            "security_alerts": "INTEGER DEFAULT 1"
        }

        for column, definition in user_columns.items():
            cursor.execute(f"""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS {column} {definition}
            """)

        product_columns = {
            "low_stock_alert_sent": "INTEGER DEFAULT 0",
            "out_of_stock_alert_sent": "INTEGER DEFAULT 0"
        }

        for column, definition in product_columns.items():
            cursor.execute(f"""
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS {column} {definition}
            """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sales_user_id
            ON sales(user_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_products_user_id
            ON products(user_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email
            ON users(email)
        """)

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


if DATABASE_URL:
    try:
        init_db()
        print("SalesNova PostgreSQL database initialized.")
    except Exception as exc:
        print("DATABASE INITIALIZATION ERROR:", exc)
else:
    print("WARNING: DATABASE_URL is not configured.")


# =========================================================
# HELPERS
# =========================================================

def require_login():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return None


def current_user_id():
    return session.get("user_id")


def normalize_picture_name(value):
    if not value:
        return ""

    value = str(value).replace("\\", "/")

    if "/uploads/" in value:
        value = value.split("/uploads/", 1)[1]

    return value.lstrip("/")


def profile_picture_url(filename):
    filename = normalize_picture_name(filename)
    if not filename:
        return ""
    return f"{FRONTEND_URL}/uploads/{filename}"


def parse_positive_int(value, field_name, minimum=1):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number.")

    if parsed < minimum:
        raise ValueError(
            f"{field_name} must be at least {minimum}."
        )

    return parsed


def parse_nonnegative_float(value, field_name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number.")

    if parsed < 0:
        raise ValueError(f"{field_name} cannot be negative.")

    return parsed


def sale_date_value(value=None):
    if value:
        return str(value)
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def get_inventory_stats(user_id):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(stock), 0) AS total_stock,
                COALESCE(SUM(stock * price), 0) AS inventory_value,
                COALESCE(SUM(CASE WHEN stock <= 5 AND stock > 0 THEN 1 ELSE 0 END), 0) AS low_stock,
                COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock
            FROM products
            WHERE user_id = %s
        """, (user_id,))

        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def calculate_prediction(user_id):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT product, quantity, price, total, sale_date
            FROM sales
            WHERE user_id = %s
            ORDER BY sale_date ASC, id ASC
        """, (user_id,))

        rows = cursor.fetchall()

        if not rows:
            return {
                "available": False,
                "message": "No sales data available for prediction.",
                "tomorrow": 0,
                "week": 0,
                "month": 0,
                "growth": 0,
                "average_sales": 0,
                "best_seller": None
            }

        totals = [float(row["total"] or 0) for row in rows]

        # Keep the prediction focused on recent business activity.
        recent_totals = totals[-30:]
        latest_five = recent_totals[-5:]

        average_sales = (
            sum(latest_five) / len(latest_five)
            if latest_five else 0
        )

        if len(recent_totals) > 5:
            previous = recent_totals[:-5]
            previous_average = sum(previous) / len(previous)

            if previous_average > 0:
                growth = (
                    (average_sales - previous_average)
                    / previous_average
                )
            else:
                growth = 0
        else:
            growth = 0

        # Prevent very small datasets or unusual spikes from producing
        # unrealistic predictions.
        growth = max(-0.30, min(0.30, growth))

        tomorrow = round(
            max(average_sales * (1 + growth), 0),
            2
        )

        week = round(tomorrow * 7, 2)
        month = round(tomorrow * 30, 2)

        cursor.execute("""
            SELECT
                product,
                COALESCE(SUM(quantity), 0) AS quantity_sold
            FROM sales
            WHERE user_id = %s
            GROUP BY product
            ORDER BY quantity_sold DESC, product ASC
            LIMIT 1
        """, (user_id,))

        best = cursor.fetchone()

        return {
            "available": True,
            "message": "Prediction generated successfully.",
            "tomorrow": tomorrow,
            "week": week,
            "month": month,
            "growth": round(growth * 100, 2),
            "average_sales": round(average_sales, 2),
            "best_seller": (
                best["product"] if best else None
            ),
            "sales_count": len(totals)
        }

    finally:
        cursor.close()
        conn.close()


# =========================================================
# BASIC ROUTES
# =========================================================

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "landing_page.html")


@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(
        os.path.join(BASE_DIR, "css"),
        filename
    )


@app.route("/webfonts/<path:filename>")
def serve_webfonts(filename):
    return send_from_directory(
        os.path.join(BASE_DIR, "webfonts"),
        filename
    )


@app.route("/<path:filename>")
def serve_static_file(filename):
    return send_from_directory(BASE_DIR, filename)


# =========================================================
# AUTHENTICATION
# =========================================================

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    fullname = str(data.get("fullname", "")).strip()
    business = str(data.get("business", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not fullname or not business or not email or not password:
        return jsonify({
            "error": "Please fill in all fields."
        }), 400

    if not re.match(r"^[A-Za-z0-9._%+-]+@gmail\.com$", email):
        return jsonify({
            "error": "Please enter a valid Gmail address."
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters."
        }), 400

    hashed_password = generate_password_hash(password)
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id
            FROM users
            WHERE email = %s
        """, (email,))

        if cursor.fetchone():
            return jsonify({
                "error": "This email has already been registered."
            }), 400

        cursor.execute("""
            INSERT INTO users
                (fullname, business, email, password)
            VALUES (%s, %s, %s, %s)
        """, (
            fullname,
            business,
            email,
            hashed_password
        ))

        conn.commit()

        return jsonify({
            "message": "Registration successful. Please login."
        }), 201

    except Exception as exc:
        conn.rollback()
        print("REGISTER ERROR:", exc)
        return jsonify({
            "error": "Unable to create account. Please try again."
        }), 500

    finally:
        cursor.close()
        conn.close()


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM users
            WHERE email = %s
        """, (email,))
        user = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if user is None:
        return jsonify({
            "error": "Account not found."
        }), 404

    if not check_password_hash(user["password"], password):
        return jsonify({
            "error": "Incorrect password."
        }), 401

    session.clear()
    session["user_id"] = user["id"]
    session["fullname"] = user["fullname"]
    session["business"] = user["business"]
    session["email"] = user["email"]

    return jsonify({
        "message": "Login successful"
    })


@app.route("/check_session")
def check_session():
    if "user_id" not in session:
        return jsonify({"logged_in": False})

    return jsonify({
        "logged_in": True,
        "fullname": session.get("fullname", ""),
        "business": session.get("business", ""),
        "email": session.get("email", "")
    })


@app.route("/logout")
def logout():
    session.clear()
    return jsonify({
        "message": "Logged out successfully."
    })


# =========================================================
# USER / PROFILE
# =========================================================

@app.route("/user")
def get_user():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT profile_picture
            FROM users
            WHERE id = %s
        """, (current_user_id(),))
        profile = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    picture = normalize_picture_name(
        profile["profile_picture"] if profile else ""
    )

    return jsonify({
        "fullname": session.get("fullname", ""),
        "business": session.get("business", ""),
        "email": session.get("email", ""),
        "profile_image": profile_picture_url(picture)
    })


@app.route("/profile", methods=["GET"])
def profile():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                fullname,
                business,
                email,
                phone,
                address,
                category,
                description,
                profile_picture,
                notifications,
                theme,
                login_alerts,
                security_alerts
            FROM users
            WHERE id = %s
        """, (current_user_id(),))
        user = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if user is None:
        return jsonify({"error": "User not found."}), 404

    return jsonify({
        "fullname": user["fullname"] or "",
        "business": user["business"] or "",
        "email": user["email"] or "",
        "phone": user["phone"] or "",
        "address": user["address"] or "",
        "category": user["category"] or "",
        "description": user["description"] or "",
        "profile_picture": normalize_picture_name(
            user["profile_picture"]
        ),
        "notifications": bool(
            user["notifications"]
            if user["notifications"] is not None else 1
        ),
        "theme": user["theme"] or "dark",
        "login_alerts": bool(
            user["login_alerts"]
            if user["login_alerts"] is not None else 1
        ),
        "security_alerts": bool(
            user["security_alerts"]
            if user["security_alerts"] is not None else 1
        )
    })


@app.route("/update_profile", methods=["PUT", "POST"])
def update_profile():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}

    fullname = str(data.get("fullname", "")).strip()
    business = str(data.get("business", "")).strip()
    phone = str(data.get("phone", "")).strip()
    address = str(data.get("address", "")).strip()
    category = str(data.get("category", "")).strip()
    description = str(data.get("description", "")).strip()

    if not fullname:
        return jsonify({
            "error": "Full name is required."
        }), 400

    if not business:
        return jsonify({
            "error": "Business name is required."
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE users
            SET
                fullname = %s,
                business = %s,
                phone = %s,
                address = %s,
                category = %s,
                description = %s
            WHERE id = %s
        """, (
            fullname,
            business,
            phone,
            address,
            category,
            description,
            current_user_id()
        ))
        conn.commit()
    except Exception as exc:
        conn.rollback()
        print("UPDATE PROFILE ERROR:", exc)
        return jsonify({
            "error": "Unable to update profile."
        }), 500
    finally:
        cursor.close()
        conn.close()

    session["fullname"] = fullname
    session["business"] = business

    return jsonify({
        "message": "Profile updated successfully."
    })


@app.route("/upload_profile_picture", methods=["POST"])
def upload_profile_picture():
    auth = require_login()
    if auth:
        return auth

    if "profile_picture" not in request.files:
        return jsonify({
            "error": "No profile picture was uploaded."
        }), 400

    file = request.files["profile_picture"]

    if not file or not file.filename:
        return jsonify({
            "error": "Please select an image."
        }), 400

    allowed_extensions = {"png", "jpg", "jpeg", "webp"}
    original_name = file.filename

    if "." not in original_name:
        return jsonify({"error": "Invalid image file."}), 400

    extension = original_name.rsplit(".", 1)[-1].lower()

    if extension not in allowed_extensions:
        return jsonify({
            "error": "Only PNG, JPG, JPEG and WEBP images are allowed."
        }), 400

    safe_name = secure_filename(original_name)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = (
        f"user_{current_user_id()}_"
        f"{timestamp}_"
        f"{safe_name}"
    )

    upload_folder = app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE users
            SET profile_picture = %s
            WHERE id = %s
        """, (filename, current_user_id()))
        conn.commit()
    except Exception as exc:
        conn.rollback()
        print("PROFILE PICTURE ERROR:", exc)
        return jsonify({
            "error": "Unable to save profile picture."
        }), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Profile picture updated successfully.",
        "profile_picture": filename
    })


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename
    )


# =========================================================
# PASSWORD
# =========================================================

@app.route("/change_password", methods=["POST", "PUT"])
def change_password():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}

    current_password = str(data.get("current_password", ""))
    new_password = str(data.get("new_password", ""))
    confirm_password = str(data.get("confirm_password", ""))

    if not current_password or not new_password or not confirm_password:
        return jsonify({
            "error": "Please fill in all password fields."
        }), 400

    if new_password != confirm_password:
        return jsonify({
            "error": "New passwords do not match."
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "error": "New password must contain at least 6 characters."
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT password
            FROM users
            WHERE id = %s
        """, (current_user_id(),))
        user = cursor.fetchone()

        if user is None:
            return jsonify({"error": "User not found."}), 404

        if not check_password_hash(
            user["password"],
            current_password
        ):
            return jsonify({
                "error": "Current password is incorrect."
            }), 401

        cursor.execute("""
            UPDATE users
            SET password = %s
            WHERE id = %s
        """, (
            generate_password_hash(new_password),
            current_user_id()
        ))

        conn.commit()

    except Exception as exc:
        conn.rollback()
        print("CHANGE PASSWORD ERROR:", exc)
        return jsonify({
            "error": "Unable to change password."
        }), 500

    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Password changed successfully."
    })


# =========================================================
# SETTINGS
# =========================================================

@app.route("/settings", methods=["GET"])
def get_settings():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                notifications,
                theme,
                login_alerts,
                security_alerts
            FROM users
            WHERE id = %s
        """, (current_user_id(),))
        settings = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if settings is None:
        return jsonify({"error": "User not found."}), 404

    return jsonify({
        "notifications": bool(
            settings["notifications"]
            if settings["notifications"] is not None else 1
        ),
        "theme": settings["theme"] or "dark",
        "login_alerts": bool(
            settings["login_alerts"]
            if settings["login_alerts"] is not None else 1
        ),
        "security_alerts": bool(
            settings["security_alerts"]
            if settings["security_alerts"] is not None else 1
        )
    })


@app.route("/notification_settings", methods=["POST", "PUT"])
def notification_settings():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}
    enabled = data.get("notifications", data.get("enabled"))

    if enabled is None:
        return jsonify({
            "error": "Notification setting is required."
        }), 400

    enabled = 1 if bool(enabled) else 0

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE users
            SET notifications = %s
            WHERE id = %s
        """, (enabled, current_user_id()))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Notification settings updated.",
        "notifications": bool(enabled)
    })


@app.route("/appearance_settings", methods=["POST", "PUT"])
def appearance_settings():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}
    theme = str(data.get("theme", "dark")).lower()

    if theme not in {"dark", "light"}:
        return jsonify({
            "error": "Theme must be dark or light."
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE users
            SET theme = %s
            WHERE id = %s
        """, (theme, current_user_id()))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Appearance settings updated.",
        "theme": theme
    })


@app.route("/security_settings", methods=["POST", "PUT"])
def security_settings():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}

    login_alerts = 1 if bool(data.get("login_alerts", 1)) else 0
    security_alerts = 1 if bool(data.get("security_alerts", 1)) else 0

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE users
            SET
                login_alerts = %s,
                security_alerts = %s
            WHERE id = %s
        """, (
            login_alerts,
            security_alerts,
            current_user_id()
        ))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Security settings updated.",
        "login_alerts": bool(login_alerts),
        "security_alerts": bool(security_alerts)
    })


# =========================================================
# PRODUCTS / INVENTORY
# =========================================================

@app.route("/check_products_table")
def check_products_table():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT COUNT(*) AS count
            FROM products
            WHERE user_id = %s
        """, (current_user_id(),))
        result = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "exists": True,
        "count": int(result["count"] or 0)
    })


@app.route("/add_product", methods=["POST"])
def add_product():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}

    product_name = str(
        data.get("product_name", data.get("product", ""))
    ).strip()

    try:
        stock = parse_positive_int(
            data.get("stock", 0),
            "Stock",
            minimum=0
        )
        price = parse_nonnegative_float(
            data.get("price", 0),
            "Price"
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not product_name:
        return jsonify({"error": "Product name is required."}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id
            FROM products
            WHERE user_id = %s
              AND LOWER(product_name) = LOWER(%s)
        """, (current_user_id(), product_name))

        if cursor.fetchone():
            return jsonify({
                "error": "A product with this name already exists."
            }), 400

        cursor.execute("""
            INSERT INTO products
                (user_id, product_name, stock, price, created_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            current_user_id(),
            product_name,
            stock,
            price,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        product_id = cursor.fetchone()["id"]
        conn.commit()

    except Exception as exc:
        conn.rollback()
        print("ADD PRODUCT ERROR:", exc)
        return jsonify({
            "error": "Unable to add product."
        }), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Product added successfully.",
        "product_id": product_id
    }), 201


@app.route("/products", methods=["GET"])
def products():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                product_name,
                stock,
                price,
                created_at,
                last_sale,
                low_stock_alert_sent,
                out_of_stock_alert_sent
            FROM products
            WHERE user_id = %s
            ORDER BY id DESC
        """, (current_user_id(),))

        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    result = []

    for row in rows:
        stock = int(row["stock"] or 0)

        if stock <= 0:
            status = "out_of_stock"
        elif stock <= 5:
            status = "low_stock"
        else:
            status = "in_stock"

        result.append({
            "id": row["id"],
            "product_name": row["product_name"],
            "stock": stock,
            "price": float(row["price"] or 0),
            "created_at": row["created_at"],
            "last_sale": row["last_sale"],
            "status": status,
            "low_stock": stock > 0 and stock <= 5,
            "out_of_stock": stock <= 0
        })

    return jsonify(result)


@app.route("/product/<int:product_id>", methods=["GET"])
def get_product(product_id):
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                product_name,
                stock,
                price,
                created_at,
                last_sale
            FROM products
            WHERE id = %s
              AND user_id = %s
        """, (product_id, current_user_id()))
        product = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if not product:
        return jsonify({"error": "Product not found."}), 404

    return jsonify({
        "id": product["id"],
        "product_name": product["product_name"],
        "stock": int(product["stock"] or 0),
        "price": float(product["price"] or 0),
        "created_at": product["created_at"],
        "last_sale": product["last_sale"]
    })


@app.route("/update_product/<int:product_id>", methods=["PUT", "POST"])
def update_product(product_id):
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}

    product_name = str(
        data.get("product_name", data.get("product", ""))
    ).strip()

    try:
        stock = parse_positive_int(
            data.get("stock", 0),
            "Stock",
            minimum=0
        )
        price = parse_nonnegative_float(
            data.get("price", 0),
            "Price"
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not product_name:
        return jsonify({"error": "Product name is required."}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id
            FROM products
            WHERE id = %s
              AND user_id = %s
        """, (product_id, current_user_id()))

        if not cursor.fetchone():
            return jsonify({"error": "Product not found."}), 404

        cursor.execute("""
            SELECT id
            FROM products
            WHERE user_id = %s
              AND LOWER(product_name) = LOWER(%s)
              AND id <> %s
        """, (
            current_user_id(),
            product_name,
            product_id
        ))

        if cursor.fetchone():
            return jsonify({
                "error": "A product with this name already exists."
            }), 400

        cursor.execute("""
            UPDATE products
            SET
                product_name = %s,
                stock = %s,
                price = %s,
                low_stock_alert_sent = 0,
                out_of_stock_alert_sent = 0
            WHERE id = %s
              AND user_id = %s
        """, (
            product_name,
            stock,
            price,
            product_id,
            current_user_id()
        ))

        conn.commit()

    except Exception as exc:
        conn.rollback()
        print("UPDATE PRODUCT ERROR:", exc)
        return jsonify({
            "error": "Unable to update product."
        }), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Product updated successfully."
    })

    @app.route("/delete_product/<int:product_id>", methods=["DELETE", "POST"])
def delete_product(product_id):
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id
            FROM products
            WHERE id = %s
              AND user_id = %s
        """, (product_id, current_user_id()))

        product = cursor.fetchone()

        if not product:
            return jsonify({
                "error": "Product not found."
            }), 404

        cursor.execute("""
            DELETE FROM products
            WHERE id = %s
              AND user_id = %s
        """, (product_id, current_user_id()))

        conn.commit()

        return jsonify({
            "message": "Product deleted successfully."
        }), 200

    except Exception as exc:
        conn.rollback()
        print("DELETE PRODUCT ERROR:", exc)

        return jsonify({
            "error": "Unable to delete product."
        }), 500

    finally:
        cursor.close()
        conn.close()


# =========================================================
# SALES
# =========================================================

@app.route("/add_sale", methods=["POST"])
def add_sale():
    auth = require_login()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}

    product = str(
        data.get("product", data.get("product_name", ""))
    ).strip()

    try:
        quantity = parse_positive_int(
            data.get("quantity", 0),
            "Quantity"
        )
        price = parse_nonnegative_float(
            data.get("price", 0),
            "Price"
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not product:
        return jsonify({"error": "Product is required."}), 400

    total = round(quantity * price, 2)
    requested_date = data.get("sale_date")
    sale_date = sale_date_value(requested_date)

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, stock, price
            FROM products
            WHERE user_id = %s
              AND LOWER(product_name) = LOWER(%s)
            LIMIT 1
        """, (current_user_id(), product))

        product_row = cursor.fetchone()

        if product_row:
            stock = int(product_row["stock"] or 0)

            if stock < quantity:
                return jsonify({
                    "error": "Not enough stock available for this sale."
                }), 400

            cursor.execute("""
                UPDATE products
                SET
                    stock = stock - %s,
                    last_sale = %s,
                    low_stock_alert_sent = 0,
                    out_of_stock_alert_sent = 0
                WHERE id = %s
                  AND user_id = %s
            """, (
                quantity,
                sale_date,
                product_row["id"],
                current_user_id()
            ))

        cursor.execute("""
            INSERT INTO sales
                (user_id, product, quantity, price, total, sale_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            current_user_id(),
            product,
            quantity,
            price,
            total,
            sale_date
        ))

        sale_id = cursor.fetchone()["id"]
        conn.commit()

    except Exception as exc:
        conn.rollback()
        print("ADD SALE ERROR:", exc)
        return jsonify({
            "error": "Unable to save sale."
        }), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Sale recorded successfully.",
        "sale_id": sale_id,
        "product": product,
        "quantity": quantity,
        "price": price,
        "total": total,
        "sale_date": sale_date
    }), 201


@app.route("/sales", methods=["GET"])
def sales():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                product,
                quantity,
                price,
                total,
                sale_date
            FROM sales
            WHERE user_id = %s
            ORDER BY sale_date DESC, id DESC
        """, (current_user_id(),))

        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    return jsonify([
        {
            "id": row["id"],
            "product": row["product"],
            "quantity": int(row["quantity"] or 0),
            "price": float(row["price"] or 0),
            "total": float(row["total"] or 0),
            "sale_date": row["sale_date"]
        }
        for row in rows
    ])


@app.route("/delete_sale/<int:sale_id>", methods=["DELETE", "POST"])
def delete_sale(sale_id):
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT product, quantity
            FROM sales
            WHERE id = %s
              AND user_id = %s
        """, (sale_id, current_user_id()))

        sale = cursor.fetchone()

        if not sale:
            return jsonify({"error": "Sale not found."}), 404

        # Restore inventory when a recorded sale is deleted and the
        # corresponding product still exists.
        cursor.execute("""
            UPDATE products
            SET stock = stock + %s
            WHERE user_id = %s
              AND LOWER(product_name) = LOWER(%s)
        """, (
            int(sale["quantity"] or 0),
            current_user_id(),
            sale["product"]
        ))

        cursor.execute("""
            DELETE FROM sales
            WHERE id = %s
              AND user_id = %s
        """, (sale_id, current_user_id()))

        conn.commit()

    except Exception as exc:
        conn.rollback()
        print("DELETE SALE ERROR:", exc)
        return jsonify({
            "error": "Unable to delete sale."
        }), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": "Sale deleted successfully."
    })


# =========================================================
# DASHBOARD STATISTICS
# =========================================================

@app.route("/dashboard_stats")
def dashboard_stats():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                COUNT(*) AS transactions,
                COALESCE(SUM(total), 0) AS total_sales,
                COALESCE(SUM(quantity), 0) AS products_sold
            FROM sales
            WHERE user_id = %s
        """, (current_user_id(),))
        stats = cursor.fetchone()

        cursor.execute("""
            SELECT
                COALESCE(SUM(total), 0) AS today_sales,
                COUNT(*) AS today_transactions,
                COALESCE(SUM(quantity), 0) AS today_products_sold
            FROM sales
            WHERE user_id = %s
              AND LEFT(sale_date, 10) = %s
        """, (
            current_user_id(),
            date.today().isoformat()
        ))
        today = cursor.fetchone()

        cursor.execute("""
            SELECT
                product,
                COALESCE(SUM(quantity), 0) AS quantity_sold
            FROM sales
            WHERE user_id = %s
            GROUP BY product
            ORDER BY quantity_sold DESC, product ASC
            LIMIT 1
        """, (current_user_id(),))
        best = cursor.fetchone()

        cursor.execute("""
            SELECT
                LEFT(sale_date, 10) AS sale_day,
                COALESCE(SUM(total), 0) AS total
            FROM sales
            WHERE user_id = %s
            GROUP BY LEFT(sale_date, 10)
            ORDER BY sale_day ASC
        """, (current_user_id(),))
        chart_rows = cursor.fetchall()

    finally:
        cursor.close()
        conn.close()

    prediction = calculate_prediction(current_user_id())

    return jsonify({
        "transactions": int(stats["transactions"] or 0),
        "total_sales": float(stats["total_sales"] or 0),
        "products_sold": int(stats["products_sold"] or 0),
        "today_sales": float(today["today_sales"] or 0),
        "today_transactions": int(today["today_transactions"] or 0),
        "today_products_sold": int(today["today_products_sold"] or 0),
        "best_selling_product": (
            best["product"] if best else None
        ),
        "best_selling_quantity": (
            int(best["quantity_sold"] or 0) if best else 0
        ),
        "predicted_next_sale": prediction["tomorrow"],
        "chart": [
            {
                "date": row["sale_day"],
                "total": float(row["total"] or 0)
            }
            for row in chart_rows
        ]
    })


# =========================================================
# PREDICTION / BUSINESS INTELLIGENCE
# =========================================================

@app.route("/prediction_summary")
def prediction_summary():
    auth = require_login()
    if auth:
        return auth

    prediction = calculate_prediction(current_user_id())

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT COUNT(*) AS total_products
            FROM products
            WHERE user_id = %s
        """, (current_user_id(),))
        total_products = int(
            cursor.fetchone()["total_products"] or 0
        )

        inventory = get_inventory_stats(current_user_id())
        low_stock = int(inventory["low_stock"] or 0)

    finally:
        cursor.close()
        conn.close()

    recommendations = []

    if low_stock > 0:
        recommendations.append(
            "Restock low inventory products."
        )

    if prediction["tomorrow"] > 0:
        if prediction["growth"] > 0:
            recommendations.append(
                "Expected sales are increasing."
            )
        elif prediction["growth"] < 0:
            recommendations.append(
                "Sales are trending downward; review your best-performing products."
            )
        else:
            recommendations.append(
                "Sales are currently stable."
            )

    if prediction["best_seller"]:
        recommendations.append(
            f"Focus on '{prediction['best_seller']}' as your best-selling product."
        )

    if not recommendations:
        recommendations.append(
            "Business performance looks healthy."
        )

    total_products = max(total_products, 0)
    health = (
        round(((total_products - low_stock) / total_products) * 100)
        if total_products > 0
        else 100
    )

    return jsonify({
        **prediction,
        "inventory_health": health,
        "recommendations": recommendations
    })


@app.route("/prediction_dashboard")
def prediction_dashboard():
    auth = require_login()
    if auth:
        return auth

    inventory = get_inventory_stats(current_user_id())
    prediction = calculate_prediction(current_user_id())

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT COUNT(*) AS unsold_week
            FROM products p
            WHERE p.user_id = %s
              AND (
                    p.last_sale IS NULL
                    OR p.last_sale < %s
              )
        """, (
            current_user_id(),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))
        unsold_week = int(cursor.fetchone()["unsold_week"] or 0)

        cursor.execute("""
            SELECT COUNT(*) AS unsold_month
            FROM products p
            WHERE p.user_id = %s
              AND (
                    p.last_sale IS NULL
                    OR p.last_sale < %s
              )
        """, (
            current_user_id(),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))
        unsold_month = int(cursor.fetchone()["unsold_month"] or 0)
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "low_stock": int(inventory["low_stock"] or 0),
        "out_stock": int(inventory["out_of_stock"] or 0),
        "inventory_value": float(inventory["inventory_value"] or 0),
        "unsold_week": unsold_week,
        "unsold_month": unsold_month,
        "prediction": prediction
    })


@app.route("/inventory_insights")
def inventory_insights():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                p.id,
                p.product_name,
                p.stock,
                p.price,
                COALESCE(SUM(s.quantity), 0) AS quantity_sold
            FROM products p
            LEFT JOIN sales s
                ON LOWER(s.product) = LOWER(p.product_name)
               AND s.user_id = p.user_id
            WHERE p.user_id = %s
            GROUP BY p.id, p.product_name, p.stock, p.price
            ORDER BY quantity_sold ASC, p.product_name ASC
        """, (current_user_id(),))

        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    never_sold = [
        row["product_name"]
        for row in rows
        if int(row["quantity_sold"] or 0) == 0
    ]

    fast_moving = sorted(
        rows,
        key=lambda row: int(row["quantity_sold"] or 0),
        reverse=True
    )[:5]

    slow_moving = [
        row for row in sorted(
            rows,
            key=lambda row: int(row["quantity_sold"] or 0)
        )
        if int(row["quantity_sold"] or 0) > 0
    ][:5]

    inventory = get_inventory_stats(current_user_id())
    total_products = int(inventory["total_products"] or 0)
    low_stock = int(inventory["low_stock"] or 0)
    out_of_stock = int(inventory["out_of_stock"] or 0)

    if total_products:
        health = round(
            max(
                0,
                ((total_products - low_stock - out_of_stock)
                 / total_products) * 100
            )
        )
    else:
        health = 100

    def serialize_product(row):
        return {
            "id": row["id"],
            "product_name": row["product_name"],
            "stock": int(row["stock"] or 0),
            "price": float(row["price"] or 0),
            "quantity_sold": int(row["quantity_sold"] or 0)
        }

    return jsonify({
        "never_sold": never_sold,
        "fast_moving": [serialize_product(row) for row in fast_moving],
        "slow_moving": [serialize_product(row) for row in slow_moving],
        "inventory_health_score": health,
        "total_products": total_products,
        "low_stock": low_stock,
        "out_of_stock": out_of_stock
    })


@app.route("/prediction_products")
def prediction_products():
    auth = require_login()
    if auth:
        return auth

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                p.id,
                p.product_name,
                p.stock,
                p.price,
                p.last_sale,
                COALESCE(SUM(s.quantity), 0) AS quantity_sold,
                COALESCE(SUM(s.total), 0) AS revenue
            FROM products p
            LEFT JOIN sales s
                ON LOWER(s.product) = LOWER(p.product_name)
               AND s.user_id = p.user_id
            WHERE p.user_id = %s
            GROUP BY
                p.id,
                p.product_name,
                p.stock,
                p.price,
                p.last_sale
            ORDER BY p.product_name ASC
        """, (current_user_id(),))

        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    result = []

    for row in rows:
        stock = int(row["stock"] or 0)
        quantity_sold = int(row["quantity_sold"] or 0)

        if stock <= 0:
            status = "out_of_stock"
        elif stock <= 5:
            status = "low_stock"
        elif quantity_sold == 0:
            status = "never_sold"
        elif quantity_sold >= 20:
            status = "fast_moving"
        else:
            status = "normal"

        result.append({
            "id": row["id"],
            "product_name": row["product_name"],
            "stock": stock,
            "price": float(row["price"] or 0),
            "last_sale": row["last_sale"],
            "quantity_sold": quantity_sold,
            "revenue": float(row["revenue"] or 0),
            "status": status
        })

    return jsonify(result)


# =========================================================
# LOCAL DEVELOPMENT
# =========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.environ.get("FLASK_DEBUG", "0") == "1"
    )
