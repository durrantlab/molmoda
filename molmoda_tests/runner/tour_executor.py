"""
Single-tour execution logic.

Opens a browser to the tour URL for a given plugin, then steps through the
guided tour by repeatedly clicking visible buttons (reusing all the helpers
from ``scripts.click_next``).  Detects tour completion by watching for the
"Tour Complete!" popover.
"""

import contextlib
import os
import re
import threading
import time
from typing import Any

from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select

from ..drivers import make_driver
from ..scripts.click_next import (
    find_active_button_to_click,
    find_active_element_to_click,
    find_active_input_to_fill,
    find_target_button,
    POLL_INTERVAL,
    POST_CLICK_PAUSE,
)

# Thread-local driver registry (mirrors runner/executor.py but kept separate
# so tour drivers don't collide with test drivers).
_tour_drivers: dict[int, Any] = {}
_tour_drivers_lock = threading.Lock()

# Maximum seconds to wait for a tour to finish before declaring failure.
TOUR_TIMEOUT_SECS = 300


def _get_or_create_driver(browser: str, root_url: str) -> Any:
    """Return the WebDriver for the current thread, creating one if needed.

    Args:
        browser: Browser identifier (e.g. 'chrome', 'chrome-headless').
        root_url: The root URL being tested.

    Returns:
        A Selenium WebDriver instance.
    """
    key = threading.get_ident()
    with _tour_drivers_lock:
        if key not in _tour_drivers:
            _tour_drivers[key] = make_driver(browser, root_url)
    return _tour_drivers[key]


def quit_all_tour_drivers(browser: str) -> None:
    """Quit every tour driver in the registry and clear it.

    Args:
        browser: Browser identifier (used for Safari-specific cleanup).
    """
    with _tour_drivers_lock:
        for driver in _tour_drivers.values():
            try:
                driver.quit()
            except Exception:
                pass
            if browser == "safari":
                time.sleep(1)
                os.system("pkill -9 Safari > /dev/null 2>&1")
                time.sleep(1)
        _tour_drivers.clear()

def _popover_requires_shift_click(driver: Any) -> bool:
    """Detect whether the current driver.js popover instructs a shift-click.

    Some tour steps tell the user to "Hold Shift and click..." on the
    highlighted element.  When that phrase appears in the popover
    description, any subsequent click helper must simulate Shift being
    held down so that the application's shift-click handlers fire.

    The match is done against HTML-tag-stripped, lowercased text to tolerate
    the ``<b>Shift</b>`` markup used in the prompt as well as any
    surrounding whitespace or casing variations.

    IMPORTANT: Only the popover that is currently paired with a visible
    ``.driver-active-element`` is consulted.  A stale or unrelated popover
    elsewhere in the DOM must not cause a normal step to be shift-clicked.
    If no active element is currently highlighted, this function returns
    False regardless of popover contents.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        True if a visible popover description paired with a visible active
        element contains a "hold shift and click" instruction, otherwise
        False.
    """
    try:
        # Require a visible active element; otherwise the popover (if any)
        # is not governing a click action on this iteration.
        active_els = driver.find_elements(
            By.CSS_SELECTOR, ".driver-active-element"
        )
        has_visible_active = False
        for ae in active_els:
            try:
                if ae.is_displayed():
                    has_visible_active = True
                    break
            except Exception:
                continue
        if not has_visible_active:
            return False

        # Prefer the scoped description inside #driver-popover-content,
        # which is the popover currently rendered by driver.js.  Fall back
        # to any visible .driver-popover-description if the scoped lookup
        # finds nothing (older driver.js versions use a different wrapper).
        descriptions = driver.find_elements(
            By.CSS_SELECTOR,
            "#driver-popover-content .driver-popover-description",
        )
        if not descriptions:
            descriptions = driver.find_elements(
                By.CSS_SELECTOR, ".driver-popover-description"
            )
        for desc in descriptions:
            try:
                if not desc.is_displayed():
                    continue
                # Read innerHTML via JS so entities like &amp; and inline
                # tags like <b>Shift</b> are included; then strip tags so
                # the substring search is resilient to markup.
                inner_html = (
                    driver.execute_script(
                        "return arguments[0].innerHTML;", desc
                    ) or ""
                )
                stripped = re.sub(r"<[^>]+>", "", inner_html)
                # Collapse whitespace so "Hold\n  Shift and click" matches.
                normalized = re.sub(r"\s+", " ", stripped).strip().lower()
                if "hold shift and click" in normalized:
                    return True
            except Exception:
                continue
    except Exception:
        pass
    return False


