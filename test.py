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

localhost_port = "8080"


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
        self.el.clear()
        # Type the value
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


# os.environ['webdriver.chrome.driver'] = "/Users/jdurrant/Documents/Work/durrant_git/biotite-suite/utils/chromedriver_mac_arm64/chromedriver"


def make_driver():

    # options = Options()
    # options.BinaryLocation = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    # driver_path = "/usr/bin/chromedriver"
    # driver = webdriver.Chrome(options=options, service=Service(driver_path))

    # Running headless speeds up tests. But then you get warnings.
    # options.add_argument("--headless")

    # options.add_argument("--no-sandbox")
    # options.add_argument("--disable-dev-shm-usage")
    # options.add_argument("--disable-extensions")
    # options.add_argument("--disable-infobars")
    # options.add_argument("--disable-gpu")

    # options.add_argument("--window-size=3840,2160")
    # options.add_argument("--auto-open-devtools-for-tabs")
    # options.add_argument("--start-maximized")

    # Download the driver here: https://sites.google.com/chromium.org/driver/

    # Return the driver
    # options = webdriver.ChromeOptions()
    # return webdriver.Chrome(
    #     service=ChromeService(ChromeDriverManager().install()), options=options
    # )

    # options = webdriver.EdgeOptions()
    # return webdriver.Edge(options=options)

    options = webdriver.FirefoxOptions()
    return webdriver.Firefox(options=options)


drivers = {}


def run_test(plugin_id):

    global drivers

    key = threading.get_ident()
    if key not in drivers:
        drivers[key] = make_driver()

    driver = drivers[key]

    plugin_idx = plugin_id[1]
    plugin_id = plugin_id[0]
    # plugin_id, plugin_idx = plugin_id

    url = f"http://localhost:{localhost_port}/?test={plugin_id}"
    if plugin_idx is not None:
        url += f"&index={str(plugin_idx)}"

    driver.get(url)

    plugin_idx_str = f" #{str(plugin_idx + 1)}" if plugin_idx is not None else ""
    test_lbl = f"{plugin_id}{plugin_idx_str}"
    # resp = f"Result of {test_lbl}: "

    cmds_str = el("#test-cmds", driver).text
    try:
        cmds = json.loads(cmds_str)
    except Exception as JSONDecodeError:
        print(f"Failed to parse JSON: {cmds_str}")
        return {
            "status": "failed",
            "test": test_lbl,
            "error": f"Failed to parse JSON: {cmds_str}",
        }

    # print(f"Starting {test_lbl}...")
    try:
        for cmd in cmds:
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
            elif cmd["cmd"] == "upload":
                el(cmd["selector"], driver).upload_file(cmd["data"])
            elif cmd["cmd"] == "addTests":
                return [(plugin_id, i) for i in range(cmd["data"])]
            elif cmd["cmd"] == "checkBox":
                el(cmd["selector"], driver).checkBox(cmd["data"])
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
    subjob_idx = int(sys.argv[2]) - 1 if len(sys.argv) > 2 else None
    plugin_ids = [(sys.argv[1], subjob_idx)]
else:
    # Get ID's of all plugins
    plugin_ids = []
    for ts_file in glob.glob("./src/**/*Plugin.vue", recursive=True):
        with open(ts_file, "r") as f:
            content = f.read()
        plugin_id = re.search(r'[^:]\bpluginId *?= *?"(.+)"', content, re.MULTILINE)[1]
        plugin_ids.append((plugin_id, None))
    plugin_ids = [
        i
        for i in plugin_ids
        if "simplemsg" not in i[0] and "redo" not in i[0] and "testplugin" not in i[0]
    ]

plugin_ids.sort()
# print(plugin_ids)

# For debugging
# plugin_ids = plugin_ids[:5]

# all_test_results = {}

passed_tests = []

