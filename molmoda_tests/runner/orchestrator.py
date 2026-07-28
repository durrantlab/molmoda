"""
High-level test orchestration: threaded execution, retry logic, and reporting.
"""

import random
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TypedDict
from ..drivers import allowed_threads
from .executor import run_test, quit_all_drivers


class _FailedSummary(TypedDict):
    """Per-plugin accumulation of failed subjob indices for the rerun hint."""

    indices: set[int]
    no_index_failed: bool


def _format_test_label(plugin_name: str, plugin_index: int | None) -> str:
    """Render a test's display label using a 1-based subjob index.

    The subjob index is stored 0-based internally (it indexes into the
    plugin's test array and feeds the ``&index=`` URL param), but the CLI
    accepts it 1-based and converts back with ``int(arg) - 1``. Formatting
    every human-facing line 1-based keeps the report, the live status lines,
    and the ``RUN AGAIN`` hint agreeing with what the user actually types.

    Args:
        plugin_name: The plugin id.
        plugin_index: The 0-based subjob index, or None for a whole-plugin test.

    Returns:
        The plugin name, suffixed with ``" #N"`` (1-based) when indexed.
    """
    if plugin_index is None:
        return plugin_name
    return f"{plugin_name} #{plugin_index + 1}"


def run_browser_suite(
    plugin_ids: list[tuple[str, int | None]],
    browser: str,
    root_url: str,
    passed_tests: list[dict],
    failed_tests: list[dict],
    max_retries: int = 2,
) -> None:
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
    remaining = plugin_ids.copy()

    for try_idx in range(max_retries):
        failed_this_round: list[tuple] = []
        random.shuffle(remaining)

        with ThreadPoolExecutor(max_workers=allowed_threads[browser]) as executor:
            futures_map: dict = {}
            try:
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
                                remaining = result + remaining
                                continue
                            label = _format_test_label(test[0], test[1])
                            print(
                                f"{result['status'][:1].upper()}{result['status'][1:]}: "
                                f"{label} {result['error']}"
                            )
                            enriched = {
                                **result,
                                "try": try_idx + 1,
                                "browser": browser,
                                "plugin_name": test[0],
                                "plugin_index": test[1],
                            }
                            if result["status"] == "passed":
                                passed_tests.append(enriched)
                            else:
                                failed_this_round.append(test)
                                failed_tests.append(enriched)
                        except Exception as e:
                            print(f"Test {test} raised an exception: {e}")
                            failed_this_round.append(test)
                            failed_tests.append({
                                "status": "failed",
                                "test": _format_test_label(test[0], test[1]),
                                "error": str(e),
                                "try": try_idx + 1,
                                "browser": browser,
                                "plugin_name": test[0],
                                "plugin_index": test[1],
                            })
                        finally:
                            del futures_map[future]
            except KeyboardInterrupt:
                # Stop dispatching queued work and mark everything that never
                # reached a verdict as failed so the report's rerun list is
                # complete even when the run is aborted early.
                executor.shutdown(wait=False, cancel_futures=True)
                for test in list(remaining) + list(futures_map.values()):
                    failed_tests.append({
                        "status": "failed",
                        "test": _format_test_label(test[0], test[1]),
                        "error": "Interrupted (Ctrl-C) before completion",
                        "try": try_idx + 1,
                        "browser": browser,
                        "plugin_name": test[0],
                        "plugin_index": test[1],
                    })
                raise
        quit_all_drivers(browser)

        remaining = sorted(failed_this_round)
        if not remaining:
            break

        ids_str = ", ".join(
            i[0] if i[1] is None else f"{i[0]} #{i[1] + 1}"
            for i in remaining
        )
        print(f"Will retry the following tests: {ids_str}")

def print_report(
    passed_tests: list[dict],
    failed_tests: list[dict],
    root_url: str,
):
    """Print a human-readable summary of test results."""
    print("\nTests that passed:")
    for r in passed_tests:
        label = _format_test_label(r["plugin_name"], r["plugin_index"])
        print(f"   {label}-{r['browser']} (try {r['try']})")
    print("\nTests that failed:")
    unique_failed = {
        (t["plugin_name"], t["plugin_index"], t["browser"]): t
        for t in failed_tests
    }.values()
    if not unique_failed:
        print("   None!")
    else:
        for r in unique_failed:
            label = _format_test_label(r["plugin_name"], r["plugin_index"])
            print(f"   {label}-{r['browser']} (Final Error: {r['error']})")
    print(f"\n{root_url}\n")

    if failed_tests:
        failed_summary: dict[str, _FailedSummary] = {}
        for t in failed_tests:
            name = t["plugin_name"]
            idx = t["plugin_index"]
            if name not in failed_summary:
                failed_summary[name] = {"indices": set(), "no_index_failed": False}
            if idx is None:
                failed_summary[name]["no_index_failed"] = True
            else:
                failed_summary[name]["indices"].add(idx + 1)
        run_again_parts: list[str] = []
        for name in sorted(failed_summary):
            summary = failed_summary[name]
            if summary["no_index_failed"]:
                run_again_parts.append(name)
            elif summary["indices"]:
                indices_str = ",".join(
                    str(i) for i in sorted(summary["indices"])
                )
                run_again_parts.append(f"{name}({indices_str})")

        print(f" RUN AGAIN (FAILED)?: {' '.join(run_again_parts)}")
