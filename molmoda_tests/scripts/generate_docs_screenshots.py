import argparse
import os
import shutil
import sys
from molmoda_tests.ui import select_root_url, select_browsers
from molmoda_tests.discovery import (
    find_plugin_ids,
    filter_plugin_ids,
    filter_capturable_plugin_ids,
)
from molmoda_tests.runner import (
    run_docs_capture_suite,
    print_docs_capture_report,
)
from molmoda_tests.runner.docs_capture import resolve_docs_out_root


def _clear_existing_pngs(out_root: str) -> int:
    """Remove all .png files under out_root before a fresh capture run.

    Stale screenshots from prior runs (e.g. for plugins that have since
    been renamed, removed, or had their popup disabled) would otherwise
    linger and get committed to the docs repo. Deleting before capture
    guarantees the output directory reflects only the current pass.

    Args:
        out_root: Resolved output root directory.

    Returns:
        Count of .png files removed.
    """
    if not os.path.isdir(out_root):
        return 0
    removed = 0
    for dirpath, _dirnames, filenames in os.walk(out_root):
        for name in filenames:
            if name.lower().endswith(".png"):
                try:
                    os.remove(os.path.join(dirpath, name))
                    removed += 1
                except OSError:
                    # Best-effort cleanup; a locked or permission-denied
                    # file shouldn't abort the whole capture run.
                    pass
    return removed


def main() -> None:
    """Entry point for the docs-screenshot generator.

    Discovers plugins (or accepts specific ones via positional args, matching
    run_tests.py's conventions), then captures one cropped screenshot of
    each plugin's popup widget in its initial state.  Output lands under
    {out_root}/{plugin_id}/widget.png with a sibling manifest.json, where
    out_root resolves to --out-dir, $MOLMODA_DOCS_DIR, or the hardcoded
    molmoda-docs default in that order.
    """
    # Use parse_known_args so positional plugin ids still flow through
    # find_plugin_ids() (which reads them from sys.argv) untouched.
    parser = argparse.ArgumentParser(
        description="Capture cropped screenshots of plugin widgets for docs."
    )
    parser.add_argument(
        "--out-dir",
        default=None,
        help=(
            "Output directory.  Overrides $MOLMODA_DOCS_DIR.  "
            "Default: ../molmoda-docs/docs/img/auto"
        ),
    )
    args, _ = parser.parse_known_args()
    # Strip --out-dir (and its value) from sys.argv so the discovery layer
    # doesn't try to interpret them as plugin ids.
    if args.out_dir is not None:
        # Find and remove "--out-dir VALUE" or "--out-dir=VALUE".
        new_argv = [sys.argv[0]]
        skip_next = False
        for arg in sys.argv[1:]:
            if skip_next:
                skip_next = False
                continue
            if arg == "--out-dir":
                skip_next = True
                continue
            if arg.startswith("--out-dir="):
                continue
            new_argv.append(arg)
        sys.argv = new_argv
    out_root = resolve_docs_out_root(args.out_dir)
    root_url = select_root_url()
    # Force chrome for consistent rendering; ignore other selections.  We
    # still call select_browsers() so the UI flow matches run_tests.py.
    browsers = select_browsers()
    chrome_browsers = [b for b in browsers if b.startswith("chrome")]
    if not chrome_browsers:
        print("Docs screenshots require Chrome; defaulting to 'chrome'.")
        browser = "chrome"
    else:
        browser = chrome_browsers[0]
    print(f"\nUsing root URL: {root_url}")
    print(f"Using browser:  {browser}")
    print(f"Output dir:     {out_root}\n")
    removed = _clear_existing_pngs(out_root)
    if removed:
        print(f"Cleared {removed} existing PNG(s) from {out_root}\n")
    plugin_ids = find_plugin_ids()
    print(f"[debug] after find_plugin_ids: {len(plugin_ids)}")
    plugin_ids = filter_plugin_ids(plugin_ids, [browser])
    print(f"[debug] after filter_plugin_ids: {len(plugin_ids)}")
    # Drop plugins with menuPath = null: they have no menu entry to drive
    # them open.  noPopup plugins are kept (capture layer branches on
    # that flag at runtime) -- see filter_capturable_plugin_ids docstring.
    plugin_ids = filter_capturable_plugin_ids(plugin_ids)
    print(f"[debug] after filter_capturable_plugin_ids: {len(plugin_ids)}")
    print(f"Capturing {len(plugin_ids)} plugin widget(s)...\n")
    succeeded, failed = run_docs_capture_suite(
        plugin_ids, browser, root_url, out_root,
    )
    print_docs_capture_report(succeeded, failed, root_url)
if __name__ == "__main__":
    main()