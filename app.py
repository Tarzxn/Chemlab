"""Portable WSGI app. Production: python -m gunicorn app:app.

The app uses Python's standard library. Gunicorn is installed on Render.
Chemistry and learning state run in the browser, without server-disk storage.
"""
import argparse
import gzip
import hashlib
import json
import mimetypes
import os
from pathlib import Path
from socketserver import ThreadingMixIn
from urllib.parse import unquote
from wsgiref.simple_server import WSGIServer, make_server

DIST = Path(__file__).resolve().parent / "dist"
VERSION = "2.1.0"
TYPES = {".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8"}
SECURITY_HEADERS = [
    ("X-Content-Type-Options", "nosniff"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"),
]


def app(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")

    def reply(status, body=b"", headers=()):
        headers = list(headers)
        if not any(key.lower() == "content-type" for key, _ in headers):
            headers.append(("Content-Type", "text/plain; charset=utf-8"))
        start_response(status, SECURITY_HEADERS + headers + [("Content-Length", str(len(body)))])
        return [b"" if method == "HEAD" else body]

    if method not in {"GET", "HEAD"}:
        return reply("405 Method Not Allowed", b"Method not allowed", [("Allow", "GET, HEAD"), ("Content-Type", "text/plain; charset=utf-8")])
    try:
        route = unquote(environ.get("PATH_INFO", "/"), errors="strict")
        if "\x00" in route or "\\" in route or ".." in route.split("/"):
            return reply("404 Not Found", b"Not found")
        if route in {"/healthz", "/health"}:
            body = json.dumps({"status": "ok", "app": "chemlab", "version": VERSION}).encode()
            return reply("200 OK", body, [("Content-Type", "application/json"), ("Cache-Control", "no-store")])
        if route == "/api/chemicals":
            route = "/chemicals.json"
        for prefix in ("/static/css/", "/static/js/"):
            if route.startswith(prefix):
                route = "/" + route[len(prefix):]
        relative = "index.html" if route == "/" else route.lstrip("/")
        file = (DIST / relative).resolve()
        if not file.is_relative_to(DIST.resolve()) or not file.is_file():
            return reply("404 Not Found", b"Not found", [("Content-Type", "text/plain; charset=utf-8")])
        body = file.read_bytes()
        etag = 'W/"' + hashlib.sha256(body).hexdigest()[:24] + '"'
        headers = [("Content-Type", TYPES.get(file.suffix, mimetypes.guess_type(file.name)[0] or "application/octet-stream")), ("Cache-Control", "no-cache"), ("ETag", etag), ("Vary", "Accept-Encoding")]
        if environ.get("HTTP_IF_NONE_MATCH") == etag:
            start_response("304 Not Modified", SECURITY_HEADERS + [(key, value) for key, value in headers if key != "Content-Type"])
            return []
        encodings = environ.get("HTTP_ACCEPT_ENCODING", "").replace(" ", "").split(",")
        if "gzip" in encodings and len(body) > 1024:
            body = gzip.compress(body)
            headers.append(("Content-Encoding", "gzip"))
        if file.name == "Chemlab.html":
            # Download the inline-script offline edition; do not navigate to it
            # under the hosted app's stricter script-src policy.
            headers.append(("Content-Disposition", 'attachment; filename="Chemlab.html"'))
        return reply("200 OK", body, headers)
    except (ValueError, UnicodeError, OSError):
        return reply("400 Bad Request", b"Bad request", [("Content-Type", "text/plain; charset=utf-8")])


class ThreadedServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


def create_server(port=5050, host="127.0.0.1"):
    return make_server(host, port, app, server_class=ThreadedServer)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve Chemlab locally; use Gunicorn in production")
    parser.add_argument("--host", default=os.environ.get("HOST", "0.0.0.0" if os.environ.get("RENDER") else "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 5050)))
    args = parser.parse_args()
    with create_server(args.port, args.host) as server:
        print(f"Chemlab ready on {args.host}:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
