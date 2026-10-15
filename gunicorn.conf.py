"""Render production settings; Gunicorn discovers this file automatically."""
import os

bind = "0.0.0.0:" + os.environ.get("PORT", "10000")
workers = 1
worker_class = "gthread"
threads = 4
timeout = 60
graceful_timeout = 30
accesslog = "-"
errorlog = "-"
capture_output = True
