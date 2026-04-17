"""
test_tours.py: Run guided tours for MolModa plugins and verify they complete.

Reuses the click-loop from click_next.py to step through each tour
automatically.  Tours run in parallel (one browser per thread) with retry
logic, mirroring the structure of run_tests.py.

Usage:
    python scripts/test_tours.py                     # all tour-capable plugins
    python scripts/test_tours.py <plugin_id> ...     # specific plugin(s) only
    python scripts/test_tours.py --serial            # run one at a time
    python scripts/test_tours.py --serial <id> ...   # serial + specific plugins
"""

import sys

from molmoda_tests.ui import select_root_url, select_browsers
from molmoda_tests.discovery.tours import find_tour_plugin_ids
from molmoda_tests.runner.tour_orchestrator import run_tour_suite, print_tour_report


def main() -> None:
    """Entry point for the tour test runner."""
    # Extract --serial flag before passing remaining args to discovery.
    raw_args = sys.argv[1:]
    serial = "--serial" in raw_args
    plugin_args = [a for a in raw_args if a != "--serial"]

    root_url = select_root_url()
    browsers = select_browsers()

    plugin_ids = find_tour_plugin_ids(argv=plugin_args)

    mode = "serial" if serial else "parallel"
    print(f"\nUsing root URL: {root_url}")
    print(f"Using browsers: {', '.join(browsers)}")
    print(f"Tours to run: {len(plugin_ids)} ({mode})")
    if plugin_ids:
        print(f"  {', '.join(plugin_ids)}")
    print()

    all_passed: list[dict[str, str]] = []
    all_failed: list[dict[str, str]] = []
    all_skipped: list[dict[str, str]] = []

    for browser in browsers:
        print(f"\nBrowser: {browser}\n")
        passed, failed, skipped = run_tour_suite(
            plugin_ids, browser, root_url, serial=serial,
        )
        all_passed.extend(passed)
        all_failed.extend(failed)
        all_skipped.extend(skipped)

    print_tour_report(all_passed, all_failed, all_skipped, root_url)


if __name__ == "__main__":
    main()