"""
Single-test execution logic and JavaScript console error detection.
"""

import contextlib
import json
import os
import shutil
import threading
import time
from typing import Any

from ..elements import el
from ..drivers import make_driver
from .command_dispatch import dispatch_command
from selenium import webdriver

# Thread-local driver registry: maps thread id -> WebDriver instance.
_drivers: dict[int, Any] = {}
_drivers_lock = threading.Lock()


def do_logs_have_errors(driver, browser: str) -> str | bool:
    """
    Inspect the browser console for SEVERE/ERROR entries (Chrome only).

    Returns the joined error messages as a string, or False if none found.
    Firefox drivers lack get_log(), so always returns False for Firefox.
    """
    # geckodriver and safaridriver do not implement the (non-standard)
    # `GET /session/{id}/log` endpoint. Chrome does. Calling get_log()
    # against Safari does not fail fast: safaridriver leaves the request
    # hanging until the client-side HTTP read timeout (120s) fires, which
    # both wedges the current session (seen as "Read timed out") and
    # poisons every subsequent test reusing that session (seen as
    # "#test-cmds not found after 50 seconds"). Skip log collection for
    # Safari for the same reason it is already skipped for Firefox.
    if "firefox" in browser.lower() or "safari" in browser.lower():
        return False

    logs = driver.get_log("browser")
    logs_to_keep = [l for l in logs if l["level"] in ["SEVERE", "ERROR"]]
    logs_to_keep = [
        l for l in logs_to_keep
        if "message" in l
        and "status of 404" not in l["message"]
        and "status code 404" not in l["message"]
        and "status of 400" not in l["message"]
        and "404 (Not Found)" not in l["message"]
        and not (
            "https://www.ebi.ac.uk/" in l["message"]
            and "blocked by CORS policy" in l["message"]
        )
        and not (
            "https://www.ebi.ac.uk/" in l["message"]
            and "Failed to load resource" in l["message"]
        )
    ]

    if not logs_to_keep:
        return False
    return " ".join(l["message"] for l in logs_to_keep)


def check_errors(driver, browser: str) -> str | bool:
    """
    Check for JS console errors and raise if any critical ones are found.
    'user gesture' errors are printed but not raised.
    """
    js_errs = do_logs_have_errors(driver, browser)
    if js_errs is not False:
        if "user gesture" in js_errs:
            print(f"Ignored JavaScript error: {js_errs} (ignored, user gesture)")
        else:
            raise Exception(f"Critical JavaScript error: {js_errs}")
    return js_errs


def get_or_create_driver(browser: str, root_url: str):
    """
    Return the WebDriver for the current thread, creating it if needed.
    Thread-safe via a simple lock around the registry.
    """
    key = threading.get_ident()
    with _drivers_lock:
        if key not in _drivers:
            _drivers[key] = make_driver(browser, root_url)
    return _drivers[key]


def _quit_driver(driver: webdriver.Remote, browser: str) -> None:
    """Tear down a single driver, adding Safari's extra process cleanup.

    safaridriver can leave the Safari process alive after quit() and permits
    only one session per host, so a lingering process blocks the next session.
    Chrome and Firefox need no such handling.

    Args:
        driver: The WebDriver instance to close.
        browser: Browser key, used to trigger Safari-only cleanup.
    """
    try:
        driver.quit()
    except Exception:
        pass
    if browser == "safari":
        time.sleep(1)
        os.system("pkill -9 Safari > /dev/null 2>&1")
        time.sleep(1)
def reset_current_driver(browser: str) -> None:
    """Discard this thread's cached driver so the next test gets a fresh one.

    A reused Safari session that has crashed or left a modal open otherwise
    poisons every subsequent test in the same retry round, since the driver is
    never recreated mid-round. Dropping it after a failure confines the fault
    to the test that actually failed.

    Args:
        browser: Browser key, forwarded to the teardown helper.
    """
    key = threading.get_ident()
    with _drivers_lock:
        driver = _drivers.pop(key, None)
    if driver is not None:
        _quit_driver(driver, browser)
def quit_all_drivers(browser: str):
    
    with _drivers_lock:
        for driver in _drivers.values():
            _quit_driver(driver, browser)
        _drivers.clear()
def run_test(
    plugin_id_tuple: tuple[str, int | None],
    browser: str,
    root_url: str,
    is_single_test_run: bool = False,
) -> dict | list:
    """
    Execute a single plugin test identified by (plugin_name, plugin_idx).

    Returns either:
      - A result dict with keys: status, test, error
      - A list of (plugin_name, index) tuples when the test signals addTests
    """
    driver = get_or_create_driver(browser, root_url)
    test_failed = False

    try:
        plugin_name, plugin_idx = plugin_id_tuple
        test_lbl = (
            f"{plugin_name}"
            f"{f'.{plugin_idx}' if plugin_idx is not None else ''}"
        )

        url = f"{root_url}/?test={plugin_name}"
        if plugin_idx is not None:
            url += f"&index={plugin_idx}"
        driver.get(url)
        # Parse the command list from the page.  The TS test infrastructure
        # writes commands into the #test-cmds element (the "test" store
        # module's "cmds" var).  The old #cmds-element id no longer exists,
        # so waiting on it would silently block for the full 50s el() timeout
        # before the first command could ever be dispatched.
        cmds = None
        cmds_str = None
        for _ in range(4):
            cmds_str = el("#test-cmds", driver).text
            try:
                cmds = json.loads(cmds_str)
                break
            except Exception:
                time.sleep(0.25)

        if cmds is None:
            raise Exception(
                "No commands found. Are you sure you specified an actual plugin id?"
            )

        # Set up screenshot directory.
        screenshot_dir = f"./screenshots/{test_lbl}"
        if os.path.exists(screenshot_dir):
            shutil.rmtree(screenshot_dir)
        os.makedirs("./screenshots", exist_ok=True)
        os.makedirs(screenshot_dir, exist_ok=True)

        # Execute commands one by one.
        for cmd_idx, cmd in enumerate(cmds):
            # addTests is a meta-instruction handled here, not dispatched.
            if cmd["cmd"] == "addTests":
                return [(plugin_name, i) for i in range(cmd["data"])]
            dispatch_command(driver, cmd)
            driver.save_screenshot(f"{screenshot_dir}/{test_lbl}_{cmd_idx}.png")
            check_errors(driver, browser)

        return {"status": "passed", "test": test_lbl, "error": ""}

    except Exception as e:
        test_failed = True
        if is_single_test_run:
            print(f"\nAn error occurred during test '{plugin_id_tuple[0]}'.")
            print(f"Error details: {e}")
            input("The browser remains open for inspection. Press Enter to close it and proceed.")
        raise

    finally:
        with contextlib.suppress(Exception):
            driver.execute_script(
                "window.localStorage.clear(); window.sessionStorage.clear();"
            )
        if test_failed and browser == "safari" and not is_single_test_run:
            reset_current_driver(browser)