"""RevisionCore-style authentication with an independent Chemlab account store.

No account files, tokens or credentials are copied from RevisionCore. The store
schema and password format follow its username/password + hashed-session design.
"""
import copy
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

USERNAME = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")
COOKIE = "chemlab_session"
PASSWORD_METHOD = "scrypt:32768:8:1"


class AuthError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def hash_password(password):
    salt = secrets.token_hex(8)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=32768, r=8, p=1, dklen=64, maxmem=128 * 1024 * 1024).hex()
    return f"{PASSWORD_METHOD}${salt}${digest}"


def check_password(stored, password):
    try:
        method, salt, expected = stored.split("$")
        if method != PASSWORD_METHOD or len(salt) > 128 or len(expected) != 128:
            return False
        actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=32768, r=8, p=1, dklen=64, maxmem=128 * 1024 * 1024).hex()
        return hmac.compare_digest(expected, actual)
    except (ValueError, TypeError, AttributeError):
        return False


class AccountStore:
    def __init__(self, environ=None):
        env = os.environ if environ is None else environ
        self.file = Path(env.get("CHEMLAB_USERS_FILE", "data/chemlab_users.json"))
        self.token = env.get("GITHUB_TOKEN", "").strip()
        self.gist = env.get("GITHUB_GIST_ID", "").strip()
        self.filename = env.get("CHEMLAB_GIST_FILENAME", "chemlab_users.json").strip() or "chemlab_users.json"
        self.render = bool(env.get("RENDER"))
        self.allow_local = env.get("CHEMLAB_ALLOW_LOCAL_AUTH") == "1"
        self.lock = threading.RLock()
        self.ttl = max(1, min(90, int(env.get("CHEMLAB_SESSION_DAYS", "30")))) * 86400
        self.attempts = {}
        self.dummy = hash_password(secrets.token_urlsafe(32))

    @property
    def remote(self):
        return bool(self.token and self.gist)

    def _github(self, method, payload=None):
        if not re.fullmatch(r"[A-Fa-f0-9]{5,64}", self.gist):
            raise AuthError("Account storage is not configured correctly.", 503)
        req = Request(f"https://api.github.com/gists/{self.gist}", method=method, data=json.dumps(payload).encode() if payload is not None else None, headers={"Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", "User-Agent": "Chemlab"})
        try:
            with urlopen(req, timeout=15) as response:
                content = response.read(2_000_001)
                if len(content) > 2_000_000:
                    raise AuthError("Account storage exceeded its supported size.", 503)
                return json.loads(content)
        except (HTTPError, URLError, TimeoutError, ValueError, OSError) as error:
            raise AuthError("Account storage is temporarily unavailable. Please try again.", 503) from error

    def load(self):
        if bool(self.token) != bool(self.gist):
            raise AuthError("Set both GITHUB_TOKEN and GITHUB_GIST_ID for account storage.", 503)
        if self.remote:
            data = self._github("GET").get("files", {}).get(self.filename)
            if not data:
                return {}
            if data.get("truncated"):
                raise AuthError("Account file is too large to load safely.", 503)
            try:
                users = json.loads(data.get("content", "{}"))
            except (ValueError, TypeError) as error:
                raise AuthError("Account storage contains invalid data.", 503) from error
        else:
            if self.render and not self.allow_local:
                raise AuthError("Configure Chemlab account storage in Render: GITHUB_TOKEN and GITHUB_GIST_ID.", 503)
            try:
                users = json.loads(self.file.read_text(encoding="utf-8")) if self.file.exists() else {}
            except (OSError, ValueError) as error:
                raise AuthError("Could not read account storage.", 503) from error
        if not isinstance(users, dict):
            raise AuthError("Account storage contains invalid data.", 503)
        return users

    def save(self, users):
        if self.remote:
            self._github("PATCH", {"files": {self.filename: {"content": json.dumps(users, separators=(",", ":"))}}})
            return
        try:
            self.file.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.file.with_suffix(".tmp")
            tmp.write_text(json.dumps(users), encoding="utf-8")
            os.replace(tmp, self.file)
        except OSError as error:
            raise AuthError("Could not save account storage.", 503) from error

    def throttle(self, environ, username):
        now = time.time()
        ip = environ.get("REMOTE_ADDR", "unknown")
        keys = [("ip:" + ip, 120), ("user:" + username.lower(), 20)]
        for key, limit in keys:
            values = [t for t in self.attempts.get(key, []) if now - t < 300]
            if len(values) >= limit:
                raise AuthError("Too many attempts. Wait a few minutes and try again.", 429)
            self.attempts[key] = values + [now]
        if len(self.attempts) > 2000:
            self.attempts = {key: val for key, val in self.attempts.items() if val and now - val[-1] < 300}

    def credentials(self, username, password, signup, environ):
        username = str(username).strip()
        if not USERNAME.fullmatch(username):
            raise AuthError("Username must be 3–32 characters: letters, numbers, dots, hyphens or underscores.")
        if not isinstance(password, str) or len(password) > 256:
            raise AuthError("Password must be no more than 256 characters.")
        if signup and len(password) < 8:
            raise AuthError("Password must be at least 8 characters.")
        with self.lock:
            self.throttle(environ, username)
            users = copy.deepcopy(self.load())
            key = username.lower()
            record = users.get(key)
            if signup:
                if record:
                    raise AuthError("That username is already taken.", 409)
                record = {"username": username, "password_hash": hash_password(password), "created_at": time.time(), "sessions": []}
                users[key] = record
            else:
                valid = check_password(record.get("password_hash", "") if isinstance(record, dict) else self.dummy, password)
                if not isinstance(record, dict) or not valid:
                    raise AuthError("Incorrect username or password.", 401)
            token = secrets.token_urlsafe(48)
            now = time.time()
            sessions = [s for s in record.get("sessions", []) if isinstance(s, dict) and isinstance(s.get("expires_at"), (int, float)) and s["expires_at"] > now]
            sessions.append({"token_hash": hashlib.sha256(token.encode()).hexdigest(), "created_at": now, "expires_at": now + self.ttl})
            record["sessions"] = sessions[-8:]
            self.save(users)
            return {"username": record["username"]}, token

    def session(self, token):
        if not token:
            return None
        digest = hashlib.sha256(token.encode()).hexdigest()
        with self.lock:
            for record in self.load().values():
                if not isinstance(record, dict):
                    continue
                for item in record.get("sessions", []):
                    if isinstance(item, dict) and hmac.compare_digest(str(item.get("token_hash", "")), digest) and float(item.get("expires_at", 0)) > time.time():
                        return {"username": record["username"]}
        return None

    def revoke(self, token):
        if not token:
            return
        digest = hashlib.sha256(token.encode()).hexdigest()
        with self.lock:
            users = self.load()
            changed = False
            for record in users.values():
                if not isinstance(record, dict):
                    continue
                sessions = record.get("sessions", [])
                filtered = [s for s in sessions if not isinstance(s, dict) or s.get("token_hash") != digest]
                if len(filtered) != len(sessions):
                    changed = True
                    record["sessions"] = filtered
            if changed:
                self.save(users)


