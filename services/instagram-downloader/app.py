# Small private service around Instaloader, called by the website's admin page.
# Lists a public profile's videos and images without logging in; the files themselves
# are downloaded by the website. Run on a server: SERVICE_KEY=... python app.py

import itertools
import json
import os
import re
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import instaloader
from instaloader.exceptions import (
    ConnectionException,
    InstaloaderException,
    LoginRequiredException,
    PrivateProfileNotFollowedException,
    ProfileNotExistsException,
    TooManyRequestsException,
)
from instaloader.instaloadercontext import RateController

SERVICE_KEY = os.environ.get("SERVICE_KEY", "")
PORT = int(os.environ.get("PORT", "8788"))
USERNAME = re.compile(r"^[a-z0-9._]{1,30}$")
MAX_LIMIT = 24
SESSION_TTL = 30 * 60

# A "Load more" click continues the same listing, so each one is kept for a while.
sessions = {}
sessions_lock = threading.Lock()


class FailFast(RateController):
    """Instaloader waits out a rate limit, for minutes if needed; a web request can't."""

    def sleep(self, secs):
        if secs > 15:
            raise TooManyRequestsException("Instagram is limiting requests from this server.")
        time.sleep(secs)


def start_session(username):
    loader = instaloader.Instaloader(quiet=True, max_connection_attempts=1, rate_controller=FailFast)
    profile = instaloader.Profile.from_username(loader.context, username)
    if profile.is_private:
        raise LoginRequiredException("This account is private.")
    session = {
        "profile": {
            "username": profile.username,
            "fullName": profile.full_name,
            "isVerified": bool(profile.is_verified),
        },
        "posts": iter(profile.get_posts()),
        "lock": threading.Lock(),
        "usedAt": time.time(),
    }
    cursor = secrets.token_urlsafe(16)
    with sessions_lock:
        now = time.time()
        for key in [k for k, s in sessions.items() if now - s["usedAt"] > SESSION_TTL]:
            del sessions[key]
        sessions[cursor] = session
    return cursor, session


def item(post, index, is_video, url, thumbnail):
    day = post.date_utc.strftime("%Y-%m-%d")
    part = f"_{index}" if index else ""
    return {
        "id": f"{post.shortcode}{part}",
        "type": "video" if is_video else "image",
        "url": url,
        "thumbnail": thumbnail,
        "caption": (post.caption or "")[:200],
        "date": post.date_utc.isoformat() + "Z",
        "permalink": f"https://www.instagram.com/p/{post.shortcode}/",
        "filename": f"{post.owner_username}_{day}_{post.shortcode}{part}.{'mp4' if is_video else 'jpg'}",
    }


def post_items(post):
    if post.typename == "GraphSidecar":
        return [
            item(post, i, node.is_video, node.video_url if node.is_video else node.display_url, node.display_url)
            for i, node in enumerate(post.get_sidecar_nodes(), start=1)
        ]
    return [item(post, 0, post.is_video, post.video_url if post.is_video else post.url, post.url)]


def list_media(username, cursor, limit):
    if cursor:
        with sessions_lock:
            session = sessions.get(cursor)
        if not session:
            return 410, {"code": "expired", "error": "This list expired. Search for the account again."}
    else:
        cursor, session = start_session(username)

    items = []
    posts_read = 0
    with session["lock"]:
        session["usedAt"] = time.time()
        try:
            for post in itertools.islice(session["posts"], limit):
                posts_read += 1
                items.extend(post_items(post))
        except InstaloaderException:
            # Keep what was read; the next click retries from here.
            if not items:
                raise
            posts_read = limit
    return 200, {
        "profile": session["profile"],
        "items": items,
        "cursor": cursor if posts_read == limit else None,
    }


def error_response(error):
    if isinstance(error, ProfileNotExistsException):
        return 404, {"code": "not_found", "error": "No Instagram account with that name."}
    if isinstance(error, (LoginRequiredException, PrivateProfileNotFollowedException)):
        return 403, {"code": "private", "error": "This account is private, so its posts can't be listed."}
    if isinstance(error, (TooManyRequestsException, ConnectionException)):
        return 429, {"code": "blocked", "error": f"Instagram refused the request from this server: {str(error)[:200]}"}
    return 502, {"code": "failed", "error": f"Instaloader failed: {str(error)[:200]}"}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/health":
            return self.send_json(200, {"ok": True, "instaloader": instaloader.__version__})
        if url.path != "/media":
            return self.send_json(404, {"error": "Not found"})
        if not secrets.compare_digest(self.headers.get("x-service-key", ""), SERVICE_KEY):
            return self.send_json(401, {"error": "Unauthorized"})

        query = parse_qs(url.query)
        username = query.get("username", [""])[0].strip().lower()
        cursor = query.get("cursor", [""])[0]
        if not USERNAME.match(username):
            return self.send_json(400, {"code": "bad_username", "error": "That doesn't look like an Instagram username."})
        try:
            limit = max(1, min(MAX_LIMIT, int(query.get("limit", ["12"])[0])))
        except ValueError:
            limit = 12
        try:
            status, body = list_media(username, cursor, limit)
        except InstaloaderException as error:
            status, body = error_response(error)
        self.send_json(status, body)

    def log_message(self, format, *args):
        # The default log would print request details on every call.
        pass


if __name__ == "__main__":
    if not SERVICE_KEY:
        raise SystemExit("Set SERVICE_KEY first.")
    print(f"Instagram downloader service on port {PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
