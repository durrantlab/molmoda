import contextlib
import io
import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, TypedDict
from PIL import Image
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from ..elements import el
from ..drivers import make_driver
from .command_dispatch import dispatch_command
from .plugin_metadata import extract_plugin_info, IPluginInfo


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
# CSS selector for any open dropdown menu in the navbar.  When at least one
# matching element is visible, a menu is open and ready to be screenshotted
# as the "where to click to launch this plugin" reference image.
OPEN_MENU_SELECTOR = ".navbar-nav .dropdown-menu"
# Seconds to let a hover settle so the :hover style (background highlight)
# has time to apply before the screenshot is taken.  Bootstrap dropdowns
# transition quickly, but a small pause keeps things deterministic across
# browsers and DPRs.
HOVER_SETTLE_SECS = 0.15
# CSS selector for the top menu-bar container.  Kept visible in the masked
# menu screenshot alongside the open dropdown so users can see which
# top-level menu item belongs to the highlighted dropdown.
NAVBAR_SELECTOR = "#navbarSupportedContent"
# DEFAULT_DOCS_OUT_ROOT, OPEN_MENU_SELECTOR, HOVER_SETTLE_SECS,
# NAVBAR_SELECTOR) ...
# data-attribute used to mark elements (and their ancestor chain) that
# should remain visible while everything else is faded to opacity 0.
# Centralised here so the JS injector and the cleanup helper agree on it.
KEEP_ATTR = "data-docs-keep"
# id of the injected <style> element so we can find and remove it during
# cleanup without affecting any other page styles.
ISOLATION_STYLE_ID = "docs-capture-isolation"
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
    """One captured widget's metadata, written to manifest.json.

    ``menu_image`` is the filename of the menu screenshot (or None when no
    menu capture was produced).  ``plugin_info`` is the plugin's
    description / parameter metadata read from the live page; it's None
    when extraction failed (e.g. the test-only registry hook wasn't loaded).
    """
    plugin_id: str
    plugin_index: int | None
    image: str
    menu_image: str | None
    plugin_info: IPluginInfo | None
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


def _open_menu_is_visible(driver: Any) -> bool:
    """Return True when at least one navbar dropdown panel is on-screen.

    The capture loop uses this to decide whether the *current* pre-command
    DOM state is a worthwhile "menu screenshot" candidate.  A command whose
    pre-state has no open dropdown (e.g. the first menu-bar click, which
    opens a dropdown but is itself launched from a closed menu) is not a
    useful menu image and is skipped.
    """
    try:
        elements = driver.find_elements(By.CSS_SELECTOR, OPEN_MENU_SELECTOR)
        return any(e.is_displayed() for e in elements)
    except Exception:
        return False
def _hover_selector(driver: Any, selector: str) -> None:
    """Move the mouse over `selector` so its :hover style applies.

    Best-effort: hover failures (stale element, off-screen, etc.) are
    silently ignored because the screenshot is still useful without the
    highlight.  Selenium's ActionChains move_to_element triggers real
    mouseover events, which is what Bootstrap's dropdown-item styling
    keys off of.
    """
    try:
        elem = driver.find_element(By.CSS_SELECTOR, selector)
        ActionChains(driver).move_to_element(elem).perform()
        time.sleep(HOVER_SETTLE_SECS)
    except Exception:
        pass

def _expand_rect_to_top_full_width(driver: Any, rect: IRect) -> IRect:
    """Stretch a rect to span the full viewport width and reach y=0.

    Used for the menu screenshot so the crop includes the menu bar at the
    top of the screen and gives full horizontal context.  Height grows to
    cover the top of the viewport down to the dropdown's bottom edge plus
    ``CROP_PADDING_PX`` of breathing room below, so the dropdown doesn't
    sit flush against the image's bottom edge.
    """
    viewport_width = driver.execute_script("return window.innerWidth;")
    bottom = rect["y"] + rect["height"] + CROP_PADDING_PX
    return {
        "x": 0.0,
        "y": 0.0,
        "width": float(viewport_width),
        "height": float(bottom),
        "dpr": rect["dpr"],
    }