def _click_element(
    driver: Any, elem: Any, shift_pressed: bool = False
) -> None:
    """Click an element, optionally with Shift held down.

    Consolidates the try-native-then-fall-back-to-JS click pattern used
    throughout the tour click loop, and adds Shift-modifier support for
    tour steps that instruct the user to shift-click.  When ``shift_pressed``
    is True, a Selenium ActionChains sequence is used so the application
    sees the real ``shiftKey`` flag on the click event.  The native Shift
    path is tried first; if it raises, a JS-dispatched ``MouseEvent`` with
    ``shiftKey: true`` is used as a fallback so Vue components that aren't
    cleanly interactable via Selenium still receive a shift-click.

    Args:
        driver: The Selenium WebDriver instance.
        elem: The element to click.
        shift_pressed: When True, hold Shift during the click.
    """
    if not shift_pressed:
        try:
            elem.click()
        except Exception:
            driver.execute_script("arguments[0].click();", elem)
        return

    try:
        actions = ActionChains(driver)
        actions.key_down(Keys.SHIFT).click(elem).key_up(Keys.SHIFT).perform()
    except Exception:
        # JS fallback: dispatch a MouseEvent with shiftKey=true so the
        # application's click handlers still observe the modifier.
        driver.execute_script(
            "var el = arguments[0]; "
            "var evt = new MouseEvent('click', {"
            "  bubbles: true, cancelable: true, view: window, "
            "  shiftKey: true, button: 0"
            "}); "
            "el.dispatchEvent(evt);",
            elem,
        )
        
def _is_tour_complete(driver: Any, initial_url: str | None = None) -> bool:
    """Check whether the tour has reached its conclusion step.

    Checks three locations:
      1. A driver.js popover title containing "Tour Complete!"
      2. The simple-message modal (#modal-simplemsg) containing
         "You have completed", which some tours use as a final
         confirmation dialog after driver.js has already finished.
      3. A page navigation away from ``initial_url``.  Some tours end
         by reloading the page (stripping the ``?tour=`` query string),
         which we treat as successful completion because the tour
         framework has nothing further to show.

    Args:
        driver: The Selenium WebDriver instance.
        initial_url: The URL the tour was launched at.  When provided and
            the driver's ``current_url`` no longer matches it, the tour is
            treated as complete.

    Returns:
        True if the tour completion indicator is visible.
    """
    try:
        titles = driver.find_elements(
            By.CSS_SELECTOR, ".driver-popover-title"
        )
        for title_el in titles:
            if "tour complete" in (title_el.text or "").strip().lower():
                return True
    except Exception:
        pass

    try:
        modals = driver.find_elements(By.CSS_SELECTOR, "#modal-simplemsg")
        for modal in modals:
            if "you have completed" in (modal.text or "").strip().lower():
                return True
    except Exception:
        pass

    # A URL change (e.g. page reload that drops the ?tour= query) means
    # the tour framework is no longer active; treat this as completion.
    if initial_url is not None:
        try:
            if driver.current_url != initial_url:
                return True
        except Exception:
            pass

    return False


