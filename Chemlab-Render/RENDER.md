# Deploy Chemlab Studio on Render

This package is prepared for a **Python Web Service**, matching the original Chemlab deployment. The production entry point is `app:app`. Chemistry runs in the browser. The RevisionCore-style login uses **separate Chemlab accounts**, persisted to a GitHub Gist so accounts and sessions survive Render redeploys without a persistent disk.

## Replace an existing Chemlab service

1. Extract the ZIP. Upload **the contents of `Chemlab-Render/`** to your Git repository's root, replacing the previous app files. `app.py`, `requirements.txt`, `gunicorn.conf.py`, `render.yaml` and the `dist/` folder must be together at that root.
2. In your existing Render service, set:

| Setting | Value |
| --- | --- |
| Runtime | Python 3 |
| Root Directory | Leave blank when these files are at the repository root |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `python -m gunicorn app:app` |
| Health Check Path | `/healthz` |

3. The checked-in `.python-version` requests Python 3.12. If you previously set `PYTHON_VERSION` in Render's Environment page, remove that override to use the file. Render requires a fully qualified version in that environment variable; partial versions are supported in `.python-version`.
4. Configure account storage using the instructions below, then deploy the latest commit. Check that the logs show Gunicorn listening on `0.0.0.0` and the port supplied by Render. Visit your service URL and `/healthz`; create a Chemlab account, sign out, sign back in and refresh to check session restoration.

Your original command with an explicit `--bind 0.0.0.0:$PORT` also works. Gunicorn automatically reads `gunicorn.conf.py`, so the shorter start command above is sufficient. There is no Node build step for this Python deployment; the static app and offline edition are already built.

## Create a new service

Push the package contents to a Git repository and use **New → Blueprint** in Render, choosing that repository. The included `render.yaml` specifies the Python runtime, build command, start command and health check. It requests a free plan; review the service settings before creating it.

For a monorepo, set the Root Directory to the subfolder containing `app.py` and `dist/`.

## Set up separate Chemlab accounts

1. Create a **secret GitHub Gist** for Chemlab, with a file named `chemlab_users.json` containing `{}`. Use a dedicated Gist to keep it separate from RevisionCore.
2. Create a GitHub token with permission to read and update that Gist. A classic personal access token needs the `gist` scope. Put the token in Render's Environment settings, never in source files or the frontend.
3. Set these environment variables in Render. Blueprint creation prompts for the first two values.

| Variable | Value |
| --- | --- |
| `GITHUB_TOKEN` | Your server-side GitHub token |
| `GITHUB_GIST_ID` | The Chemlab Gist ID, without its URL or username |
| `CHEMLAB_GIST_FILENAME` | `chemlab_users.json` (default) |
| `CHEMLAB_SESSION_DAYS` | `30` (default; accepted range 1–90) |

Chemlab deliberately ignores RevisionCore's `GITHUB_GIST_FILENAME` setting. It uses the cookie `chemlab_session` and its own file; existing RevisionCore credentials do not sign in here. Users create new Chemlab accounts. No real RevisionCore account data is included in this package.

Keep the provided **one Gunicorn worker / one service instance** settings. Account read/write operations are protected within that process; a shared Gist is unsuitable for concurrent writes from multiple workers or instances. This matches a small personal/classroom deployment. Scaling beyond that requires a transactional account database. GitHub API limits and availability apply; configured Gist failures show an error rather than silently creating disposable local accounts.

Accounts and sessions persist on the server. **Experiments, notes and learning progress remain in each browser**, stored separately for each signed-in username. Use workspace export/import to move them to another device. Login does not provide cloud experiment sync.

## What was repaired

- `app.py` now exports the actual WSGI callable Gunicorn imports as `app:app`.
- Production binds to `0.0.0.0:$PORT` instead of a loopback address.
- Gunicorn is included as a pinned Linux deployment requirement.
- `/healthz` returns a JSON readiness response.
- JavaScript modules have the correct MIME type on Linux and Windows.
- CSS and JavaScript use ETags and revalidation to avoid stale assets after deployment.
- Responses support gzip; missing assets return real 404s rather than the application shell.
- The catalogue route `/api/chemicals` remains available. The old `/api/react` API is not part of the rebuild; the current frontend uses its local JavaScript engine.
- Sign-up/sign-in use salted scrypt password hashes, hashed revocable session tokens and HttpOnly cookies. Render cookies also have Secure and SameSite=Lax flags.
- User notes and progress remain in browser storage, separated by username; an app redeploy does not delete them. Export a workspace to move across different site origins or devices.

## Check locally

```sh
python app.py
```

Open `http://127.0.0.1:5050`. The local Python server needs no installed packages. Without Gist settings, local development accounts are saved in ignored `data/chemlab_users.json`; keep that file to preserve them. This file is never served by the static server. You can set `CHEMLAB_USERS_FILE` to change its local path. Render refuses local account storage by default because its disk is ephemeral. The optional `CHEMLAB_ALLOW_LOCAL_AUTH=1` is for disposable test deployments only.

On Linux, the production command can also be run after `pip install -r requirements.txt`. `dist/Chemlab.html` still opens directly as an offline guest lab; it cannot sign in without the server.

```sh
python -m unittest discover -s tests -p "test_*.py" -v
npm test
```

The 79 checks include the real WSGI entry point and account lifecycle, with temporary local storage and mocked Gist responses. They make no network requests. Gunicorn is a Unix server and was not launched on this Windows host. A deployment inside a Render account and live Gist persistence have not been tested from this session. Real-browser visual QA remains unverified because browser-preview access was previously declined; no workaround was attempted.

References: [Render web services](https://render.com/docs/web-services), [Blueprint specification](https://render.com/docs/blueprint-spec), [Python version selection](https://render.com/docs/python-version), [Gunicorn package](https://pypi.org/project/gunicorn/), [GitHub Gists API](https://docs.github.com/en/rest/gists/gists).
