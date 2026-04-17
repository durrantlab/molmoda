"""
Selenium element wrapper with built-in waits, error checking, and convenience methods.
"""

import contextlib
import html
import re
import time

from selenium.common.exceptions import ElementNotInteractableException, TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait


class el:
    """
    Wraps a Selenium WebElement located by CSS selector, with:
      - Automatic polling until the element appears (up to `timeout` seconds).
      - Convenience properties for reading/writing text and values.
      - Built-in error checking against the #test-error element after each action.
      - Regex-based wait helpers.
    """

    def __init__(self, selector: str, drvr, timeout: int = 50):
        self.selector = selector
        self.timeout = timeout
        self.driver = drvr
        self.poll_frequency_secs = 2

        try:
            self.el = WebDriverWait(
                drvr, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until(lambda d: d.find_element(By.CSS_SELECTOR, selector))
        except TimeoutException:
            self.throw_error(f"{self.selector} not found after {self.timeout} seconds")

    # ------------------------------------------------------------------
    # Text / value properties
    # ------------------------------------------------------------------

    @property
    def text(self) -> str:
        txt = self.el.get_attribute("value")
        if txt in [None, ""]:
            txt = self.el.get_attribute("innerHTML")
        return txt

    @text.setter
    def text(self, value: str):
        with contextlib.suppress(Exception):
            self.el.clear()
        with contextlib.suppress(Exception):
            value = html.unescape(value)
        if value == "BACKSPACE":
            self.el.send_keys(Keys.BACKSPACE)
        else:
            self.el.send_keys(value)
        self.check_errors()

    @property
    def value(self) -> str:
        return self.text

    @value.setter
    def value(self, value: str):
        self.text = value

    # ------------------------------------------------------------------
    # Wait helpers
    # ------------------------------------------------------------------

    def wait_until_text_is_not(self, text: str = "", timeout: int | None = None):
        """Block until the element's text differs from `text`."""
        if timeout is None:
            timeout = self.timeout
        try:
            WebDriverWait(
                self.driver, timeout, poll_frequency=self.poll_frequency_secs
            ).until_not(lambda d: self.text == text)
        except TimeoutException:
            self.throw_error(
                f"{self.selector} still [[{text}]] after {timeout} seconds"
            )

    def wait_until_contains_regex(self, regex: str):
        """Block until the element's text matches `regex`."""
        try:
            regex = html.unescape(regex)
            WebDriverWait(
                self.driver, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until(lambda d: re.search(regex, self.text))
        except TimeoutException:
            self.throw_error(
                f"{self.selector} does not contain [[{regex}]] after {self.timeout} seconds; "
                f"Actual text: [[{self.text}]]"
            )

    def wait_until_does_not_contain_regex(self, regex: str):
        """Block until the element's text no longer matches `regex`."""
        try:
            regex = html.unescape(regex)
            WebDriverWait(
                self.driver, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until_not(lambda d: re.search(regex, self.text))
        except TimeoutException:
            self.throw_error(
                f"{self.selector} still contains [[{regex}]] after {self.timeout} seconds"
            )

    # ------------------------------------------------------------------
    # Interaction helpers
    # ------------------------------------------------------------------

    def click(self, shift_pressed: bool = False):
        """Click the element, optionally with Shift held."""
        try:
            if shift_pressed:
                ActionChains(self.driver).key_down(Keys.SHIFT).perform()
            self.el.click()
            if shift_pressed:
                ActionChains(self.driver).key_up(Keys.SHIFT).perform()
            self.check_errors()
        except ElementNotInteractableException:
            self.throw_error(f"{self.selector} not clickable")

    def upload_file(self, file_path: str):
        """Send a file path to a file-input element."""
        import os
        file_path = os.path.realpath(file_path)
        self.el.send_keys(file_path)
        self.check_errors()

    def check_box(self, value: bool):
        """Set a checkbox to the desired boolean state."""
        current = self.el.get_attribute("checked") == "true"
        if value != current:
            self.el.click()

    # Legacy camelCase alias kept for backward compatibility.
    def checkBox(self, value: bool):
        self.check_box(value)

    # ------------------------------------------------------------------
    # Error checking
    # ------------------------------------------------------------------

    def check_errors(self):
        """
        Wait briefly, then inspect #test-error. Raises if non-empty.
        Called automatically after every mutating action.
        """
        time.sleep(0.5)
        err = el("#test-error", self.driver)
        if err.text != "":
            self.throw_error(err.text)

    def throw_error(self, msg: str):
        """Raise an exception with the given message (appending '.' if missing)."""
        if not msg.endswith("."):
            msg += "."
        raise Exception(msg)
