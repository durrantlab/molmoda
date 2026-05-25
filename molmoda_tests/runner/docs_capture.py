import contextlib
import io
import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, TypedDict
from PIL import Image
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from ..elements import el
from ..drivers import make_driver
from .command_dispatch import dispatch_command


# Padding (CSS pixels) added around the modal's bounding rect when cropping,
# so the popup doesn't sit flush against the image edge in docs.
CROP_PADDING_PX = 12

# Maximum CSS pixels to settle after the popup becomes visible.  Bootstrap's
# fade transition is ~150ms; we wait a bit longer to be safe across browsers.
POPUP_SETTLE_SECS = 0.6

# Where captured images and manifests are written.
DOCS_OUT_ROOT = "docs/img/auto"

# Default output directory.  Resolved at call time (not import time) so that
# overriding via env var or CLI flag still works.  Uses the molmoda-docs repo
# path because docs screenshots are committed there, not in the molmoda repo.
DEFAULT_DOCS_OUT_ROOT = os.path.expanduser(
    "../molmoda-docs/docs/img/auto"
)


def resolve_docs_out_root(cli_override: str | None = None) -> str:
    """Resolve the output directory for captured screenshots.

    Precedence (highest first): explicit CLI argument, MOLMODA_DOCS_DIR
    environment variable, then the hardcoded default pointing at the
    molmoda-docs repo.  Centralising this keeps the resolution logic in one
    place and out of the orchestrator and CLI script.

    Args:
        cli_override: Optional path passed via --out-dir on the CLI.

    Returns:
        Absolute filesystem path where screenshots should be written.
    """
    if cli_override:
        return os.path.abspath(os.path.expanduser(cli_override))
    env = os.environ.get("MOLMODA_DOCS_DIR")
    if env:
        return os.path.abspath(os.path.expanduser(env))
    return DEFAULT_DOCS_OUT_ROOT

class IRect(TypedDict):
    """Bounding rect for the popup, in CSS pixels, plus the device-pixel ratio.

    `dpr` is needed because Selenium's screenshot is in device pixels but
    getBoundingClientRect returns CSS pixels.
    """
    x: float
    y: float
    width: float
    height: float
    dpr: float


class IManifestEntry(TypedDict):
    """One captured widget's metadata, written to manifest.json."""
    plugin_id: str
    plugin_index: int | None
    image: str
    captured_at: str
    browser: str
    viewport: dict[str, int]


_drivers: dict[int, Any] = {}
_drivers_lock = threading.Lock()


def _get_driver(browser: str, root_url: str) -> Any:
    """Return a thread-local WebDriver, creating one on first use.

    Mirrors the pattern in executor.py so parallel capture works the same way
    as the test runner.

    Args:
        browser: Browser identifier (e.g. 'chrome').
        root_url: Root URL of the MolModa instance.

    Returns:
        A configured Selenium WebDriver for this thread.
    """
    key = threading.get_ident()
    with _drivers_lock:
        if key not in _drivers:
            _drivers[key] = make_driver(browser, root_url)
    return _drivers[key]


def quit_all_capture_drivers(browser: str) -> None:
    """Quit every capture driver in the registry and clear it.

    Args:
        browser: Browser identifier (used for Safari-specific cleanup, though
            docs capture is Chrome-only by design).
    """
    with _drivers_lock:
        for driver in _drivers.values():
            try:
                driver.quit()
            except Exception:
                pass
        _drivers.clear()


def _hide_fake_cursor(driver: Any) -> None:
    """Hide the test-mode custom cursor injected by makeFakeMouse().

    The TypeScript test infrastructure (TestCmd.ts) appends a #customCursor
    div whenever a test runs.  We don't want that cursor visible in docs
    screenshots, so we hide it before capturing.

    Args:
        driver: The active WebDriver.
    """
    driver.execute_script(
        "var c = document.getElementById('customCursor'); "
        "if (c) { c.style.display = 'none'; }"
    )


def _drive_until_popup_visible(
    driver: Any, plugin_id: str, cmds: list[dict[str, object]]
) -> int:
    """Execute commands until the plugin's modal is visible and stable.

    The TypeScript test infrastructure emits a command sequence that includes
    menu clicks (openPluginCmds), per-plugin setup (beforePluginOpens), and
    eventually opens the popup.  For docs screenshots we want to stop the
    moment the popup is on-screen in its pristine state -- before any
    pluginOpen commands fill in the form.

    Args:
        driver: The active WebDriver.
        plugin_id: The plugin being captured (used to select its modal).
        cmds: The full command list read from #cmds-element.

    Returns:
        The number of commands executed before the popup became visible.

    Raises:
        Exception: If the command list is exhausted without the popup
            appearing, or if a dispatched command fails.
    """
    modal_selector = f"#modal-{plugin_id}"
    for cmd_idx, cmd in enumerate(cmds):
        # addTests must never be dispatched; it's a meta-instruction that
        # tells the orchestrator to enumerate sub-tests.  If we hit one here,
        # something is wrong with the assumption that this is a single test.
        if cmd["cmd"] == "addTests":
            raise Exception(
                f"Encountered addTests for {plugin_id}; sub-index required."
            )
        dispatch_command(driver, cmd)
        # After each command, check whether the modal is now displayed.  We
        # poll the DOM directly rather than waiting on a single command,
        # because the popup typically appears after the menu-item click but
        # before any pluginOpen commands run.
        if _is_modal_visible(driver, modal_selector):
            return cmd_idx + 1
    raise Exception(
        f"Modal {modal_selector} never became visible after "
        f"{len(cmds)} commands."
    )


