"""
ChemLab Desktop — launches the existing Flask app in the background and opens
it in a real native window (via pywebview) instead of a browser tab. This is
what turns the web app into a double-clickable desktop app.

Run directly:
    python desktop_app.py

Or package into a standalone executable with PyInstaller — see README.md.
"""
import threading
import time
import socket
import sys

from app import app as flask_app

HOST = "127.0.0.1"
PORT = 5050


def port_is_open(host, port, timeout=0.3):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def run_flask():
    # use_reloader=False is required — the reloader spawns a second process,
    # which breaks the "start server, then open window" flow below.
    flask_app.run(host=HOST, port=PORT, debug=False, use_reloader=False, threaded=True)


def main():
    server_thread = threading.Thread(target=run_flask, daemon=True)
    server_thread.start()

    # Wait for the server to actually be ready before opening the window,
    # instead of guessing with a fixed sleep.
    for _ in range(50):
        if port_is_open(HOST, PORT):
            break
        time.sleep(0.1)
    else:
        print("ChemLab server didn't start in time.", file=sys.stderr)
        sys.exit(1)

    try:
        import webview
    except ImportError:
        print("pywebview isn't installed. Run: pip install pywebview", file=sys.stderr)
        sys.exit(1)

    webview.create_window(
        "ChemLab — Virtual Chemistry Lab",
        f"http://{HOST}:{PORT}",
        width=1400,
        height=900,
        min_size=(900, 600),
        confirm_close=False,
    )
    webview.start()


if __name__ == "__main__":
    main()
