"""WSGI adapter for the unchanged reaction engine from Chemlab-main.zip."""
import json
import math
from pathlib import Path
from urllib.parse import urlsplit
from original_lab import reaction_engine

ORIGINAL_CATALOGUE = Path(__file__).resolve().parent / 'original_lab' / 'data' / 'chemicals.json'


def original_request(environ):
    route = environ.get('PATH_INFO', '')
    if route not in {'/api/chemicals', '/api/react'}:
        return None
    method = environ.get('REQUEST_METHOD', 'GET')

    def result(status, data):
        return status, json.dumps(data, ensure_ascii=True).encode(), [('Content-Type', 'application/json'), ('Cache-Control', 'no-store')]

    if route == '/api/chemicals':
        if method not in {'GET', 'HEAD'}:
            return result(405, {'error': 'Method not allowed.'})
        return 200, ORIGINAL_CATALOGUE.read_bytes(), [('Content-Type', 'application/json; charset=utf-8'), ('Cache-Control', 'no-cache')]
    if method != 'POST':
        return result(405, {'error': 'Use POST for a reaction.'})
    origin = environ.get('HTTP_ORIGIN', '')
    if environ.get('HTTP_SEC_FETCH_SITE') == 'cross-site' or (origin and urlsplit(origin).netloc != environ.get('HTTP_HOST', '')):
        return result(403, {'error': 'Use the Chemlab site for reactions.'})
    if environ.get('CONTENT_TYPE', '').split(';')[0] != 'application/json':
        return result(415, {'error': 'Send a JSON request.'})
    try:
        length = int(environ.get('CONTENT_LENGTH', '0'))
        if not 0 < length <= 131072:
            return result(413, {'error': 'Invalid request size.'})
        payload = json.loads(environ['wsgi.input'].read(length))
        mixture = payload.get('mixture', [])
        if not isinstance(mixture, list) or len(mixture) > 500:
            raise ValueError()
        for item in mixture:
            if not isinstance(item, dict) or not isinstance(item.get('id'), str) or len(item['id']) > 64:
                raise ValueError()
            amount = item.get('ml', 0)
            if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not math.isfinite(amount) or not 0 <= amount <= 1e8:
                raise ValueError()
        return result(200, reaction_engine.react(mixture, heated=bool(payload.get('heated', False))))
    except (ValueError, TypeError, AttributeError, KeyError):
        return result(400, {'error': 'Invalid reaction request.'})
