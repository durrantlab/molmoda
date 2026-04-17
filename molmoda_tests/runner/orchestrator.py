"""
High-level test orchestration: threaded execution, retry logic, and reporting.
"""

import random
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..drivers import allowed_threads
from .executor import run_test, quit_all_drivers


def run_browser_suite(
    plugin_ids: list[tuple[str, int | None]],
    browser: str,
    root_url: str,
    max_retries: int = 4,
) -> tuple[list[dict], list[dict]]:
    """
    Run all tests for a single browser with retry logic and threading.

    Args:
        plugin_ids:  List of (plugin_name, plugin_idx) tuples.
        browser:     Browser string (e.g. 'chrome-headless').
        root_url:    Root URL being tested.
        max_retries: Maximum retry rounds for failing tests.

    Returns:
        (passed_tests, failed_tests): Two lists of result dicts, each with
        keys: status, test, error, try, browser.
    """
    is_single = len(plugin_ids) == 1
    passed_tests: list[dict] = []
    failed_tests: list[dict] = []

    remaining = plugin_ids.copy()

    for try_idx in range(max_retries):
        failed_this_round: list[tuple] = []
        random.shuffle(remaining)

        with ThreadPoolExecutor(max_workers=allowed_threads[browser]) as executor:
            futures_map: dict = {}

            while remaining or futures_map:
                while remaining:
                    test = remaining.pop()
                    future = executor.submit(run_test, test, browser, root_url, is_single)
                    futures_map[future] = test

                for future in as_completed(futures_map):
                    test = futures_map[future]
                    try:
                        result = future.result()

                        if isinstance(result, list):
                            # addTests: expand sub-tests into the queue.
                            remaining = result + remaining
                            continue

                        print(
                            f"{result['status'][:1].upper()}{result['status'][1:]}: "
                            f"{result['test']} {result['error']}"
                        )

                        enriched = {**result, "try": try_idx + 1, "browser": browser}
                        if result["status"] == "passed":
                            passed_tests.append(enriched)
                        else:
                            failed_this_round.append(test)
                            failed_tests.append(enriched)

                    except Exception as e:
                        label = (
                            f"{test[0]}"
                            f"{f' #{test[1] + 1}' if test[1] is not None else ''}"
                        )
                        print(f"Test {test} raised an exception: {e}")
                        failed_this_round.append(test)
                        failed_tests.append({
                            "status": "failed",
                            "test": label,
                            "error": str(e),
                            "try": try_idx + 1,
                            "browser": browser,
                        })
                    finally:
                        del futures_map[future]

        quit_all_drivers(browser)

        remaining = sorted(failed_this_round)
        if not remaining:
            break

        ids_str = ", ".join(
            i[0] if i[1] is None else f"{i[0]} #{i[1] + 1}"
            for i in remaining
        )
        print(f"Will retry the following tests: {ids_str}")

    return passed_tests, failed_tests


def print_report(
    passed_tests: list[dict],
    failed_tests: list[dict],
    root_url: str,
):
    """Print a human-readable summary of test results."""
    print("\nTests that passed:")
    for r in passed_tests:
        print(f"   {r['test']}-{r['browser']} (try {r['try']})")

    print("\nTests that failed:")
    unique_failed = {f"{t['test']}-{t['browser']}": t for t in failed_tests}.values()
    if not unique_failed:
        print("   None!")
    else:
        for r in unique_failed:
            print(f"   {r['test']}-{r['browser']} (Final Error: {r['error']})")

    print(f"\n{root_url}\n")

    if failed_tests:
        failed_summary: dict[str, dict] = {}
        for t in failed_tests:
            parts = t["test"].split(" #")
            name = parts[0]
            if name not in failed_summary:
                failed_summary[name] = {"indices": set(), "no_index_failed": False}
            if len(parts) > 1:
                failed_summary[name]["indices"].add(int(parts[1]))
            else:
                failed_summary[name]["no_index_failed"] = True

        run_again_parts = []
        for name in sorted(failed_summary):
            summary = failed_summary[name]
            if summary["no_index_failed"]:
                run_again_parts.append(name)
            elif summary["indices"]:
                indices_str = "".join(str(i) for i in sorted(summary["indices"]))
                run_again_parts.append(f"{name}({indices_str})")

        print(f" RUN AGAIN (FAILED)?: {' '.join(run_again_parts)}")
