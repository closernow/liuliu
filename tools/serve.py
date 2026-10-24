# 本地预览：python tools/serve.py ，然后浏览器打开 http://localhost:8000
# 和 python -m http.server 一样，只是告诉浏览器不要缓存，改完刷新就能看到
import http.server, functools, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000   # 8000 被占了可以换一个：python tools/serve.py 8001
http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
