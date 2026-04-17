"""
run_tests.py: Run the full MolModa plugin test suite.

Usage:
    python scripts/run_tests.py                        # all plugins
    python scripts/run_tests.py <plugin_id>            # one plugin
    python scripts/run_tests.py <plugin_id> <index>    # one sub-test (1-based)
"""

import os
import sys

from molmoda_tests.ui import select_root_url, select_browsers
from molmoda_tests.discovery import find_plugin_ids, filter_plugin_ids
from molmoda_tests.runner import run_browser_suite, print_report


def main():
    root_url = select_root_url()
    browsers = select_browsers()

    print(f"\nUsing root URL: {root_url}")
    print(f"Using browsers: {', '.join(browsers)}\n")

    plugin_ids = find_plugin_ids()
    plugin_ids = filter_plugin_ids(plugin_ids, browsers)

    all_passed: list[dict] = []
    all_failed: list[dict] = []

    for browser in browsers:
        print(f"\nBrowser: {browser}\n")
        passed, failed = run_browser_suite(plugin_ids, browser, root_url)
        all_passed.extend(passed)
        all_failed.extend(failed)

    print_report(all_passed, all_failed, root_url)

    input("Press Enter to run all jest unit tests...")
    os.system("node_modules/.bin/jest")


if __name__ == "__main__":
    main()
