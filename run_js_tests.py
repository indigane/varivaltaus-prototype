import asyncio
from playwright.async_api import async_playwright
import os
import http.server
import socketserver
import threading

PORT = 8018

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def run_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

async def run_js_tests():
    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        await page.goto(f"http://localhost:{PORT}/tests.html")
        await asyncio.sleep(2)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_js_tests())
