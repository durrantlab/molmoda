"""
High-level tour orchestration: threaded execution, retry logic, and reporting.

Mirrors the structure of ``runner/orchestrator.py`` but specialized for
running guided tours via the click-loop approach.
"""

import random
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..drivers import allowed_threads
from .tour_executor import run_tour, quit_all_tour_drivers


def run_tour_suite(
    plugin_ids: list[str],
    browser: str,
    root_url: str,
    max_retries: int = 2,
    serial: bool = False,
) -> tuple[list[dict[str, str]], list[dict[str, str]], list[dict[str, str]]]:
    """Run all tours for a single browser with retry logic and threading.

    Args:
        plugin_ids: List of plugin ID strings to tour.
        browser: Browser string (e.g. 'chrome-headless').
        root_url: Root URL being tested.
        max_retries: Maximum retry rounds for failing tours.
        serial: When True, run tours one at a time instead of in parallel.

    Returns:
        A 3-tuple of (passed, failed, skipped) result-dict lists.  Each
        dict has keys: status, test, error, try, browser.
    """
    passed: list[dict[str, str]] = []
    failed: list[dict[str, str]] = []
    skipped: list[dict[str, str]] = []

    remaining = plugin_ids.copy()
    max_workers = 1 if serial else allowed_threads[browser]

    for try_idx in range(max_retries):
        failed_this_round: list[str] = []
        random.shuffle(remaining)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map: dict = {}
            for pid in remaining:
                future = executor.submit(run_tour, pid, browser, root_url)
                future_map[future] = pid

            for future in as_completed(future_map):
                pid = future_map[future]
                try:
                    result = future.result()
                    enriched = {
                        **result,
                        "try": str(try_idx + 1),
                        "browser": browser,
                    }
                    status = result["status"]
                    label = f"{status[0].upper()}{status[1:]}: {pid}"
                    if result["error"]:
                        label += f" ({result['error']})"
                    print(label)

                    if status == "passed":
                        passed.append(enriched)
                    elif status == "skipped":
                        skipped.append(enriched)
                    else:
                        failed_this_round.append(pid)
                        failed.append(enriched)
                except Exception as e:
                    print(f"Tour {pid} raised an exception: {e}")
                    failed_this_round.append(pid)
                    failed.append({
                        "status": "failed",
                        "test": pid,
                        "error": str(e),
                        "try": str(try_idx + 1),
                        "browser": browser,
                    })

        quit_all_tour_drivers(browser)

        remaining = sorted(failed_this_round)
        if not remaining:
            break

        print(f"Will retry the following tours: {', '.join(remaining)}")

    return passed, failed, skipped


def print_tour_report(
    passed: list[dict[str, str]],
    failed: list[dict[str, str]],
    skipped: list[dict[str, str]],
    root_url: str,
) -> None:
    """Print a human-readable summary of tour results.

    Args:
        passed: List of passed result dicts.
        failed: List of failed result dicts.
        skipped: List of skipped result dicts.
        root_url: The root URL that was tested.
    """
    print("\nTours that passed:")
    for r in passed:
        print(f"   {r['test']}-{r['browser']} (try {r['try']})")

    if skipped:
        print("\nTours that were skipped (no tour content):")
        for r in skipped:
            print(f"   {r['test']}-{r['browser']}")

    print("\nTours that failed:")
    unique_failed = {f"{t['test']}-{t['browser']}": t for t in failed}.values()
    if not unique_failed:
        print("   None!")
    else:
        for r in unique_failed:
            print(f"   {r['test']}-{r['browser']} (Final Error: {r['error']})")

    print(f"\n{root_url}\n")

    if failed:
        names = sorted({t["test"] for t in failed})
        print(f" RUN AGAIN (FAILED)?: {' '.join(names)}")