def _measure_element_rect(driver: Any, selector: str) -> IRect | None:
    """Measure the first visible element matching `selector`, or return None.

    Used to look up the navbar rect for masking.  Returns None when no
    visible match is found so the caller can degrade gracefully (skipping
    the mask) instead of failing the whole capture.
    """
    try:
        elements = driver.find_elements(By.CSS_SELECTOR, selector)
        for elem in elements:
            try:
                if not elem.is_displayed():
                    continue
                return _measure_rect(driver, elem)
            except Exception:
                continue
    except Exception:
        pass
    return None
def _mask_outside_rects(
    png_bytes: bytes,
    crop_rect: IRect,
    keep_rects: list[IRect],
) -> bytes:
    """Return PNG bytes with everything outside `keep_rects` painted white.

    Composites a white canvas of the same size as the cropped image, then
    pastes the original cropped image only inside the union of
    ``keep_rects``.  All rects are in CSS pixels relative to the viewport;
    they're translated into the cropped image's pixel space by subtracting
    the crop origin and multiplying by ``dpr``.

    Args:
        png_bytes: PNG bytes already cropped to ``crop_rect`` (i.e. the
            output of ``_crop_screenshot_to_rect``).
        crop_rect: The rect that ``png_bytes`` was cropped to.  Provides
            the origin used to translate ``keep_rects`` into image space.
        keep_rects: Rects (in viewport CSS pixels) whose contents should
            remain visible.  Anything outside their union becomes white.

    Returns:
        PNG bytes of the masked image.
    """
    src = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    canvas = Image.new("RGB", src.size, (255, 255, 255))
    dpr = crop_rect["dpr"] or 1.0
    # Origin of the crop in device pixels.  Subtracted from keep-rect
    # coordinates to translate them into the cropped image's space.
    crop_left_dev = int(crop_rect["x"] * dpr)
    crop_top_dev = int(crop_rect["y"] * dpr)
    for r in keep_rects:
        left = max(0, int(r["x"] * dpr) - crop_left_dev)
        top = max(0, int(r["y"] * dpr) - crop_top_dev)
        right = min(src.width, int((r["x"] + r["width"]) * dpr) - crop_left_dev)
        bottom = min(src.height, int((r["y"] + r["height"]) * dpr) - crop_top_dev)
        if right <= left or bottom <= top:
            continue
        region = src.crop((left, top, right, bottom))
        canvas.paste(region, (left, top))
    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
def _isolate_elements(driver: Any, keep_selectors: list[str]) -> None:
    """Fade everything except `keep_selectors` (and their ancestors) to opacity 0.

    See prior docstring for rationale.  The injected stylesheet also forces
    ``html`` and ``body`` to a pure-white background so the faded pixels
    don't reveal whatever the app's normal canvas color is.  Both <html>
    and <body> are pinned because some apps (and some browser defaults)
    paint the root element's background rather than body's.
    """
    script = """
    const selectors = arguments[0];
    const KEEP_ATTR = arguments[1];
    const STYLE_ID = arguments[2];
    document.querySelectorAll('[' + KEEP_ATTR + ']').forEach(
        e => e.removeAttribute(KEEP_ATTR)
    );
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.setAttribute(KEEP_ATTR, '');
            el.querySelectorAll('*').forEach(
                d => d.setAttribute(KEEP_ATTR, '')
            );
            let p = el.parentElement;
            while (p) {
                p.setAttribute(KEEP_ATTR, '');
                p = p.parentElement;
            }
        });
    });
    let style = document.getElementById(STYLE_ID);
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }
    style.textContent =
        'html, body { background: #ffffff !important; ' +
        '              background-color: #ffffff !important; ' +
        '              background-image: none !important; }' +
        'body *:not([' + KEEP_ATTR + ']) { opacity: 0 !important; }';
    """
    driver.execute_script(script, keep_selectors, KEEP_ATTR, ISOLATION_STYLE_ID)
