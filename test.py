from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, ElementNotInteractableException
from selenium.webdriver.support import expected_conditions as EC
import json
import time
import re
import glob

# import LogEntries, LogType, Level
# from selenium.webdriver.logging import LogEntries
# from selenium.webdriver.logging import LogType


driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()))

# Get ID's of all plugins
plugin_ids = []
for ts_file in glob.glob("./src/**/*Plugin.vue", recursive=True):
    with open(ts_file, "r") as f:
        content = f.read()
        plugin_id = re.search(r'[^:]\bpluginId *?= *?"(.+)"', content, re.MULTILINE)[1]
        plugin_ids.append(plugin_id)

plugin_ids.sort()

plugin_ids.remove("simplemsg")
# plugin_ids.remove("about")  # Because cancel button. TODO: Good to account for this.

for plugin_id in plugin_ids:

    # driver.get("https://www.selenium.dev/selenium/web/web-form.html")
    # driver.get("http://localhost:8080/?test=loadpdb")
    driver.get("http://localhost:8080/?test=" + plugin_id)

    class el:
        def __init__(self, selector, timeout=10):
            self.selector = selector
            self.timeout = timeout
            try:
                self.el = WebDriverWait(driver, self.timeout).until(
                    lambda driver: driver.find_element(By.CSS_SELECTOR, selector)
                )
            except TimeoutException as e:
                self.throw_error(
                    f"{self.selector} not found after {self.timeout} seconds"
                )

        @property
        def text(self):
            txt = self.el.get_attribute("value")
            if txt is None:
                txt = self.el.get_attribute("innerHTML")

            return txt

        @text.setter
        def text(self, value):
            self.el.send_keys(value)
            self.check_errors()

        @property
        def value(self):
            # Alias
            return self.text

        @value.setter
        def value(self, value):
            # Alias
            self.text = value

        def wait_until_text_is_not(self, text="", timeout=None):
            if timeout is None:
                timeout = self.timeout

            # Good for waiting for AJAX or text changes
            try:
                WebDriverWait(driver, self.timeout).until_not(
                    lambda driver: self.text == text
                )
            except TimeoutException as e:
                self.throw_error(
                    f"{self.selector} still [[{text}]] after {self.timeout} seconds"
                )

        def click(self):
            try:
                self.el.click()
                self.check_errors()
            except ElementNotInteractableException as e:
                print(e)
                self.throw_error(f"{self.selector} not clickable")

        def wait_until_contains_regex(self, regex):
            self.el = WebDriverWait(driver, self.timeout).until(
                lambda driver: re.search(regex, self.el.get_attribute("innerHTML"))
            )

        def check_errors(self):
            # Run after every action
            # Wait 0.5 seconds
            time.sleep(0.5)

            # Check for errors
            err = el("#test-error")
            if err.text != "":
                self.throw_error(err.text)

        def throw_error(self, msg):
            # Run after every action

            if not msg.endswith("."):
                msg += "."

            # Run alert in browser with msg
            driver.execute_script(
                f"alert('ERROR: {msg} See terminal for more details.')"
            )

            print(msg)
            input("Press Enter to end all tests...")
            driver.quit()
            raise Exception(msg)

    cmds = json.loads(el("#test-cmds").text)
    print(cmds)
    for cmd in cmds:
        if cmd["cmd"] == "click":
            el(cmd["selector"]).click()
        elif cmd["cmd"] == "text":
            el(cmd["selector"]).text = cmd["data"]
        elif cmd["cmd"] == "wait":
            time.sleep(cmd["data"])
        elif cmd["cmd"] == "waitUntilRegex":
            el(cmd["selector"]).wait_until_contains_regex(cmd["data"])

input("Done. Press Enter to end all tests...")
driver.quit()

# entries = driver.manage().logs().get(LogType.BROWSER);
# entries.filter(Level.SEVERE);
# print(entries)

# def get_by_name(name: str, timeout=10):
#     return WebDriverWait(driver, timeout=timeout).until(
#         lambda d: d.find_element(By.NAME, name)
#     )

# el("#menu1-file").click()
# el("#menu2-import").click()
# el("#menu-plugin-protein-data-bank").click()

# inp = el("#my-text-id")
# inp.value = "Hello Worldz"

# print(inp.value)

# title = el(".display-6")
# print(title.text)

# btn = el(".btn")
# btn.click()

# driver.quit()

# import pdb

# pdb.set_trace()
