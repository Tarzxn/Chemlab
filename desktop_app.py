"""Optional desktop wrapper; install requirements-desktop.txt first."""
import threading
import sys
from app import create_server


def main():
    try:
        import webview
    except ImportError:
        sys.exit("Install pywebview, or simply double-click Chemlab.html instead.")
    server = create_server(port=0)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        webview.create_window("Chemlab — Your chemistry studio", f"http://127.0.0.1:{server.server_port}", width=1440, height=940, min_size=(760, 600))
        webview.start()
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=2)


if __name__ == "__main__":
    main()