def _unisolate_elements(driver: Any) -> None:
    """Undo `_isolate_elements`: remove the stylesheet and clear keep marks.

    Best-effort -- silently no-ops if the stylesheet was never injected.
    Called after each screenshot so subsequent test commands run against
    a normally-styled page.
    """
    script = """
    const KEEP_ATTR = arguments[0];
    const STYLE_ID = arguments[1];
    const style = document.getElementById(STYLE_ID);
    if (style) { style.remove(); }
    document.querySelectorAll('[' + KEEP_ATTR + ']').forEach(
        e => e.removeAttribute(KEEP_ATTR)
    );
    """
    with contextlib.suppress(Exception):
        driver.execute_script(script, KEEP_ATTR, ISOLATION_STYLE_ID)
def _capture_open_menu_png(driver: Any) -> bytes | None:
    """Screenshot the open dropdown + menu bar with the rest faded out.

    Picks the largest visible ``.navbar-nav .dropdown-menu`` to anchor the
    crop, then uses CSS isolation (via ``_isolate_elements``) to hide
    everything except the navbar and the open dropdown.  The screenshot
    is then cropped to span the full viewport width from y=0 down through
    the dropdown's bottom edge, giving the menu bar context above.

    CSS isolation is more reliable than PIL masking: the browser does the
    layout and we screenshot the already-cleaned-up DOM, so there's no
    coordinate drift between mask and pixels.

    Returns None when no dropdown is visible at call time.
    """
    try:
        elements = driver.find_elements(By.CSS_SELECTOR, OPEN_MENU_SELECTOR)
        visible = [e for e in elements if e.is_displayed()]
        if not visible:
            return None
        # Among visible dropdowns, pick the one with the largest area.  For
        # nested submenus this favors the most-recently-opened panel because
        # it's the one currently spanning the most pixels.  For single-level
        # menus there's only one candidate, so the choice is trivial.
        def _area(elem: Any) -> float:
            r = driver.execute_script(
                "const r = arguments[0].getBoundingClientRect(); "
                "return {w: r.width, h: r.height};",
                elem,
            )
            return r["w"] * r["h"]
        target = max(visible, key=_area)
        _hide_fake_cursor(driver)
        # Isolate the dropdown and navbar before measuring/screenshotting.
        # The dropdown selector is OPEN_MENU_SELECTOR (matches all visible
        # dropdowns, which is fine -- only the open one was visible to begin
        # with, and submenu chains stay marked together).
        _isolate_elements(driver, [OPEN_MENU_SELECTOR, NAVBAR_SELECTOR])
        try:
            dropdown_rect = _measure_rect(driver, target)
            expanded = _expand_rect_to_top_full_width(driver, dropdown_rect)
            png_full = driver.get_screenshot_as_png()
            return _crop_screenshot_to_rect(png_full, expanded, 0)
        finally:
            _unisolate_elements(driver)
    except Exception:
        return None
