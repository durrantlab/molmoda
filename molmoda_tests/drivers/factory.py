"""
Browser driver creation utilities.

Supports chrome, chrome-headless, firefox, firefox-headless, and safari.
"""

import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

# DEVTOOLS flag: when True, Chrome opens DevTools automatically in non-headless mode.
DEVTOOLS = True

# Max concurrent threads per browser type.
allowed_threads: dict[str, int] = {
    "chrome": 4,
    "chrome-headless": 4,
    "firefox": 4,
    "firefox-headless": 4,
    "safari": 1,
}


def make_chrome_driver(options: webdriver.ChromeOptions, root_url: str) -> webdriver.Chrome:
    """
    Build a Chrome WebDriver from the given options, with optional DevTools
    and CDP Network setup for localhost targets.
    """
    if DEVTOOLS:
        options.add_argument("--auto-open-devtools-for-tabs")

    service = Service(executable_path="utils/chromedriver_wrapper.sh")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    driver = webdriver.Chrome(service=service, options=options)

    if "localhost" in root_url or "127.0.0.1" in root_url:
        driver.execute_cdp_cmd("Network.enable", {})

    return driver


def make_driver(
    browser: str,
    root_url: str,
    device_scale_factor: float | None = None,
) -> webdriver.Remote:
    """
    Create and return a WebDriver for the specified browser string.

    Args:
        browser:  One of 'chrome', 'chrome-headless', 'firefox',
                  'firefox-headless', 'safari'.
        root_url: The root URL being tested (used for CDP setup on Chrome).
        device_scale_factor: Optional Chrome device-pixel ratio override.
            When set (e.g. 2.0), Chrome renders and screenshots at that
            DPR, producing higher-resolution images.  Chrome-only; ignored
            for Firefox and Safari because their driver options don't
            expose an equivalent knob.  Defaults to None (use Chrome's
            default DPR, normally 1.0 in headless).

    Returns:
        A configured WebDriver instance.
    """
    if browser == "firefox":
        options = webdriver.FirefoxOptions()
        driver = webdriver.Firefox(options=options)
        driver.maximize_window()

    elif browser == "firefox-headless":
        input(
            "Could get an error here (untested). Involving e.php. If so, it's because "
            "firefox-headless doesn't send the Origin header with 'localhost' in it..."
        )
        options = webdriver.FirefoxOptions()
        options.add_argument("-headless")
        options.add_argument("--width=1920")
        options.add_argument("--height=1080")
        driver = webdriver.Firefox(options=options)

    elif browser == "safari":
        driver = webdriver.Safari()
        driver.maximize_window()
        os.system("""osascript -e 'tell application "Safari" to activate'""")

    elif browser == "chrome":
        options = webdriver.ChromeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--window-size=1920,1080")
        if device_scale_factor is not None:
            options.add_argument(
                f"--force-device-scale-factor={device_scale_factor}"
            )
        driver = make_chrome_driver(options, root_url)

    elif browser == "chrome-headless":
        options = webdriver.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--start-maximized")
        options.add_argument("--window-size=1920,1080")
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        if device_scale_factor is not None:
            options.add_argument(
                f"--force-device-scale-factor={device_scale_factor}"
            )
        driver = make_chrome_driver(options, root_url)

    else:
        raise ValueError(f"Unknown browser: {browser!r}")

    return driver
