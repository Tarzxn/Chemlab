import io
import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from wsgiref.util import setup_testing_defaults
from wsgiref.validate import validator

import app as server
from auth import AccountStore, AuthError, check_password, hash_password


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.scratch = Path(__file__).resolve().parent.parent / ".test-tmp"
        self.scratch.mkdir(exist_ok=True)
        self.directory = tempfile.TemporaryDirectory(dir=self.scratch)
        self.file = Path(self.directory.name) / "users.json"
        self.env = {"CHEMLAB_USERS_FILE": str(self.file)}
        self.store = AccountStore(self.env)

    def tearDown(self):
        Path(self.directory.name).resolve().relative_to(self.scratch.resolve())
        self.directory.cleanup()

    def request(self, route, body=None, cookie="", method=None, **extra):
        environ = {}
        setup_testing_defaults(environ)
        payload = json.dumps(body).encode() if body is not None else b""
        environ.update(PATH_INFO=route, REQUEST_METHOD=method or ("POST" if body is not None else "GET"), QUERY_STRING="", HTTP_COOKIE=cookie, CONTENT_TYPE="application/json", CONTENT_LENGTH=str(len(payload)))
        environ.update(extra)
        environ["wsgi.input"] = io.BytesIO(payload)
        capture = {}

        def start(status, headers, exc_info=None):
            capture.update(status=int(status.split()[0]), headers=dict(headers))

        with patch.object(server, "ACCOUNTS", self.store):
            iterator = validator(server.app)(environ, start)
            try:
                raw = b"".join(iterator)
            finally:
                iterator.close()
        return capture["status"], json.loads(raw), capture["headers"]

    def signup(self, username="ChemLearner", password="lab-password-123"):
        return self.request("/api/signup", {"username": username, "password": password})

    def test_signup_hashes_password_and_sets_httponly_cookie(self):
        status, data, headers = self.signup()
        self.assertEqual(status, 200)
        self.assertEqual(data["user"]["username"], "ChemLearner")
        self.assertIn("HttpOnly", headers["Set-Cookie"])
        self.assertIn("SameSite=Lax", headers["Set-Cookie"])
        self.assertNotIn("token", data)
        record = json.loads(self.file.read_text())["chemlearner"]
        self.assertTrue(record["password_hash"].startswith("scrypt:32768:8:1$"))
        self.assertNotIn("lab-password-123", self.file.read_text())

    def test_login_uses_case_insensitive_username(self):
        self.signup()
        status, data, _ = self.request("/api/login", {"username": "CHEMLEARNER", "password": "lab-password-123"})
        self.assertEqual(status, 200)
        self.assertEqual(data["user"]["username"], "ChemLearner")

    def test_wrong_password_and_unknown_user_are_rejected(self):
        self.signup()
        for username in ("ChemLearner", "UnknownUser"):
            status, data, _ = self.request("/api/login", {"username": username, "password": "wrong-password"})
            self.assertEqual(status, 401)
            self.assertEqual(data["error"], "Incorrect username or password.")

    def test_duplicate_username_is_rejected(self):
        self.signup()
        self.assertEqual(self.signup("chemlearner")[0], 409)

    def test_username_and_password_rules(self):
        for name, password in [("a", "12345678"), ("bad user", "12345678"), ("learner", "short")]:
            self.assertEqual(self.signup(name, password)[0], 400)

    def test_session_survives_a_server_restart(self):
        _, _, headers = self.signup()
        cookie = headers["Set-Cookie"].split(";")[0]
        self.store = AccountStore(self.env)
        status, data, _ = self.request("/api/me", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertEqual(data["user"]["username"], "ChemLearner")
        self.assertNotIn(cookie.split("=", 1)[1], self.file.read_text())

    def test_logout_revokes_session_and_deletes_cookie(self):
        _, _, headers = self.signup()
        cookie = headers["Set-Cookie"].split(";")[0]
        status, _, headers = self.request("/api/logout", {}, cookie)
        self.assertEqual(status, 200)
        self.assertIn("Max-Age=0", headers["Set-Cookie"])
        self.assertEqual(self.request("/api/me", cookie=cookie)[0], 401)

    def test_expired_and_tampered_sessions_are_rejected(self):
        _, _, headers = self.signup()
        cookie = headers["Set-Cookie"].split(";")[0]
        users = json.loads(self.file.read_text())
        users["chemlearner"]["sessions"][0]["expires_at"] = time.time() - 1
        self.file.write_text(json.dumps(users))
        self.assertEqual(self.request("/api/me", cookie=cookie)[0], 401)
        self.assertEqual(self.request("/api/me", cookie=cookie + "tampered")[0], 401)

    def test_render_cookie_is_secure(self):
        self.store.render = True
        self.store.allow_local = True
        self.assertIn("Secure", self.signup()[2]["Set-Cookie"])

    def test_cross_origin_requests_are_rejected(self):
        status, _, _ = self.request("/api/signup", {"username": "learner", "password": "password-123"}, HTTP_ORIGIN="https://another.example")
        self.assertEqual(status, 403)
        self.assertFalse(self.file.exists())

    def test_non_json_and_large_requests_are_rejected(self):
        self.assertEqual(self.request("/api/login", {}, CONTENT_TYPE="text/plain")[0], 415)
        self.assertEqual(self.request("/api/login", {"password": "x" * 17000})[0], 413)

    def test_throttle_limits_repeated_attempts(self):
        self.store.attempts["user:learner"] = [time.time()] * 20
        status, _, _ = self.request("/api/login", {"username": "learner", "password": "wrong-password"})
        self.assertEqual(status, 429)

    def test_configured_gist_failure_never_falls_back_to_local(self):
        self.store.token, self.store.gist = "unit-test-token", "abcdef123456"
        with patch.object(self.store, "_github", side_effect=AuthError("Unavailable", 503)):
            self.assertEqual(self.signup()[0], 503)
        self.assertFalse(self.file.exists())

    def test_accounts_use_the_chemlab_gist_filename(self):
        store = AccountStore({**self.env, "GITHUB_GIST_FILENAME": "rian_ai_gen2_users.json"})
        self.assertEqual(store.filename, "chemlab_users.json")

    def test_render_requires_durable_account_configuration(self):
        self.store.render = True
        status, data, _ = self.signup()
        self.assertEqual(status, 503)
        self.assertIn("GITHUB_TOKEN", data["error"])

    def test_gist_preserves_unrelated_files_in_update_payload(self):
        self.store.token, self.store.gist = "unit-test-token", "abcdef123456"
        calls = []

        def github(method, payload=None):
            calls.append((method, payload))
            return {"files": {}} if method == "GET" else {}

        with patch.object(self.store, "_github", side_effect=github):
            self.assertEqual(self.signup()[0], 200)
        updated = calls[-1][1]["files"]
        self.assertEqual(set(updated), {"chemlab_users.json"})

    def test_password_hashes_are_salted(self):
        a, b = hash_password("same-password"), hash_password("same-password")
        self.assertNotEqual(a, b)
        self.assertTrue(check_password(a, "same-password"))
        self.assertFalse(check_password(a, "different-password"))


if __name__ == "__main__":
    unittest.main()