def session_token(environ):
    try:
        cookie = SimpleCookie(environ.get("HTTP_COOKIE", ""))
        token = cookie[COOKIE].value if COOKIE in cookie else ""
        return token if len(token) <= 200 else ""
    except Exception:
        return ""


def auth_request(environ, store):
    route = environ.get("PATH_INFO", "")
    if route not in {"/api/login", "/api/signup", "/api/logout", "/api/me", "/api/auth/config"}:
        return None
    try:
        method = environ.get("REQUEST_METHOD", "GET")
        if route == "/api/auth/config" and method == "GET":
            return 200, {"separateAccounts": True, "storage": "gist" if store.remote else "local", "persistent": store.remote, "usernameMin": 3, "passwordMin": 8}, []
        if route == "/api/me" and method == "GET":
            user = store.session(session_token(environ))
            return (200, {"authenticated": True, "user": user}, []) if user else (401, {"authenticated": False}, [])
        if method != "POST" or route in {"/api/me", "/api/auth/config"}:
            raise AuthError("Method not allowed.", 405)
        origin = environ.get("HTTP_ORIGIN", "")
        if environ.get("HTTP_SEC_FETCH_SITE") == "cross-site" or (origin and (urlsplit(origin).scheme not in {"http", "https"} or urlsplit(origin).netloc != environ.get("HTTP_HOST", ""))):
            raise AuthError("This request must come from your Chemlab site.", 403)
        if environ.get("CONTENT_TYPE", "").split(";")[0] != "application/json":
            raise AuthError("Send a JSON request.", 415)
        try:
            length = int(environ.get("CONTENT_LENGTH", "0"))
            if not 0 < length <= 16384:
                raise AuthError("Invalid request size.", 413)
            data = json.loads(environ["wsgi.input"].read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, TypeError) as error:
            raise AuthError("Invalid JSON request.") from error
        secure = store.render or environ.get("wsgi.url_scheme") == "https"
        if route == "/api/logout":
            store.revoke(session_token(environ))
            cookie = f"{COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" + ("; Secure" if secure else "")
            return 200, {"ok": True}, [("Set-Cookie", cookie)]
        user, token = store.credentials(data.get("username", ""), data.get("password", ""), route == "/api/signup", environ)
        cookie = f"{COOKIE}={token}; Path=/; Max-Age={store.ttl}; HttpOnly; SameSite=Lax" + ("; Secure" if secure else "")
        return 200, {"ok": True, "user": user, "expiresIn": store.ttl}, [("Set-Cookie", cookie)]
    except AuthError as error:
        return error.status, {"error": str(error)}, []
