# 本地预览：python tools/serve.py ，然后浏览器打开 http://localhost:8000
# 和 python -m http.server 一样，只是告诉浏览器不要缓存，改完刷新就能看到
import http.server, functools

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

http.server.ThreadingHTTPServer(('', 8000), NoCache).serve_forever()
