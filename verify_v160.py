from playwright.sync_api import sync_playwright
import time
import os

def verify_scene():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Start a simple http server if not already running, but since I have the vite dev server?
        # Let's try to just open the file if it's static, or use the dev server if it's running.
        # Earlier trace said dev_server.log exists.

        url = "http://localhost:5173/scene-3d.html"
        print(f"Navigating to {url}")

        try:
            page.goto(url, wait_until="networkidle")
            time.sleep(5) # Wait for shaders to compile and HDR to load

            # Check for console errors
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            # Take screenshot
            screenshot_path = "verification_v160.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")

            # Check if canvas exists
            canvas = page.locator("canvas")
            if canvas.count() > 0:
                print("Canvas found!")
            else:
                print("Canvas NOT found!")

            if errors:
                print("Found console errors:")
                for err in errors:
                    print(f" - {err}")
            else:
                print("No console errors found.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_scene()