def _find_active_span_to_click(driver: Any) -> Any:
    """Find a <span> or <div> with the driver-active-element class to click.

    Some tour steps highlight a <span> or <div> (e.g. a tree-node label,
    an icon, or a panel section) that the user is expected to click.  The
    generic active-button helper only checks <button>, [role='button'],
    and <a>, so these elements slip through.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        The element if found and visible, otherwise None.
    """
    from selenium.webdriver.common.by import By

    selectors = [
        "span.driver-active-element",
        "div.driver-active-element",
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

def _find_active_checkbox_to_click(driver: Any) -> Any:
    """Find an <input type="checkbox"> with the driver-active-element class.

    Some tour steps highlight a checkbox that the user is expected to
    toggle.  This is distinct from the text-input helper, which only
    looks for ``input[type='text']``.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        The element if found and visible, otherwise None.
    """
    from selenium.webdriver.common.by import By

    try:
        elements = driver.find_elements(
            By.CSS_SELECTOR, "input[type='checkbox'].driver-active-element"
        )
        for elem in elements:
            try:
                if elem.is_displayed():
                    return elem
            except Exception:
                continue
    except Exception:
        pass
    return None

def _find_active_select_to_set(driver: Any) -> tuple[Any, str] | tuple[None, None]:
    """Find a <select> with the driver-active-element class and the value to pick.

    When a tour step highlights a <select> dropdown, the popover contains
    a ``span.value-to-display`` whose text content is the option label the
    user should choose.  This mirrors how text inputs are handled.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        (select_element, visible_text) if found, otherwise (None, None).
    """
    try:
        selects = driver.find_elements(
            By.CSS_SELECTOR, "select.driver-active-element"
        )
        if not selects:
            return None, None

        active_select = selects[0]
        if not active_select.is_displayed():
            return None, None

        value_spans = driver.find_elements(
            By.CSS_SELECTOR, ".value-to-display"
        )
        if not value_spans:
            return None, None

        value_text = (value_spans[0].text or "").strip()
        if not value_text:
            return None, None

        return active_select, value_text
    except Exception:
        return None, None

def _find_active_textarea_to_fill(driver: Any) -> tuple[Any, str] | tuple[None, None]:
    """Find a <textarea> with the driver-active-element class and the value to type.

    When a tour step highlights a <textarea>, the popover contains a
    ``span.value-to-display`` whose text content is the value the user
    should enter.  This mirrors how text inputs and selects are handled.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        (textarea_element, value_text) if found, otherwise (None, None).
    """
    try:
        textareas = driver.find_elements(
            By.CSS_SELECTOR, "textarea.driver-active-element"
        )
        if not textareas:
            return None, None

        active_textarea = textareas[0]
        if not active_textarea.is_displayed():
            return None, None

        value_spans = driver.find_elements(
            By.CSS_SELECTOR, ".value-to-display"
        )
        if not value_spans:
            return None, None

        value_text = (value_spans[0].text or "").strip()
        if not value_text:
            return None, None

        return active_textarea, value_text
    except Exception:
        return None, None

def _find_active_number_input_to_fill(driver: Any) -> tuple[Any, str] | tuple[None, None]:
    """Find an <input type="number"> with the driver-active-element class.

    When a tour step highlights a numeric input, the popover contains a
    ``span.value-to-display`` whose text is the number the user should
    enter.  This mirrors how text inputs and textareas are handled.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        (input_element, value_text) if found, otherwise (None, None).
    """
    try:
        inputs = driver.find_elements(
            By.CSS_SELECTOR, "input[type='number'].driver-active-element"
        )
        if not inputs:
            return None, None

        active_input = inputs[0]
        if not active_input.is_displayed():
            return None, None

        value_spans = driver.find_elements(
            By.CSS_SELECTOR, ".value-to-display"
        )
        if not value_spans:
            return None, None

        value_text = (value_spans[0].text or "").strip()
        if not value_text:
            return None, None

        return active_input, value_text
    except Exception:
        return None, None


def _find_active_range_input_to_set(driver: Any) -> tuple[Any, str] | tuple[None, None]:
    """Find an <input type="range"> with the driver-active-element class.

    When a tour step highlights a range slider, the popover contains a
    ``span.value-to-display`` whose text is the value the slider should
    be set to.  Because range inputs cannot be changed via ``send_keys``,
    the caller must use JavaScript to set the value and dispatch events.

    Args:
        driver: The Selenium WebDriver instance.

    Returns:
        (input_element, value_text) if found, otherwise (None, None).
    """
    try:
        inputs = driver.find_elements(
            By.CSS_SELECTOR, "input[type='range'].driver-active-element"
        )
        if not inputs:
            return None, None

        active_input = inputs[0]
        if not active_input.is_displayed():
            return None, None

        value_spans = driver.find_elements(
            By.CSS_SELECTOR, ".value-to-display"
        )
        if not value_spans:
            return None, None

        value_text = (value_spans[0].text or "").strip()
        if not value_text:
            return None, None

        return active_input, value_text
    except Exception:
        return None, None

def _tour_click_loop(
    driver: Any,
    plugin_id: str,
    max_clicks: int = 500,
    poll_interval: float = POLL_INTERVAL,
    initial_url: str | None = None,
) -> dict[str, str]:
    """Step through a tour by clicking visible buttons until completion.

    This is a self-contained click loop that reuses all the element-finding
    helpers from ``click_next.py`` (handling "Enable & Support", "Start Tour",
    "Next", active buttons, active inputs, and "Click the..." popovers) but
    adds tour-completion and timeout detection.

    When a popover's description instructs the user to "Hold Shift and
    click" on the highlighted element, the click is performed with the
    Shift modifier held down so the application's shift-click handlers
    fire.  This only affects the click-style actions (active button,
    active span/div, and the generic active-element click); text/number/
    textarea/range/select/checkbox actions are unaffected because those
    popovers do not use the shift-click instruction.

    If nothing clickable appears for ``idle_timeout`` seconds after the page
    loads, the tour is considered absent and marked as skipped.

    Args:
        driver: The Selenium WebDriver instance.
        plugin_id: The plugin being toured (for reporting).
        max_clicks: Safety cap on total interactions.
        poll_interval: Seconds between polls when no button is visible.
        initial_url: The URL the tour was launched at; used to detect a
            page reload / navigation as an alternate completion signal.

    Returns:
        A result dict with keys: status, test, error.
    """
    clicks = 0
    start_time = time.time()
    last_action_time = start_time

    # How long to wait with zero clicks before declaring "no tour content."
    # This must be long enough for the page to load and the stat-collection
    # modal to appear (which can take 5-10 s on slow connections).
    idle_timeout = 30.0

    while clicks < max_clicks:
        # Check for tour completion before each action.
        if _is_tour_complete(driver, initial_url):
            return {"status": "passed", "test": plugin_id, "error": ""}

        # Check for overall timeout.
        elapsed = time.time() - start_time
        if elapsed > TOUR_TIMEOUT_SECS:
            return {
                "status": "failed",
                "test": plugin_id,
                "error": f"Tour timed out after {TOUR_TIMEOUT_SECS}s",
            }

        # If we have never clicked anything and idle_timeout has elapsed,
        # the plugin probably has no tour (and no stat-collection popup).
        if clicks == 0 and (time.time() - start_time) > idle_timeout:
            return {
                "status": "skipped",
                "test": plugin_id,
                "error": "No tour content found",
            }

        # Probe for a target button ("Enable & Support", "Start Tour",
        # "Next") up front.  This button ALWAYS takes top priority over
        # every other possible action (checkboxes, selects, spans, divs,
        # etc.).  If it is visible, click it immediately.
        target_label, target_btn = find_target_button(driver)
        if target_btn is not None:
            try:
                try:
                    target_btn.click()
                except Exception:
                    driver.execute_script("arguments[0].click();", target_btn)
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Clicked '{target_label.title()}' (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Click failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a driver.js popover highlighting a text input to fill.
        active_input, value_text = find_active_input_to_fill(driver)
        if active_input is not None:
            try:
                active_input.clear()
                active_input.send_keys(value_text)
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Typed '{value_text}' into active input (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Typing into active input failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted numeric input to fill.
        active_num, num_value = _find_active_number_input_to_fill(driver)
        if active_num is not None and num_value is not None:
            try:
                active_num.clear()
                active_num.send_keys(num_value)
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Typed '{num_value}' into active number input (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Typing into active number input failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted range slider to set.
        active_range, range_value = _find_active_range_input_to_set(driver)
        if active_range is not None and range_value is not None:
            try:
                driver.execute_script(
                    "var el = arguments[0]; "
                    "var nativeInputValueSetter = "
                    "  Object.getOwnPropertyDescriptor("
                    "    window.HTMLInputElement.prototype, 'value'"
                    "  ).set; "
                    "nativeInputValueSetter.call(el, arguments[1]); "
                    "el.dispatchEvent(new Event('input', {bubbles: true})); "
                    "el.dispatchEvent(new Event('change', {bubbles: true}));",
                    active_range,
                    range_value,
                )
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Set range slider to '{range_value}' (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Setting range slider failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted <textarea> to fill.
        active_textarea, textarea_value = _find_active_textarea_to_fill(driver)
        if active_textarea is not None and textarea_value is not None:
            try:
                active_textarea.clear()
                active_textarea.send_keys(textarea_value)
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Typed '{textarea_value}' into active <textarea> (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Typing into active <textarea> failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted <select> dropdown to set.
        active_select, select_value = _find_active_select_to_set(driver)
        if active_select is not None and select_value is not None:
            try:
                Select(active_select).select_by_visible_text(select_value)
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Selected '{select_value}' in active <select> (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Setting active <select> failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted checkbox to toggle.
        active_cb = _find_active_checkbox_to_click(driver)
        if active_cb is not None:
            try:
                try:
                    active_cb.click()
                except Exception:
                    driver.execute_script("arguments[0].click();", active_cb)
                clicks += 1
                last_action_time = time.time()
                print(f"  [{plugin_id}] Clicked active checkbox (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Click on active checkbox failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue
        # Determine up-front whether the current popover requests a
        # shift-click.  The same flag is consumed by each of the click-
        # style handlers below (active <button>, active <span>/<div>,
        # and the generic active element).  Input/textarea/select/range/
        # checkbox handlers above don't need this because their popovers
        # don't use the "Hold Shift and click" instruction.
        shift_pressed = _popover_requires_shift_click(driver)
        # Check for a highlighted <button> that should be clicked.
        active_btn = find_active_button_to_click(driver)
        if active_btn is not None:
            try:
                _click_element(driver, active_btn, shift_pressed=shift_pressed)
                clicks += 1
                last_action_time = time.time()
                suffix = " with Shift" if shift_pressed else ""
                print(f"  [{plugin_id}] Clicked active <button>{suffix} (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Click on active <button> failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a highlighted <span> or <div> that should be clicked.
        active_span = _find_active_span_to_click(driver)
        if active_span is not None:
            try:
                _click_element(driver, active_span, shift_pressed=shift_pressed)
                clicks += 1
                last_action_time = time.time()
                suffix = " with Shift" if shift_pressed else ""
                print(f"  [{plugin_id}] Clicked active <span>/<div>{suffix} (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Click on active <span>/<div> failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # Check for a driver.js popover instructing the user to click something.
        active_el = find_active_element_to_click(driver)
        if active_el is not None:
            try:
                _click_element(driver, active_el, shift_pressed=shift_pressed)
                clicks += 1
                last_action_time = time.time()
                suffix = " with Shift" if shift_pressed else ""
                print(f"  [{plugin_id}] Clicked active element{suffix} (#{clicks})")
                time.sleep(POST_CLICK_PAUSE)
            except Exception as e:
                print(f"  [{plugin_id}] Click on active element failed ({e}), retrying...")
                time.sleep(poll_interval)
            continue

        # No actionable element visible right now; poll and wait.
        time.sleep(poll_interval)

    return {
        "status": "failed",
        "test": plugin_id,
        "error": f"Reached max_clicks ({max_clicks}) without tour completion",
    }


def run_tour(
    plugin_id: str,
    browser: str,
    root_url: str,
) -> dict[str, str]:
    """Execute a single plugin tour.

    Opens the tour URL and steps through it using the click loop, watching
    for the "Tour Complete!" conclusion step.

    Args:
        plugin_id: The plugin identifier to tour.
        browser: Browser identifier.
        root_url: The root URL of the application.

    Returns:
        A result dict with keys: status, test, error.
    """
    driver = _get_or_create_driver(browser, root_url)

    try:
        tour_url = f"{root_url}/?tour={plugin_id}"
        driver.get(tour_url)

        # Give the page a moment to begin loading before entering the click
        # loop.  The loop itself handles waiting for the stat-collection
        # modal and the tour to start; we just need the initial DOM ready.
        time.sleep(2)
        # Capture the URL after the initial load (which may include a
        # trailing slash or hash added by the app) so that later
        # comparisons in _is_tour_complete detect genuine navigation
        # rather than cosmetic normalization.
        try:
            initial_url = driver.current_url
        except Exception:
            initial_url = tour_url
        return _tour_click_loop(driver, plugin_id, initial_url=initial_url)
    except Exception as e:
        return {
            "status": "failed",
            "test": plugin_id,
            "error": str(e),
        }
    finally:
        with contextlib.suppress(Exception):
            driver.execute_script(
                "window.localStorage.clear(); window.sessionStorage.clear();"
            )