def _drive_until_popup_visible(
    driver: Any,
    plugin_id: str,
    cmds: list[dict[str, object]],
) -> tuple[int, bytes | None]:
    """Execute commands until the modal is visible, capturing the open menu.

    Walks the command sequence emitted by the TS test infrastructure.  For
    each command, if a navbar dropdown is currently open AND the command is
    a click whose target lives inside that dropdown, we hover the target to
    trigger its :hover style and screenshot the menu *before* dispatching
    the click.  The most recent such screenshot is returned alongside the
    command index that opened the modal, so the caller can persist it as
    ``menu.png``.

    Hovering only the *click* commands (and only when a menu is already
    open) skips uninteresting pre-states like the very first menu-bar
    click, whose pre-state has no dropdown visible at all.

    Returns:
        (commands_executed, menu_png_bytes).  ``menu_png_bytes`` is None
        when no command's pre-state showed an open dropdown -- e.g. plugins
        whose test infra opens the popup without traversing a menu.
    """
    modal_selector = f"#modal-{plugin_id}"
    menu_png: bytes | None = None
    for cmd_idx, cmd in enumerate(cmds):
        # addTests must never be dispatched; it's a meta-instruction that
        # tells the orchestrator to enumerate sub-tests.  If we hit one here,
        # something is wrong with the assumption that this is a single test.
        if cmd["cmd"] == "addTests":
            raise Exception(
                f"Encountered addTests for {plugin_id}; sub-index required."
            )
        # Capture the menu state *before* dispatching this command, but
        # only when (a) a dropdown is currently open and (b) the command
        # is a click whose selector exists inside that dropdown.  This
        # filters out clicks on menubar headers (their pre-state has no
        # open dropdown) and non-click commands (waits, regex checks).
        if cmd["cmd"] == "click" and _open_menu_is_visible(driver):
            selector = cmd.get("selector")
            if isinstance(selector, str) and selector:
                _hover_selector(driver, selector)
                candidate = _capture_open_menu_png(driver)
                if candidate is not None:
                    menu_png = candidate
        dispatch_command(driver, cmd)
        # After each command, check whether the modal is now displayed.  We
        # poll the DOM directly rather than waiting on a single command,
        # because the popup typically appears after the menu-item click but
        # before any pluginOpen commands run.
        if _is_modal_visible(driver, modal_selector):
            return cmd_idx + 1, menu_png
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
    menu_image_name: str | None,
    plugin_info: IPluginInfo | None,
    browser: str,
    viewport: dict[str, int],
) -> None:
    """Write manifest.json describing the captured widget.

    ``plugin_info`` carries the live-extracted description and parameter
    metadata for the plugin so the docs site can render per-plugin pages
    without re-parsing the source tree.  Stored as None on extraction
    failure rather than omitted, so manifest consumers can tell "no info"
    apart from "field forgotten."
    """
    entry: IManifestEntry = {
        "plugin_id": plugin_id,
        "plugin_index": None,
        "image": image_name,
        "menu_image": menu_image_name,
        "plugin_info": plugin_info,
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
    """Capture cropped screenshots of a plugin's popup and its launching menu.

    Also extracts the plugin's live metadata (title, menuPath, intro,
    details, tags, hotkey, userArgs) from the test-only registry hook on
    ``window.__molmodaLoadedPlugins`` and writes it into the manifest so
    the docs site can render per-plugin pages without re-parsing source.
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
        _, menu_png = _drive_until_popup_visible(driver, plugin_name, cmds)
        dialog = _wait_for_modal_dialog(driver, plugin_name)
        time.sleep(POPUP_SETTLE_SECS)
        _hide_fake_cursor(driver)
        # Extract plugin metadata *before* isolating the modal: the
        # isolation stylesheet doesn't affect data reads, but doing it
        # here keeps the JS-context state simple (no opacity-mutated DOM
        # at extraction time) and lets the failure path skip the
        # screenshot work below.
        plugin_info = extract_plugin_info(driver, plugin_name)
        modal_selector = f"#modal-{plugin_name}"
        _isolate_elements(driver, [modal_selector])
        try:
            rect = _measure_rect(driver, dialog)
            png_full = driver.get_screenshot_as_png()
            png_cropped = _crop_screenshot_to_rect(
                png_full, rect, CROP_PADDING_PX
            )
        finally:
            _unisolate_elements(driver)
        out_dir = _output_dir_for(plugin_name, out_root)
        os.makedirs(out_dir, exist_ok=True)
        image_name = "widget.png"
        image_path = os.path.join(out_dir, image_name)
        with open(image_path, "wb") as f:
            f.write(png_cropped)
        # Persist the menu screenshot when we captured one.  Writing it
        # under the same plugin directory keeps the docs assets per-plugin
        # and lets a manifest consumer load both images with one lookup.
        menu_image_name: str | None = None
        if menu_png is not None:
            menu_image_name = "menu.png"
            with open(os.path.join(out_dir, menu_image_name), "wb") as f:
                f.write(menu_png)
        viewport = driver.execute_script(
            "return {width: window.innerWidth, height: window.innerHeight};"
        )
        _write_manifest(
            out_dir, plugin_name, image_name, menu_image_name,
            plugin_info, browser, viewport,
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