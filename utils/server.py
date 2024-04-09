#!/usr/bin/env python3

# Based on https://gist.github.com/prideout/09af26cef84eef3e06a1e3f20a499a48

from http.server import SimpleHTTPRequestHandler
import socketserver
import sys

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.css':	'text/css',
        '.html': 'text/html',
        '.jpg': 'image/jpg',
        '.js':	'application/x-javascript',
        '.json': 'application/json',
        '.manifest': 'text/cache-manifest',
        '.png': 'image/png',
        '.wasm': 'application/wasm',
        '.xml': 'application/xml',
    }

    def end_headers(self):
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Permissions-Policy', 'shared-array-buffer=(self)')
        SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with socketserver.TCPServer(("localhost", port), Handler) as httpd:
        print(f"Navigate to http://localhost:{port}/ in your browser.")
        httpd.serve_forever()
