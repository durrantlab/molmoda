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


# Thread-local driver registry: maps thread id -> WebDriver instance.
_drivers: dict[int, Any] = {}
_drivers_lock = threading.Lock()


def do_logs_have_errors(driver, browser: str) -> str | bool:
    """
    Inspect the browser console for SEVERE/ERROR entries (Chrome only).

    Returns the joined error messages as a string, or False if none found.
    Firefox drivers lack get_log(), so always returns False for Firefox.
    """
    if "firefox" in browser.lower():
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


def quit_all_drivers(browser: str):
    """Quit every driver in the registry and clear it."""
    with _drivers_lock:
        for driver in _drivers.values():
            try:
                driver.quit()
            except Exception:
                pass
            if browser == "safari":
                time.sleep(1)
                os.system("pkill -9 Safari > /dev/null 2>&1")
                time.sleep(1)
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

    try:
        plugin_name, plugin_idx = plugin_id_tuple
        test_lbl = (
            f"{plugin_name}"
            f"{f' #{plugin_idx + 1}' if plugin_idx is not None else ''}"
        )

        url = f"{root_url}/?test={plugin_name}"
        if plugin_idx is not None:
            url += f"&index={plugin_idx}"
        driver.get(url)

        # Parse the command list from the page.
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
            if cmd["cmd"] == "click":
                el(cmd["selector"], driver).click(cmd.get("data", False))
            elif cmd["cmd"] == "text":
                el(cmd["selector"], driver).text = cmd["data"]
            elif cmd["cmd"] == "wait":
                time.sleep(cmd["data"])
            elif cmd["cmd"] == "waitUntilRegex":
                el(cmd["selector"], driver).wait_until_contains_regex(cmd["data"])
            elif cmd["cmd"] == "waitUntilNotRegex":
                el(cmd["selector"], driver).wait_until_does_not_contain_regex(cmd["data"])
            elif cmd["cmd"] == "upload":
                el(cmd["selector"], driver).upload_file(cmd["data"])
            elif cmd["cmd"] == "addTests":
                return [(plugin_name, i) for i in range(cmd["data"])]
            elif cmd["cmd"] == "checkBox":
                el(cmd["selector"], driver).check_box(cmd["data"])

            driver.save_screenshot(f"{screenshot_dir}/{test_lbl}_{cmd_idx}.png")
            check_errors(driver, browser)

        return {"status": "passed", "test": test_lbl, "error": ""}

    except Exception as e:
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
