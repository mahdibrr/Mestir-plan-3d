from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_scene(page: Page):
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type} {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    # Navigate to the 3D scene page
    page.goto("http://localhost:5173/scene-3d.html", wait_until="networkidle")

    # Wait for the scene to initialize
    time.sleep(5)

    # Take a screenshot
    page.screenshot(path="final_importmap_check.png", full_page=True)
    print("Screenshot saved to final_importmap_check.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        try:
            verify_scene(page)
        finally:
            browser.close()