def _is_modal_visible(driver: Any, modal_selector: str) -> bool:
    """Return True iff the plugin's modal is in the DOM and displayed.

    Bootstrap toggles a 'show' class and inline display style on modals;
    checking the element's is_displayed() catches both.

    Args:
        driver: The active WebDriver.
        modal_selector: CSS selector for the modal (e.g. '#modal-loadpdb').

    Returns:
        True when the modal is visible to the user.
    """
    try:
        elem = driver.find_element(By.CSS_SELECTOR, modal_selector)
        return elem.is_displayed()
    except Exception:
        return False


def _wait_for_modal_dialog(driver: Any, plugin_id: str) -> Any:
    """Wait until the modal-dialog has rendered and return it.

    The modal container (#modal-{pluginId}) may be present before its inner
    .modal-dialog finishes laying out.  We crop against the inner dialog
    because that's the visible widget; the outer container also includes a
    transparent backdrop area.

    Args:
        driver: The active WebDriver.
        plugin_id: The plugin identifier.

    Returns:
        The .modal-dialog WebElement.
    """
    selector = f"#modal-{plugin_id} .modal-dialog"
    return WebDriverWait(driver, 10, poll_frequency=0.25).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
    )


def _measure_rect(driver: Any, element: Any) -> IRect:
    """Read the element's bounding rect and the page's device-pixel ratio.

    Both values are needed to translate from CSS-pixel coordinates (what JS
    sees) to device-pixel coordinates (what Selenium's screenshot returns).

    Args:
        driver: The active WebDriver.
        element: The DOM element to measure.

    Returns:
        Rect with x, y, width, height in CSS pixels plus the page's dpr.
    """
    return driver.execute_script(
        "const r = arguments[0].getBoundingClientRect(); "
        "return {x: r.x, y: r.y, width: r.width, height: r.height, "
        "        dpr: window.devicePixelRatio};",
        element,
    )


def _crop_screenshot_to_rect(png_bytes: bytes, rect: IRect, pad: int) -> bytes:
    """Crop a full-viewport screenshot down to the given rect plus padding.

    Selenium's screenshot is in device pixels; the rect is in CSS pixels.
    Multiplying by dpr converts coordinates correctly on hidpi displays.

    Args:
        png_bytes: Raw PNG bytes from driver.get_screenshot_as_png().
        rect: CSS-pixel bounding box plus dpr.
        pad: Padding in CSS pixels added to each side before cropping.

    Returns:
        PNG bytes of the cropped image.
    """
    img = Image.open(io.BytesIO(png_bytes))
    dpr = rect["dpr"] or 1.0
    left = max(0, int((rect["x"] - pad) * dpr))
    top = max(0, int((rect["y"] - pad) * dpr))
    right = min(img.width, int((rect["x"] + rect["width"] + pad) * dpr))
    bottom = min(img.height, int((rect["y"] + rect["height"] + pad) * dpr))
    cropped = img.crop((left, top, right, bottom))
    buf = io.BytesIO()
    cropped.save(buf, format="PNG", optimize=True)
    return buf.getvalue()

def _output_dir_for(plugin_id: str, out_root: str) -> str:
    """Return the output directory for a captured widget.

    Multi-test plugins now share a single capture (taken from sub-test 0),
    so plugin_idx no longer affects the output path.  This keeps the docs
    folder structure flat: one widget per plugin.

    Args:
        plugin_id: The plugin's identifier.
        out_root: Resolved root directory (see resolve_docs_out_root).

    Returns:
        Directory path where this plugin's widget.png and manifest.json live.
    """
    return os.path.join(out_root, plugin_id)


