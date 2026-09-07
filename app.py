from flask import Flask, render_template, jsonify, request
import json
import os

import reaction_engine

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "data", "chemicals.json")) as f:
    CHEMICALS = json.load(f)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chemicals")
def api_chemicals():
    return jsonify(CHEMICALS)


@app.route("/api/react", methods=["POST"])
def api_react():
    payload = request.get_json(force=True) or {}
    mixture = payload.get("mixture", [])
    heated = bool(payload.get("heated", False))
    result = reaction_engine.react(mixture, heated=heated)
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug, host="0.0.0.0", port=port)
