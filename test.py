import contextlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, ElementNotInteractableException
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from json.decoder import JSONDecodeError
import html
from simple_term_menu import TerminalMenu
import shutil
from webdriver_manager.chrome import ChromeDriverManager

# import traceback
import threading

import json
import time
import re
import glob
import sys
import os

# import LogEntries, LogType, Level
# from selenium.webdriver.logging import LogEntries
# from selenium.webdriver.logging import LogType

# Make a menu to select the url
urls = [
    "http://localhost:8080",
    "https://durrantlab.pitt.edu/apps/molmoda/beta/",
    "https://durrantlab.pitt.edu/molmoda/",
]

menu = TerminalMenu(urls, title="Select the root URL")
chosen_index = menu.show()
root_url = urls[chosen_index]

browsers_to_use = []
browser_choices = ["[s] standard three", "chrome", "chrome-headless", "firefox", "firefox-headless", "safari", "[d] done"]
menu = TerminalMenu(browser_choices, title="Select the browsers to use")

while True:
    print("Selected browsers: " + ", ".join(browsers_to_use))
    chosen_index2 = menu.show()
    if chosen_index2 == len(browser_choices) - 1:
        # Done
        break
    if browser_choices[chosen_index2] == "[s] standard three":
        browsers_to_use.extend(["chrome-headless", "firefox", "safari"])
    else:
        browsers_to_use.append(browser_choices[chosen_index2])
    browsers_to_use = list(set(browsers_to_use))
    browsers_to_use.sort()

print("\nUsing root URL: " + root_url)

