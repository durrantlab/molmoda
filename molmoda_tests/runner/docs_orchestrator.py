import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from ..drivers import allowed_threads
from .docs_capture import capture_plugin_widget, quit_all_capture_drivers


def run_docs_capture_suite(
    plugin_ids: list[tuple[str, int | None]],
    browser: str,
    root_url: str,
    out_root: str,
    max_retries: int = 2,
) -> tuple[list[dict], list[dict]]:
    """Capture widget screenshots for every plugin, with retry and threading.

    Args:
        plugin_ids: List of (plugin_id, sub_index) tuples to capture.
        browser: Browser identifier (chrome recommended for consistency).
        root_url: Root URL of the MolModa instance.
        out_root: Resolved output root directory.
        max_retries: Maximum retry rounds for failing captures.

    Returns:
        (succeeded, failed): Two lists of result dicts, each containing
        status, test, error, image_path, try, browser.
    """
    succeeded: list[dict] = []
    failed: list[dict] = []
    # De-duplicate plugins captured more than once: addTests now re-queues
    # only sub-test 0, but the orchestrator may already have seen the same
    # plugin under (id, None) when it was originally enqueued.  Track which
    # plugin ids have produced a successful capture so we skip retries.
    captured_plugins: set[str] = set()
    remaining = plugin_ids.copy()
    for try_idx in range(max_retries):
        failed_this_round: list[tuple[str, int | None]] = []
        random.shuffle(remaining)
        with ThreadPoolExecutor(max_workers=allowed_threads[browser]) as executor:
            futures_map: dict = {}
            while remaining or futures_map:
                while remaining:
                    target = remaining.pop()
                    # Skip if we've already captured this plugin in this run.
                    # Happens when (id, None) and (id, 0) both end up queued.
                    if target[0] in captured_plugins:
                        continue
                    future = executor.submit(
                        capture_plugin_widget,
                        target, browser, root_url, out_root,
                    )
                    futures_map[future] = target
                for future in as_completed(futures_map):
                    target = futures_map[future]
                    try:
                        result = future.result()
                        # addTests now returns a single (id, 0) tuple; the
                        # orchestrator re-queues it for the actual capture.
                        if isinstance(result, list):
                            remaining = result + remaining
                            continue
                        enriched = {
                            **result,
                            "try": try_idx + 1,
                            "browser": browser,
                        }
                        print(
                            f"{result['status'][:1].upper()}{result['status'][1:]}: "
                            f"{result['test']} {result['error']}"
                        )
                        if result["status"] == "passed":
                            succeeded.append(enriched)
                            captured_plugins.add(target[0])
                        else:
                            failed_this_round.append(target)
                            failed.append(enriched)
                    except Exception as e:
                        label = (
                            f"{target[0]}"
                            f"{f'.{target[1]}' if target[1] is not None else ''}"
                        )
                        print(f"Capture {target} raised: {e}")
                        failed_this_round.append(target)
                        failed.append({
                            "status": "failed",
                            "test": label,
                            "error": str(e),
                            "image_path": "",
                            "try": try_idx + 1,
                            "browser": browser,
                        })
                    finally:
                        del futures_map[future]
        quit_all_capture_drivers(browser)
        remaining = sorted(failed_this_round)
        if not remaining:
            break
        ids_str = ", ".join(
            i[0] if i[1] is None else f"{i[0]}.{i[1]}"
            for i in remaining
        )
        print(f"Will retry the following captures: {ids_str}")
    return succeeded, failed


def print_docs_capture_report(
    succeeded: list[dict],
    failed: list[dict],
    root_url: str,
) -> None:
    """Print a human-readable summary of docs-capture results.

    Args:
        succeeded: List of successful capture result dicts.
        failed: List of failed capture result dicts.
        root_url: The root URL that was captured against.
    """
    print(f"\nCaptured widgets ({len(succeeded)}):")
    for r in succeeded:
        print(f"   {r['test']} -> {r['image_path']}")
    print("\nFailed captures:")
    unique_failed = {f"{t['test']}-{t['browser']}": t for t in failed}.values()
    if not unique_failed:
        print("   None!")
    else:
        for r in unique_failed:
            print(f"   {r['test']} (Final Error: {r['error']})")
    print(f"\n{root_url}\n")