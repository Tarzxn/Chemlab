"""HTTP/WSGI integration checks without network requests or installed packages."""
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import runpy
import sys
import unittest
from unittest.mock import patch
from wsgiref.util import setup_testing_defaults
from wsgiref.validate import validator

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import app, DIST


def request(route="/", method="GET", **extra):
    environ = {}
    setup_testing_defaults(environ)
    environ.update(PATH_INFO=route, REQUEST_METHOD=method, QUERY_STRING="", **extra)
    status = []
    headers = {}

    def start_response(code, values, exc_info=None):
        status.append(code)
        headers.update(values)

    iterator = validator(app)(environ, start_response)
    try:
        body = b"".join(iterator)
    finally:
        iterator.close()
    return status[0], headers, body


class ServerTests(unittest.TestCase):
    def test_production_entrypoint_is_wsgi_callable(self):
        self.assertTrue(callable(app))
        status, headers, body = request()
        self.assertEqual(status, "200 OK")
        self.assertIn(b'<script type="module" src="app.js">', body)
        self.assertIn("text/html", headers["Content-Type"])

    def test_healthcheck_is_ready(self):
        status, headers, body = request("/healthz")
        self.assertEqual(status, "200 OK")
        self.assertEqual(json.loads(body)["status"], "ok")
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_all_production_modules_have_javascript_mime(self):
        for file in DIST.glob("*.js"):
            with self.subTest(file=file.name):
                status, headers, body = request("/" + file.name)
                self.assertEqual(status, "200 OK")
                self.assertTrue(headers["Content-Type"].startswith("text/javascript"))
                self.assertEqual(body, file.read_bytes())

    def test_styles_and_icon_are_available(self):
        for name, mime in [("style.css", "text/css"), ("icon.svg", "image/svg+xml")]:
            status, headers, _ = request("/" + name)
            self.assertEqual(status, "200 OK")
            self.assertIn(mime, headers["Content-Type"])

    def test_original_catalogue_route_is_available(self):
        status, _, body = request("/api/chemicals")
        self.assertEqual(status, "200 OK")
        self.assertEqual(len(json.loads(body)), 122)

    def test_head_matches_get_without_body(self):
        _, get_headers, get_body = request("/style.css")
        status, head_headers, head_body = request("/style.css", "HEAD")
        self.assertEqual(status, "200 OK")
        self.assertEqual(head_body, b"")
        self.assertEqual(int(head_headers["Content-Length"]), len(get_body))

    def test_assets_revalidate_after_deploy(self):
        _, headers, _ = request("/app.js")
        status, _, body = request("/app.js", HTTP_IF_NONE_MATCH=headers["ETag"])
        self.assertEqual(status, "304 Not Modified")
        self.assertEqual(body, b"")
        self.assertEqual(headers["Cache-Control"], "no-cache")

    def test_gzip_preserves_content(self):
        _, _, original = request("/app.js")
        status, headers, compressed = request("/app.js", HTTP_ACCEPT_ENCODING="gzip")
        self.assertEqual(status, "200 OK")
        self.assertEqual(headers["Content-Encoding"], "gzip")
        self.assertEqual(gzip.decompress(compressed), original)

    def test_missing_files_and_traversal_do_not_return_html(self):
        for route in ("/missing.js", "/../app.py", "/%2e%2e/app.py", "/..\\app.py", "/"):
            if route == "/":
                continue
            status, _, _ = request(route)
            self.assertEqual(status, "404 Not Found")

    def test_non_get_methods_are_rejected(self):
        status, headers, _ = request("/", "DELETE")
        self.assertEqual(status, "405 Method Not Allowed")
        self.assertEqual(headers["Allow"], "GET, HEAD")

    def test_offline_edition_is_downloadable(self):
        status, headers, body = request("/Chemlab.html")
        self.assertEqual(status, "200 OK")
        self.assertIn("attachment", headers["Content-Disposition"])
        self.assertIn(b'<script type="module">', body)

    def test_gunicorn_uses_render_port_and_public_interface(self):
        with patch.dict(os.environ, {"PORT": "12345"}):
            config = runpy.run_path(str(ROOT / "gunicorn.conf.py"))
        self.assertEqual(config["bind"], "0.0.0.0:12345")
        self.assertEqual(config["worker_class"], "gthread")

    def test_blueprint_contains_correct_production_commands(self):
        blueprint = (ROOT / "render.yaml").read_text()
        self.assertIn("runtime: python", blueprint)
        self.assertIn("buildCommand: pip install -r requirements.txt", blueprint)
        self.assertIn("startCommand: python -m gunicorn app:app", blueprint)
        self.assertIn("healthCheckPath: /healthz", blueprint)
        self.assertNotIn("PYTHON_VERSION", blueprint)
        self.assertEqual((ROOT / ".python-version").read_text().strip(), "3.12")


if __name__ == "__main__":
    unittest.main(verbosity=2)