class el:
    def __init__(self, selector, drvr, timeout=50):
        self.selector = selector
        self.timeout = timeout
        self.driver = drvr
        self.poll_frequency_secs = 2

        try:
            self.el = WebDriverWait(
                drvr, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until(lambda drvr: drvr.find_element(By.CSS_SELECTOR, selector))
        except TimeoutException as e:
            self.throw_error(f"{self.selector} not found after {self.timeout} seconds")

    @property
    def text(self):
        txt = self.el.get_attribute("value")
        if txt is None:
            txt = self.el.get_attribute("innerHTML")

        return txt

    @text.setter
    def text(self, value):
        # Clear the field
        try:
            self.el.clear()
        except Exception as e:
            pass

        # Type the value
        with contextlib.suppress(Exception):
            value = html.unescape(value)
        if value == "BACKSPACE":
            self.el.send_keys(Keys.BACKSPACE)
        else:
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
            WebDriverWait(
                self.driver, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until_not(lambda driver: self.text == text)
        except TimeoutException as e:
            self.throw_error(
                f"{self.selector} still [[{text}]] after {self.timeout} seconds"
            )

    def click(self, shiftPressed=False):
        try:
            if shiftPressed:
                # Key down
                # import pdb; pdb.set_trace()
                ActionChains(self.driver).key_down(Keys.SHIFT).perform()
            self.el.click()
            if shiftPressed:
                # Key up
                ActionChains(self.driver).key_up(Keys.SHIFT).perform()

            self.check_errors()
        except ElementNotInteractableException as e:
            # print(e)
            self.throw_error(f"{self.selector} not clickable")

    def upload_file(self, file_path):
        file_path = os.path.realpath(file_path)
        self.el.send_keys(file_path)
        self.check_errors()

    def checkBox(self, value):
        # Get current value of checkbox
        current_value = self.el.get_attribute("checked") == "true"

        if value != current_value:
            self.el.click()

    def wait_until_contains_regex(self, regex):
        try:
            self.el = WebDriverWait(
                self.driver, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until(lambda driver: re.search(regex, self.el.get_attribute("innerHTML")))
        except TimeoutException as e:
            self.throw_error(
                f"{self.selector} does not contain [[{regex}]] after {self.timeout} seconds"
            )

    def wait_until_does_not_contain_regex(self, regex):
        try:
            WebDriverWait(
                self.driver, self.timeout, poll_frequency=self.poll_frequency_secs
            ).until_not(lambda driver: re.search(regex, self.el.get_attribute("innerHTML")))
        except TimeoutException as e:
            self.throw_error(
                f"{self.selector} still contains [[{regex}]] after {self.timeout} seconds"
            )

    def check_errors(self):
        # Run after every action
        # Wait 0.5 seconds
        time.sleep(0.5)

        # Check for errors
        err = el("#test-error", self.driver)
        if err.text != "":
            self.throw_error(err.text)

    def throw_error(self, msg):
        # Run after every action

        if not msg.endswith("."):
            msg += "."

        # print("\nLOGS:")
        # print("=====\n")
        # logs = self.driver.get_log("browser")
        # for log in logs:
        #     print(log["level"] + " :: " + log["message"])
        # print("\n=====\n")

        # Run alert in browser with msg
        # self.driver.execute_script(
        #     f"alert('ERROR: {msg} See terminal for more details.')"
        # )

        # print(msg)
        # input("Press Enter to end all tests...")
        # self.driver.quit()
        raise Exception(msg)


def make_driver(browser):
    if browser == "firefox":
        options = webdriver.FirefoxOptions()

        # Firefox can run in headless, but I prefer not. Good to have GUI just
        # in case introduces some errors (don't trust headless). Will run chrome
        # in headless, because it otherwise steals the focus.
        # options.add_argument("-headless")

        driver = webdriver.Firefox(options=options)
    elif browser == "firefox-headless":
        options = webdriver.FirefoxOptions()
        options.add_argument("-headless")
        driver = webdriver.Firefox(options=options)
    elif browser == "safari":
        # Note importance of disabling certain features in safari to make it
        # work: https://developer.apple.com/forums/thread/709225
        driver = webdriver.Safari()
        os.system("""osascript -e 'tell application "Safari" to activate'""")
    elif browser == "chrome":
        options = webdriver.ChromeOptions()
        driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
    elif browser == "chrome-headless":
        options = webdriver.ChromeOptions()
        # Chrome works well in headless! Also, prevents stealing focus.
        options.add_argument("--headless=new")
        driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)

    return driver

allowed_threads = {
    "chrome": 4,
    "chrome-headless": 4,
    "firefox": 4,
    "firefox-headless": 4,
    "safari": 1,
}

drivers = {}
browser = ""

def run_test(plugin_id):
    global drivers
    global browser

    key = threading.get_ident()
    if key not in drivers:
        drivers[key] = make_driver(browser)

    driver = drivers[key]

    plugin_idx = plugin_id[1]
    plugin_id = plugin_id[0]
    # plugin_id, plugin_idx = plugin_id

    url = f"{root_url}/?test={plugin_id}"
    if plugin_idx is not None:
        url += f"&index={str(plugin_idx)}"

    driver.get(url)

    plugin_idx_str = f" #{str(plugin_idx + 1)}" if plugin_idx is not None else ""
    test_lbl = f"{plugin_id}{plugin_idx_str}"
    # resp = f"Result of {test_lbl}: "

    cmds_str = None
    for t in range(4):
        cmds_str = el("#test-cmds", driver).text
        try:
            cmds = json.loads(cmds_str)
            break
        except Exception as JSONDecodeError:
            time.sleep(0.25)
    if cmds_str is None:
        print(f"Failed to parse JSON: {cmds_str}")
        return {
            "status": "failed",
            "test": test_lbl,
            "error": f"Failed to parse JSON: {cmds_str}",
        }
    
    if os.path.exists(f"./screenshots/{test_lbl}"):
        shutil.rmtree(f"./screenshots/{test_lbl}")
    if not os.path.exists("./screenshots"):
        os.makedirs("./screenshots")
    if not os.path.exists(f"./screenshots/{test_lbl}"):
        os.makedirs(f"./screenshots/{test_lbl}")

    # print(f"Starting {test_lbl}...")
    try:
        # print(json.dumps(cmds, indent=4))
        for cmd_idx, cmd in enumerate(cmds):
            # resp += f"   {json.dumps(cmd)}\n"
            if cmd["cmd"] == "click":
                el(cmd["selector"], driver).click(
                    cmd["data"] if "data" in cmd else False
                )
            elif cmd["cmd"] == "text":
                el(cmd["selector"], driver).text = cmd["data"]
            elif cmd["cmd"] == "wait":
                time.sleep(cmd["data"])
            elif cmd["cmd"] == "waitUntilRegex":
                el(cmd["selector"], driver).wait_until_contains_regex(cmd["data"])
            elif cmd["cmd"] == "waitUntilNotRegex":
                el(cmd["selector"], driver).wait_until_does_not_contain_regex(
                    cmd["data"]
                )
            elif cmd["cmd"] == "upload":
                el(cmd["selector"], driver).upload_file(cmd["data"])
            elif cmd["cmd"] == "addTests":
                return [(plugin_id, i) for i in range(cmd["data"])]
            elif cmd["cmd"] == "checkBox":
                el(cmd["selector"], driver).checkBox(cmd["data"])

            screenshot_path = f"./screenshots/{test_lbl}/{test_lbl}_{cmd_idx}.png"            
            driver.save_screenshot(screenshot_path)

        # resp = f"Passed: {test_lbl}"
        resp = {
            "status": "passed",
            "test": test_lbl,
            "error": "",
        }
    except Exception as e:
        # Do a trace

        # Get the stack trace
        # stack_trace = traceback.format_exc()
        # print(stack_trace)
        # resp = f"Failed: {test_lbl} {e}"
        resp = {
            "status": "failed",
            "test": test_lbl,
            "error": str(e),
        }

    # driver.quit()
    return resp


# If first argument given, use that as plugin_id
if len(sys.argv) > 1:
    # job index also given.
    # subjob_idx = int(sys.argv[2]) - 1 if len(sys.argv) > 2 else None
    # plugin_ids = [(sys.argv[1], subjob_idx)]

    subjob_idx = None
    plugin_ids = []
    # Go through each of the arguments. If it's a number, set subjob_idx. If
    # it's a string, add it to plugin_ids.
    for arg in sys.argv[1:]:
        try:
            subjob_idx = int(arg) - 1
        except ValueError:
            plugin_ids.append(arg)
    
    # Now add the subjob_idx to the plugin_ids
    plugin_ids = [(i, subjob_idx) for i in plugin_ids]

else:
    # Get ID's of all plugins
    plugin_ids = []
    for ts_file in glob.glob("./src/**/*Plugin.vue", recursive=True):
        with open(ts_file, "r") as f:
            content = f.read()
        plugin_id = re.search(r'[^:]\bpluginId *?= *?"(.+)"', content, re.MULTILINE)[1]
        plugin_ids.append((plugin_id, None))

# Some plugins are not allowed
plugin_ids = [
    i
    for i in plugin_ids
    if "simplemsg" not in i[0] and "redo" not in i[0] and "testplugin" not in i[0]
]

# some plugins are disallowed only for safari
if "safari" in browsers_to_use:
    plugin_ids = [
        i
        for i in plugin_ids
        if "documentation" not in i[0]
    ]

plugin_ids.sort()
# print(plugin_ids)

# For debugging
# plugin_ids = plugin_ids[:5]

# all_test_results = {}

passed_tests = []

for browser_to_use in browsers_to_use:
    # Set global var
    browser = browser_to_use

    print("\nBrowser: " + browser + "\n")

    plugin_ids_per_browser = plugin_ids.copy()

    for try_idx in range(8):
        failed_tests = []
        drivers = {}

        with ThreadPoolExecutor(max_workers=allowed_threads[browser_to_use]) as executor:
            # Use a dictionary to map futures to the tests they represent
            # (optional but can be useful)
            futures_to_tests = {}

            results = []

            while plugin_ids_per_browser or futures_to_tests:
                # While there are tests to submit or futures that haven't been processed
                while plugin_ids_per_browser:
                    test = plugin_ids_per_browser.pop()
                    future = executor.submit(run_test, test)
                    futures_to_tests[future] = test

                # Use as_completed to gather results and remove completed futures
                for future in as_completed(futures_to_tests):
                    test = futures_to_tests[future]
                    try:
                        result = future.result()

                        # Is result a list?
                        if isinstance(result, list):
                            plugin_ids_per_browser.extend(result)
                            print(f"Added tests: {json.dumps(result)}")
                            continue

                        # Not a list, so do nothing.
                        print(
                            f"{result['status'][:1].upper()}{result['status'][1:]}: {result['test']} {result['error']}"
                        )
                        if result["status"] == "passed":
                            # test is like ('clearselection', None)
                            passed_tests.append([test[0], test[1], try_idx, browser_to_use])
                        else:
                            failed_tests.append([test[0], test[1], try_idx, browser_to_use])
                    except Exception as e:
                        print(f"Test {test} raised an exception: {e}")
                        # all_test_results[test[0]] = f"failed (try {str(tryIdx + 1)})"
                        failed_tests.append([test[0], test[1], try_idx, browser_to_use])
                    finally:
                        del futures_to_tests[future]

        plugin_ids_per_browser = failed_tests
        plugin_ids_per_browser.sort()

        # Go through all the drivers and quit
        for driver in drivers.values():
            driver.quit()
            if browser == "safari":
                # Safari refuses to quit.
                time.sleep(1)
                os.system("pkill -9 Safari > /dev/null 2>&1")
                time.sleep(1)

        if not plugin_ids_per_browser:
            break

        plugin_ids_str = ", ".join(
            [i[0] if i[1] is None else f"{i[0]} #{str(i[1] + 1)}" for i in plugin_ids_per_browser]
        )
        print(f"Will retry the following tests: {plugin_ids_str}")


# import pdb; pdb.set_trace()

print("")
print("Tests that passed:")
for test_name, test_idx, try_idx, browser in passed_tests:
    lbl = f"   {test_name}-{browser}"
    if test_idx is not None:
        lbl += f" #{test_idx + 1}"
    lbl += f" (try {try_idx + 1})"
    print(lbl)

    # if "passed" in value:
    #     print(f"   {test}: {all_test_results[test]}")
    #     # if all("passed" in i for i in all_test_results[test]):

print("")
print("Tests that failed:")
for test_name, test_idx, try_idx, browser in failed_tests:
    lbl = f"   {test_name}-{browser}"
    if test_idx is not None:
        lbl += f" #{test_idx + 1}"
    lbl += f" (try {try_idx + 1})"
    print(lbl)

if len(failed_tests) == 0:
    print("   None!")

    # if "passed" in value:
    #     print(f"   {test}: {all_test_results[test]}")
    #     # if all("passed" in i for i in all_test_results[test]):

# for test, value in all_test_results.items():
#     if "failed" in value:
#         print(f"   {test}: {all_test_results[test]}")
#         # if all("passed" in i for i in all_test_results[test]):

print("")
print(urls[chosen_index] + "\n")
# input("Done. Press Enter to end all tests...")

# driver.quit()