def _write_manifest(
    out_dir: str,
    plugin_id: str,
    image_name: str,
    browser: str,
    viewport: dict[str, int],
) -> None:
    """Write manifest.json describing the captured widget.

    The manifest lets a future mkdocs macro look up screenshots by plugin_id
    without scanning the filesystem.  plugin_index is no longer recorded
    because we only capture sub-test 0 for multi-test plugins.

    Args:
        out_dir: Directory where the manifest is written.
        plugin_id: The plugin's identifier.
        image_name: Filename of the captured PNG (relative to out_dir).
        browser: Browser used for capture.
        viewport: {'width': ..., 'height': ...} viewport size at capture time.
    """
    entry: IManifestEntry = {
        "plugin_id": plugin_id,
        "plugin_index": None,
        "image": image_name,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "browser": browser,
        "viewport": viewport,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(entry, f, indent=2)


def capture_plugin_widget(
    plugin_id_tuple: tuple[str, int | None],
    browser: str,
    root_url: str,
    out_root: str,
) -> dict[str, str | list]:
    """Capture a cropped screenshot of a single plugin's popup widget.

    Reuses the existing TypeScript test infrastructure to open the popup
    (no TS changes required): the same ?test={pluginId} URL parameter that
    drives functional tests also opens the plugin's modal.  We execute
    commands only until the modal is visible, then stop -- which gives us
    the widget in its pristine, just-opened state.

    For plugins that emit an addTests meta-command, we capture sub-test 0
    only.  The widget looks the same across sub-tests (the popup contents
    are determined by the plugin, not the test scenario), so capturing
    every sub-test is wasteful.

    Args:
        plugin_id_tuple: (plugin_id, plugin_idx).  plugin_idx is None for
            single-test plugins, or an integer when explicitly targeting a
            sub-test from the CLI.
        browser: Browser identifier (should be 'chrome').
        root_url: Root URL of the MolModa instance.
        out_root: Resolved output root directory.

    Returns:
        Either a result dict ({status, test, error, image_path}) on success
        or a list of (plugin, 0) tuples when an addTests is encountered --
        only sub-test 0, because the widget is sub-test-independent.
    """
    driver = _get_driver(browser, root_url)
    plugin_name, plugin_idx = plugin_id_tuple
    label = (
        f"{plugin_name}"
        f"{f'.{plugin_idx}' if plugin_idx is not None else ''}"
    )
    try:
        url = f"{root_url}/?test={plugin_name}"
        if plugin_idx is not None:
            url += f"&index={plugin_idx}"
        driver.get(url)
        # Read the command list emitted by the TS test infrastructure.  Retry
        # because Vue may not have populated #test-cmds yet on first paint.
        cmds = None
        for _ in range(4):
            cmds_str = el("#test-cmds", driver).text
            try:
                cmds = json.loads(cmds_str)
                break
            except Exception:
                time.sleep(0.25)
        if cmds is None:
            raise Exception(
                f"No commands found for {plugin_name}; "
                "is the URL pointing at a valid plugin id?"
            )
        # Handle the AddTests meta-command.  Unlike run_test() which
        # enumerates every sub-test for verification, we only need one
        # capture per plugin -- the widget looks the same regardless of
        # which sub-test the TS layer decides to run.  Re-queue just
        # sub-test 0 so the orchestrator picks up the actual capture pass.
        if len(cmds) == 1 and cmds[0]["cmd"] == "addTests":
            return [(plugin_name, 0)]
        # Step through commands until the popup is visible.  This skips the
        # closing clicks (closePlugin / afterPluginCloses), leaving the modal
        # rendered in its initial state.
        _drive_until_popup_visible(driver, plugin_name, cmds)
        # Bootstrap fade transitions can leave the modal mid-animation; wait
        # for the .modal-dialog to be fully visible before measuring.
        dialog = _wait_for_modal_dialog(driver, plugin_name)
        time.sleep(POPUP_SETTLE_SECS)
        _hide_fake_cursor(driver)
        rect = _measure_rect(driver, dialog)
        # Take the full-viewport screenshot, then crop to the dialog.  Going
        # via PIL (rather than dialog.screenshot_as_png) avoids known
        # Selenium quirks with element screenshots on hidpi Chrome.
        png_full = driver.get_screenshot_as_png()
        png_cropped = _crop_screenshot_to_rect(png_full, rect, CROP_PADDING_PX)
        out_dir = _output_dir_for(plugin_name, out_root)
        os.makedirs(out_dir, exist_ok=True)
        image_name = "widget.png"
        image_path = os.path.join(out_dir, image_name)
        with open(image_path, "wb") as f:
            f.write(png_cropped)
        viewport = driver.execute_script(
            "return {width: window.innerWidth, height: window.innerHeight};"
        )
        _write_manifest(
            out_dir, plugin_name, image_name, browser, viewport
        )
        return {
            "status": "passed",
            "test": label,
            "error": "",
            "image_path": image_path,
        }
    except Exception as e:
        return {
            "status": "failed",
            "test": label,
            "error": str(e),
            "image_path": "",
        }
    finally:
        with contextlib.suppress(Exception):
            driver.execute_script(
                "window.localStorage.clear(); window.sessionStorage.clear();"
            )