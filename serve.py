#!/usr/bin/env python3
"""
Simple HTTP server to run the game locally.
Just run: python3 serve.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file loading
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"")
        print(f"🎮 Sibling Shooting Game Server")
        print(f"================================")
        print(f"")
        print(f"✅ Server running at: http://localhost:{PORT}")
        print(f"✅ Open this in your browser to play!")
        print(f"")
        print(f"Controls:")
        print(f"  - WASD: Move")
        print(f"  - MOUSE: Aim")
        print(f"  - SPACE: Shoot")
        print(f"  - P: Admin Console")
        print(f"")
        print(f"Press Ctrl+C to stop the server")
        print(f"")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped. Thanks for playing!")