for try_idx in range(4):
    failed_tests = []
    drivers = {}

    # plugin_ids.remove("about")  # Because cancel button. TODO: Good to account for this.

    # Get all the tests you'll run

    # while plugin_ids:
    #     plugin_id = plugin_ids.pop(0)
    #     result = run_test(plugin_id)
    #     if result is not None:
    #         plugin_ids.extend(result)

    with ThreadPoolExecutor(max_workers=4) as executor:
        # Use a dictionary to map futures to the tests they represent (optional but
        # can be useful)
        futures_to_tests = {}

        results = []

        while plugin_ids or futures_to_tests:
            # While there are tests to submit or futures that haven't been processed
            while plugin_ids:
                test = plugin_ids.pop()
                future = executor.submit(run_test, test)
                futures_to_tests[future] = test

            # Use as_completed to gather results and remove completed futures
            for future in as_completed(futures_to_tests):
                test = futures_to_tests[future]
                try:
                    result = future.result()

                    # Is result a list?
                    if isinstance(result, list):
                        plugin_ids.extend(result)
                        print(f"Added tests: {json.dumps(result)}")
                        continue

                    # Not a list, so do nothing.
                    # results.append(result)
                    # print(f"Test {test} resulted in {result}")
                    print(
                        f"{result['status'][:1].upper()}{result['status'][1:]}: {result['test']} {result['error']}"
                    )
                    # if result["test"] not in all_test_results:
                    # all_test_results[result["test"]] = []
                    # all_test_results[result["test"]].append(
                    #     result["status"] + " (try " + str(tryIdx + 1) + ")"
                    # )
                    # all_test_results[result["test"]] = (
                    #     result["status"] + " (try " + str(tryIdx + 1) + ")"
                    # )

                    if result["status"] == "passed":
                        passed_tests.append([test[0], test[1], try_idx])
                    else:
                        failed_tests.append([test[0], test[1], try_idx])
                except Exception as e:
                    print(f"Test {test} raised an exception: {e}")
                    # all_test_results[test[0]] = f"failed (try {str(tryIdx + 1)})"
                    failed_tests.append([test[0], test[1], try_idx])
                finally:
                    del futures_to_tests[future]

    # print("")
    # print("Tests that passed:")
    # for test, value in all_test_results.items():
    #     if "passed" in value:
    #         print(f"   {test}: {all_test_results[test]}")
    #         # if all("passed" in i for i in all_test_results[test]):

    plugin_ids = failed_tests
    plugin_ids.sort()

    # plugin_ids = [
    #     test for test, value_ in all_test_results.items() if "failed" in value_
    # ]
    # plugin_ids2 = [
    #     (i, None) if " #" not in i else (i.split(" #")[0], int(i.split(" #")[1]))
    #     for i in plugin_ids
    # ]
    # plugin_ids2.sort()

    # Go through all the drivers and quit
    for driver in drivers.values():
        driver.quit()

    if not plugin_ids:
        break

    plugin_ids_str = ", ".join(
        [i[0] if i[1] is None else f"{i[0]} #{str(i[1] + 1)}" for i in plugin_ids]
    )
    print(f"Will retry the following tests: {plugin_ids_str}")


# import pdb; pdb.set_trace()

print("")
print("Tests that passed:")
for test_name, test_idx, try_idx in passed_tests:
    lbl = f"   {test_name}"
    if test_idx is not None:
        lbl += f" #{test_idx + 1}"
    lbl += f" (try {try_idx + 1})"
    print(lbl)

    # if "passed" in value:
    #     print(f"   {test}: {all_test_results[test]}")
    #     # if all("passed" in i for i in all_test_results[test]):

print("")
print("Tests that failed:")
for test_name, test_idx, try_idx in failed_tests:
    lbl = f"   {test_name}"
    if test_idx is not None:
        lbl += f" #{test_idx + 1}"
    lbl += f" (try {try_idx + 1})"
    print(lbl)

    # if "passed" in value:
    #     print(f"   {test}: {all_test_results[test]}")
    #     # if all("passed" in i for i in all_test_results[test]):

# for test, value in all_test_results.items():
#     if "failed" in value:
#         print(f"   {test}: {all_test_results[test]}")
#         # if all("passed" in i for i in all_test_results[test]):


input("Done. Press Enter to end all tests...")

# driver.quit()
