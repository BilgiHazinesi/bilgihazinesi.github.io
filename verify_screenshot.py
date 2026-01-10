
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url = f"file://{os.path.abspath('Sinav/index.html')}"
        page.goto(url)

        # Login as Teacher to see the dashboard
        page.fill("#login-code", "admin")
        page.click("button[type=submit]")

        # Wait for dashboard
        page.wait_for_selector("#teacher-views", state="visible")

        # Wait a bit for animations
        page.wait_for_timeout(1000)

        # Take Screenshot
        screenshot_path = "verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
