from flask import Flask, send_from_directory
from routes.layers import layers_bp
import os

# Base directory setup
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "../frontend"))
BACKEND_STATIC_DIR = os.path.join(BASE_DIR, "static")

# Configure Flask
app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    template_folder=FRONTEND_DIR
)

# Register blueprint
app.register_blueprint(layers_bp)

# Serve index.html
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

# Rock Identifier page
@app.route("/rock_identifier")
def rock_identifier():
    return send_from_directory(FRONTEND_DIR, "rock_identifier.html")

# Serve frontend static files (CSS, JS)
@app.route("/<path:path>")
def serve_frontend(path):
    return send_from_directory(FRONTEND_DIR, path)

# ✅ Serve backend static files (e.g., images)
@app.route("/static/<path:filename>")
def backend_static(filename):
    try:
        return send_from_directory(BACKEND_STATIC_DIR, filename)
    except Exception as e:
        print(f"Error serving static file: {e}")
        return "Static file not found", 404

if __name__ == "__main__":
    app.run(debug=True)
