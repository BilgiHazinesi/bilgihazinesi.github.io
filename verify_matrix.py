
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url = f"file://{os.path.abspath('Sinav/index.html')}"
        page.goto(url)

        # 1. Login as Teacher
        page.fill("#login-code", "admin")
        page.click("button[type=submit]")
        page.wait_for_selector("#teacher-views", state="visible")

        # 2. Go to Analysis Tab
        page.click("button[data-target='teacher-analysis-tab']")

        # 3. Select Exam
        page.wait_for_function("document.getElementById('analysis-exam-select').options.length > 1")
        page.select_option("#analysis-exam-select", "MAT1")

        # 4. Wait for Matrix Render
        page.wait_for_selector("#matrix-container table", state="visible")

        # 5. Take Screenshot
        screenshot_path = "verification_matrix.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
