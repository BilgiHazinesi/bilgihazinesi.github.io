import os
from playwright.sync_api import sync_playwright

def verify_fen_rubric():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Construct absolute path to the file
        file_path = os.path.abspath("OLCME/29AralikFen.html")
        page.goto(f"file://{file_path}")

        # 1. Verify Login Screen
        print("Verifying Login Screen...")
        page.wait_for_selector("#login-screen")
        page.screenshot(path="verification/1_login_screen.png")

        # 2. Simulate Class Selection
        print("Simulating Class Selection...")
        # Mock the fetch response since we can't actually hit Google Script reliably in sandbox without internet or valid CORS sometimes
        # However, the script uses fetch. We can intercept it.

        page.route("**/*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"status":"success", "students":["Ahmet Yılmaz", "Ayşe Demir"], "scores":{}}'
        ) if "script.google.com" in route.request.url else route.continue_())

        page.click("button:has-text('A Sınıfı')")

        # 3. Verify App Content Loads
        print("Verifying App Content...")
        page.wait_for_selector("#app-content")

        # Check Sticky Header elements
        assert page.is_visible("#searchInput")
        assert page.is_visible("#activeClassDisplay")

        # 4. Search and Select Student
        print("Selecting Student...")
        page.fill("#searchInput", "Ahmet")
        page.wait_for_selector("#searchResults")
        page.click("li:has-text('Ahmet Yılmaz')")

        # 5. Verify Rubric Questions Load
        print("Verifying Rubric...")
        page.wait_for_selector("#questionsContainer")
        # Check for specific question titles
        assert page.is_visible("text=1a. Madenler (Bakır)")
        assert page.is_visible("text=3. Madde Özellikleri")

        # 6. Interact with a Question (Toggle)
        print("Interacting with Toggle...")
        # Toggle button for Q1
        page.click("button:has-text('Tam Puan (3)')")

        # 7. Interact with a Counter
        print("Interacting with Counter...")
        # Find Q8 (Madde Özellikleri) - Counter type
        # It has +/- buttons. Let's click +
        # We need a robust selector. Q8 is the 8th item roughly.
        # Let's find the card with text "3. Madde Özellikleri"
        q8_card = page.locator("div", has_text="3. Madde Özellikleri").first
        q8_plus_btn = q8_card.locator(".counter-btn").nth(1) # Second button is +
        q8_plus_btn.click()

        page.screenshot(path="verification/2_main_interface.png")
        print("Verification Complete. Screenshots saved.")

        browser.close()

if __name__ == "__main__":
    verify_fen_rubric()
