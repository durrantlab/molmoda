"""
click_next.py: Repeatedly click any visible "Next" or "Start Tour" button.

Polls the page continuously and clicks the first matching button it finds.
Useful for stepping through multi-page wizards and guided tours without a
formal test command list.

Usage:
    python scripts/click_next.py                  # prompts for URL and browser
    python scripts/click_next.py http://localhost:8080 chrome
"""

import sys
import time

from molmoda_tests.ui import select_root_url, select_browsers
from molmoda_tests.drivers import make_driver

# How often to poll when no target button is visible (seconds).
POLL_INTERVAL = 1.0

# How long to wait for the page to settle after a click (seconds).
POST_CLICK_PAUSE = 0.75

# Button labels to watch for, in priority order (case-insensitive substring match).
TARGET_LABELS = [
    "enable & support",
    "start tour",
    "next",
    "done",
]

# Labels that must only match inside a driver.js popover to avoid colliding
# with unrelated "Done" buttons elsewhere on the page.  driver.js renders the
# final step's advance button with the text "Done", so scoping the match to
# the popover footer keeps us from accidentally clicking a dialog's Done
# button in some unrelated modal.
POPOVER_SCOPED_LABELS = {"done"}

# CSS selectors tried when searching for each label.
BUTTON_SELECTORS = [
    "button",
    "a",
    "[role='button']",
]


def _is_inside_driver_popover(driver, elem) -> bool:
    """Return True if `elem` is a descendant of a driver.js popover.

    Some target labels (notably "Done") are too generic to match globally,
    since unrelated parts of the app may expose a "Done" button.  Scoping
    such labels to the driver.js popover ensures we only click the tour's
    own advance button.

    Args:
        driver: The active Selenium WebDriver (used for JS execution).
        elem: The candidate element to test.

    Returns:
        True when the element is nested inside a `.driver-popover` (or
        `.driver-popover-footer`) ancestor, otherwise False.
    """
    try:
        return bool(driver.execute_script(
            "return !!arguments[0].closest('.driver-popover');",
            elem,
        ))
    except Exception:
        return False


def find_target_button(driver):
    """
    Search the page for the first visible element whose text matches any of
    TARGET_LABELS (checked in order). Returns (label, element) or (None, None).

    Uses JavaScript to read innerHTML so that HTML entities like &amp; are
    matched correctly regardless of how Selenium exposes elem.text.

    Labels in POPOVER_SCOPED_LABELS are only considered when the candidate
    element lives inside a driver.js popover, preventing false matches on
    generic "Done" buttons elsewhere in the UI.
    """
    from selenium.webdriver.common.by import By

    for label in TARGET_LABELS:
        scoped = label in POPOVER_SCOPED_LABELS
        for selector in BUTTON_SELECTORS:
            try:
                candidates = driver.find_elements(By.CSS_SELECTOR, selector)
                for elem in candidates:
                    try:
                        if not elem.is_displayed():
                            continue
                        # Read innerHTML via JS: this gives us the raw HTML including
                        # &amp; entities, so we check both the raw and the browser-
                        # rendered text (elem.text) to cover both cases.
                        inner_html = (
                            driver.execute_script(
                                "return arguments[0].innerHTML;", elem
                            ) or ""
                        ).strip().lower()
                        rendered = (elem.text or "").strip().lower()
                        if label in inner_html or label in rendered:
                            # For generic labels like "Done", require the
                            # match to be inside a driver.js popover so we
                            # don't click an unrelated button on the page.
                            if scoped and not _is_inside_driver_popover(driver, elem):
                                continue
                            return label, elem
                    except Exception:
                        continue
            except Exception:
                continue
    return None, None


def find_active_element_to_click(driver):
    """
    If a .driver-popover-description element exists and contains "Click the",
    return the .driver-active-element so it can be clicked. Otherwise return None.
    """
    from selenium.webdriver.common.by import By

    try:
        popovers = driver.find_elements(By.CSS_SELECTOR, ".driver-popover-description")
        for popover in popovers:
            try:
                if "click the" in (popover.text or "").strip().lower():
                    active_els = driver.find_elements(By.CSS_SELECTOR, ".driver-active-element")
                    if active_els:
                        return active_els[0]
            except Exception:
                continue
    except Exception:
        pass
    return None

