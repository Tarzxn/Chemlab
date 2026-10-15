# Deploy Chemlab Studio on Render

This package is prepared for a **Python Web Service**, matching the original Chemlab deployment. The production entry point is `app:app`. Chemistry runs in the browser, so the server needs no database, API keys or persistent disk.

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
4. Deploy the latest commit. Check that the logs show Gunicorn listening on `0.0.0.0` and the port supplied by Render. Visit your service URL and `/healthz`.

Your original command with an explicit `--bind 0.0.0.0:$PORT` also works. Gunicorn automatically reads `gunicorn.conf.py`, so the shorter start command above is sufficient. There is no Node build step for this Python deployment; the static app and offline edition are already built.

## Create a new service

Push the package contents to a Git repository and use **New → Blueprint** in Render, choosing that repository. The included `render.yaml` specifies the Python runtime, build command, start command and health check. It requests a free plan; review the service settings before creating it.

For a monorepo, set the Root Directory to the subfolder containing `app.py` and `dist/`.

## What was repaired

- `app.py` now exports the actual WSGI callable Gunicorn imports as `app:app`.
- Production binds to `0.0.0.0:$PORT` instead of a loopback address.
- Gunicorn is included as a pinned Linux deployment requirement.
- `/healthz` returns a JSON readiness response.
- JavaScript modules have the correct MIME type on Linux and Windows.
- CSS and JavaScript use ETags and revalidation to avoid stale assets after deployment.
- Responses support gzip; missing assets return real 404s rather than the application shell.
- The catalogue route `/api/chemicals` remains available. The old `/api/react` API is not part of the rebuild; the current frontend uses its local JavaScript engine.
- User notes and progress remain in browser storage; an app redeploy does not delete them. Export a workspace to move across different site origins or devices.

## Check locally

```sh
python app.py
```

Open `http://127.0.0.1:5050`. The local Python server needs no installed packages. On Linux, the production command can also be run after `pip install -r requirements.txt`.

```sh
python -m unittest discover -s tests -p "test_*.py" -v
npm test
```

The Python suite invokes the real WSGI app and validates HTTP response semantics without making network requests. Gunicorn is a Unix server and was not launched on this Windows host. A deployment inside a Render account has not been performed from this session. Real-browser visual QA remains unverified because browser-preview access was previously declined; no workaround was attempted.

References: [Render web services](https://render.com/docs/web-services), [Blueprint specification](https://render.com/docs/blueprint-spec), [Python version selection](https://render.com/docs/python-version), [Gunicorn package](https://pypi.org/project/gunicorn/).