def find_active_input_to_fill(driver):
    """
    If a .driver-active-element is an <input type="text">, locate the value
    to type from the #driver-popover-content .value-to-display span and
    return (input_element, value_text). Otherwise return (None, None).

    This handles guided-tour steps that instruct the user to type a specific
    value into a highlighted text field.
    """
    from selenium.webdriver.common.by import By

    try:
        active_els = driver.find_elements(By.CSS_SELECTOR, "input[type='text'].driver-active-element")
        if not active_els:
            return None, None

        active_input = active_els[0]
        if not active_input.is_displayed():
            return None, None

        value_spans = driver.find_elements(
            By.CSS_SELECTOR, "#driver-popover-content .value-to-display"
        )
        if not value_spans:
            return None, None

        value_text = (value_spans[0].text or "").strip()
        if not value_text:
            return None, None

        return active_input, value_text
    except Exception:
        return None, None

def find_active_button_to_click(driver):
    """
    If a <button>, an element with role='button', or an <a> element has
    the class 'driver-active-element', return it so it can be clicked
    directly. This handles guided-tour steps that highlight a specific
    clickable element for the user to press.

    Returns:
        The element if found and visible, otherwise None.
    """
    from selenium.webdriver.common.by import By

    selectors = [
        "button.driver-active-element",
        "[role='button'].driver-active-element",
        "a.driver-active-element",
    ]
    try:
        for selector in selectors:
            elements = driver.find_elements(By.CSS_SELECTOR, selector)
            for elem in elements:
                try:
                    if elem.is_displayed():
                        return elem
                except Exception:
                    continue
    except Exception:
        pass
    return None

def click_loop(driver, max_clicks: int = 500, poll_interval: float = POLL_INTERVAL):
    """
    Repeatedly find and click target buttons until none are found or
    `max_clicks` is reached.
    """
    clicks = 0
    labels_str = " / ".join(f'"{l.title()}"' for l in TARGET_LABELS)
    print(f"Watching for {labels_str} buttons. Press Ctrl+C to stop.\n")

    while clicks < max_clicks:
        # Check for a driver.js popover highlighting a text input to fill.
        active_input, value_text = find_active_input_to_fill(driver)
        if active_input is not None:
            try:
                active_input.clear()
                active_input.send_keys(value_text)
                clicks += 1
                print(f"  Typed '{value_text}' into active text input (action #{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  Typing into active input failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted <button> that should be clicked.
        active_btn = find_active_button_to_click(driver)
        if active_btn is not None:
            try:
                try:
                    active_btn.click()
                except Exception:
                    driver.execute_script("arguments[0].click();", active_btn)
                clicks += 1
                print(f"  Clicked active <button> (click #{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  Click on active <button> failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a driver.js popover instructing the user to click something.
        active_el = find_active_element_to_click(driver)
        if active_el is not None:
            # ... existing click logic ...
            continue

        label, btn = find_target_button(driver)
        if btn is not None:
            try:
                try:
                    btn.click()
                except Exception:
                    # Fall back to a JS click for Vue components that are
                    # technically visible but not interactable via Selenium.
                    driver.execute_script("arguments[0].click();", btn)
                clicks += 1
                print(f"  Clicked '{label.title()}' (click #{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                # Button may have disappeared between find and click; just retry.
                print(f"  Click failed ({e}), retrying...")
                time.sleep(poll_interval)
        else:
            # No Next button visible right now; poll and wait.
            time.sleep(poll_interval)

    print(f"\nReached max_clicks ({max_clicks}). Stopping.")


def main():
    # Allow URL and browser to be passed as positional CLI args to skip menus.
    if len(sys.argv) >= 3:
        root_url = sys.argv[1]
        browser = sys.argv[2]
    else:
        root_url = select_root_url()
        browsers = select_browsers()
        browser = browsers[0] if browsers else "chrome"

    print(f"\nRoot URL : {root_url}")
    print(f"Browser  : {browser}\n")

    driver = make_driver(browser, root_url)
    try:
        driver.get(root_url)
        click_loop(driver)
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        input("\nPress Enter to close the browser...")
        driver.quit()


if __name__ == "__main__":
    main()
