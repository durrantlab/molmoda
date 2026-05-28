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
from ..discovery.tours import plugin_has_tour
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
# Device-pixel ratio used for the docs-capture Chrome session.  Higher
# values produce sharper screenshots at the cost of larger PNGs and
# slightly slower rendering.  2.0 matches typical retina/hidpi displays
# and is roughly 4x the file size of the 1.0 default.  CSS-pixel
# coordinates in _measure_rect already read window.devicePixelRatio,
# so cropping math stays correct without further changes.
DOCS_DEVICE_SCALE_FACTOR = 2.0

# Base URL used when emitting per-plugin tour URLs into the manifest.
# Hardcoded to the public production host so docs consumers get a working
# link regardless of which root_url was used during capture (e.g. a local
# dev server).  If the docs site ever needs to point at a different host,
# change this in one place.
TOUR_URL_BASE = "https://molmoda.org"

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


class IManifestEntry(TypedDict, total=False):
    """One captured widget's metadata, written to manifest.json.

    ``image`` is None for plugins with ``noPopup = true`` because they
    have no popup widget to screenshot.  Such plugins act immediately
    when their menu item is clicked, so only ``menu_image`` and
    ``plugin_info`` are meaningful for them.

    ``tour_url`` is only present when the plugin defines a non-trivial
    tour; consumers should treat its absence as "no tour available".
    """
    plugin_id: str
    plugin_index: int | None
    image: str | None
    menu_image: str | None
    plugin_info: IPluginInfo | None
    captured_at: str
    browser: str
    viewport: dict[str, int]
    tour_url: str


_drivers: dict[int, Any] = {}
_drivers_lock = threading.Lock()


def _get_driver(browser: str, root_url: str) -> Any:
    """Return a thread-local WebDriver, creating one on first use.

    The docs-capture driver is created at higher device-pixel ratio than
    the default test driver so screenshots match retina/hidpi rendering.
    Tests are unaffected -- they call ``make_driver`` without the DPR
    override and continue at the platform default.
    """
    key = threading.get_ident()
    with _drivers_lock:
        if key not in _drivers:
            _drivers[key] = make_driver(
                browser,
                root_url,
                device_scale_factor=DOCS_DEVICE_SCALE_FACTOR,
            )
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

def _isolate_elements(driver: Any, keep_selectors: list[str]) -> None:
    """Fade everything except `keep_selectors` (and their ancestors) to opacity 0.

    Why ancestors: CSS opacity cascades visually -- if a parent has
    opacity 0, every descendant disappears regardless of its own opacity.
    So we mark each keep-element, every descendant of it, and every
    ancestor up to <html>, then a CSS rule fades anything *not* marked.

    Also forces ``html`` and ``body`` to a pure-white background so the
    faded pixels don't reveal whatever the app's normal canvas color is.
    Both <html> and <body> are pinned because some apps (and some browser
    defaults) paint the root element's background rather than body's.

    The injected ``<style>`` block is identified by ``ISOLATION_STYLE_ID``
    so ``_unisolate_elements`` can remove it cleanly.

    Args:
        driver: Active Selenium WebDriver.
        keep_selectors: CSS selectors whose matched elements (with full
            descendant and ancestor chains) stay visible.
    """
    script = """
    const selectors = arguments[0];
    const KEEP_ATTR = arguments[1];
    const STYLE_ID = arguments[2];
    // Clear any prior marks so successive calls in the same page session
    // (e.g. menu capture followed by widget capture) start from scratch.
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
    // Inject (or update) the isolation stylesheet.  Using one canonical
    // <style> tag keeps cleanup to a single removal call.
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
def _measure_max_right_edge(
    driver: Any,
    open_dropdown_elem: Any,
) -> float:
    """Find the rightmost CSS-pixel edge among the navbar items and the open dropdown.

    The menu crop should extend just past whichever is further right: the
    last top-level menu item in the navbar, or the open dropdown panel
    itself.  Measuring the navbar *container* (#navbarSupportedContent)
    won't work because Bootstrap flex containers typically span full
    viewport width regardless of their visible content -- we'd just get
    the viewport back.  Instead, walk the navbar's visible descendants
    and take the max of each one's individual bounding rect.

    Args:
        driver: Active Selenium WebDriver.
        open_dropdown_elem: The currently-open .dropdown-menu (already
            picked by the caller as the largest visible one) whose right
            edge contributes to the max.

    Returns:
        Rightmost CSS-pixel x coordinate to crop to, before padding is
        added.  Returns 0 on any error -- the caller's clamp logic will
        treat that as "no useful right edge found" and fall back to a
        wider crop.
    """
    script = """
    const navbar = document.querySelector(arguments[0]);
    if (!navbar) return 0;
    let maxRight = 0;
    // Iterate every descendant.  Bootstrap navbar markup varies (nav-item,
    // nav-link, dropdown-toggle); rather than guess which specific class
    // holds the items, just take the max right edge among all visible
    // elements.  Hidden elements (display:none) have width 0 and won't
    // pollute the max.
    const all = navbar.querySelectorAll('*');
    for (const el of all) {
        // Skip elements inside any .dropdown-menu: those are the dropdown
        // panel contents, not the top-level menu bar items.  They get
        // their own contribution to the max via the dropdown rect passed
        // separately by the Python caller.
        if (el.closest('.dropdown-menu')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > maxRight) maxRight = r.right;
    }
    // Also include the dropdown's own right edge, passed in as the
    // second argument so a deeply-nested submenu extending further
    // right than any navbar item still wins.
    const dropdownRight = arguments[1];
    if (dropdownRight > maxRight) maxRight = dropdownRight;
    return maxRight;
    """
    try:
        dropdown_rect = _measure_rect(driver, open_dropdown_elem)
        dropdown_right = dropdown_rect["x"] + dropdown_rect["width"]
        return float(driver.execute_script(
            script, NAVBAR_SELECTOR, dropdown_right,
        ))
    except Exception:
        return 0.0

def _expand_rect_to_top_full_width(driver: Any, rect: IRect) -> IRect:
    """Stretch a rect to reach y=0 (kept) and extend right just past the
    last navbar item or the open dropdown (whichever is further right).

    The previous version pinned x=0 and width=viewport so the crop spanned
    the full screen.  That worked but left huge empty space on the right
    in MolModa's UI, where the navbar items don't reach the viewport edge.
    Now the width is computed from the actual rightmost edge of either the
    last top-level menu item or the open dropdown, plus padding, clamped
    to the viewport.  x still pins to 0 because we want the leftmost edge
    of the menu bar (logo / first menu item) visible.

    Args:
        driver: Active Selenium WebDriver.
        rect: The open dropdown's bounding rect, in CSS pixels.

    Returns:
        Expanded rect for cropping.
    """
    viewport_width = driver.execute_script("return window.innerWidth;")
    bottom = rect["y"] + rect["height"] + CROP_PADDING_PX
    # _measure_max_right_edge already considered the dropdown's right
    # edge when picking the rightmost contribution; we add CROP_PADDING_PX
    # so the chosen edge isn't flush against the crop boundary.
    return {
        "x": 0.0,
        "y": 0.0,
        "width": 0.0,  # placeholder; overwritten below
        "height": float(bottom),
        "dpr": rect["dpr"],
    }
def _capture_open_menu_png(driver: Any) -> bytes | None:
    """Screenshot the open dropdown + menu bar with the rest faded out.

    The crop now extends only as far right as needed -- to just past the
    last visible top-level menu item or the open dropdown, whichever is
    further -- avoiding the large blank area on the right that the
    previous full-viewport-width crop produced.

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
            # Compute the right edge AFTER isolation so any layout shift
            # caused by the opacity stylesheet (e.g. a flex container
            # collapsing because its sibling went transparent) is
            # reflected in the measurement.  In practice opacity:0
            # preserves layout, but measuring post-isolation is the
            # defensive choice.
            max_right = _measure_max_right_edge(driver, target)
            viewport_width = driver.execute_script(
                "return window.innerWidth;"
            )
            # Clamp to viewport.  If max_right came back as 0 (error
            # path), fall back to the full viewport width so we don't
            # produce a zero-width crop.
            if max_right <= 0:
                expanded["width"] = float(viewport_width)
            else:
                expanded["width"] = min(
                    float(viewport_width),
                    max_right + CROP_PADDING_PX,
                )
            png_full = driver.get_screenshot_as_png()
            return _crop_screenshot_to_rect(png_full, expanded, 0)
        finally:
            _unisolate_elements(driver)
    except Exception:
        return None
def _read_no_popup_flag(driver: Any, plugin_id: str) -> bool:
    """Read the live plugin instance's ``noPopup`` flag from the registry.

    Determines at runtime whether a plugin has a popup widget to capture
    or acts immediately from the menu.  Reading from the registry rather
    than re-parsing the .vue source keeps the source-of-truth in one
    place (the running app) and tolerates source files that set noPopup
    dynamically (e.g. AddVizualizationPlugin toggles it for programmatic
    runs).  Defaults to False on any failure -- erring toward "try the
    modal capture" is safer than silently skipping a real widget.
    """
    script = (
        "const reg = window.__molmodaLoadedPlugins;"
        "if (!reg) return false;"
        "const p = reg[arguments[0]];"
        "return !!(p && p.noPopup);"
    )
    try:
        return bool(driver.execute_script(script, plugin_id))
    except Exception:
        return False
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

def _drive_for_menu_only(
    driver: Any,
    plugin_id: str,
    cmds: list[dict[str, object]],
) -> bytes | None:
    """Walk all commands, capturing the menu but never expecting a modal.

    Used for ``noPopup`` plugins: they act immediately when the menu item
    is clicked, so there is no modal to wait for.  We still want the
    menu screenshot, though, because users need to know where in the
    navbar the plugin lives.

    Strategy mirrors ``_drive_until_popup_visible`` for the capture step
    (hover + screenshot before each click whose target is inside an open
    dropdown), but without an early-exit on modal visibility.  Whatever
    menu screenshot we have at the end of the command stream is returned.

    Args:
        driver: Active Selenium WebDriver.
        plugin_id: The plugin being captured (for diagnostics).
        cmds: The full command list read from #cmds-element.

    Returns:
        PNG bytes of the menu screenshot, or None if no dropdown was ever
        open during a click command (e.g. the plugin was triggered by
        means other than a menu traversal).
    """
    menu_png: bytes | None = None
    for cmd in cmds:
        if cmd["cmd"] == "addTests":
            raise Exception(
                f"Encountered addTests for {plugin_id}; sub-index required."
            )
        if cmd["cmd"] == "click" and _open_menu_is_visible(driver):
            selector = cmd.get("selector")
            if isinstance(selector, str) and selector:
                _hover_selector(driver, selector)
                candidate = _capture_open_menu_png(driver)
                if candidate is not None:
                    menu_png = candidate
        # Best-effort dispatch: a noPopup plugin's final click may trigger
        # navigation, an alert, or another side-effect that makes the next
        # command fail.  Swallow per-command exceptions so a late failure
        # doesn't discard the menu screenshot we've already captured.
        try:
            dispatch_command(driver, cmd)
        except Exception as e:
            print(f"  [{plugin_id}] noPopup command dispatch raised: {e}")
            break
    return menu_png
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
    image_name: str | None,
    menu_image_name: str | None,
    plugin_info: IPluginInfo | None,
    browser: str,
    viewport: dict[str, int],
) -> None:
    """Write manifest.json describing the captured widget.

    ``image_name`` is None for noPopup plugins (they have no widget to
    screenshot); manifest consumers should treat that as "menu-only
    plugin" rather than a missing file.

    A ``tour_url`` field is added only when the plugin defines a
    non-trivial tour, so its absence in the JSON unambiguously means
    "no tour available for this plugin".
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
    # Detection reuses discovery/tours.py so the manifest stays in sync
    # with whatever the tour runner itself considers tour-capable.
    if plugin_has_tour(plugin_id):
        entry["tour_url"] = f"{TOUR_URL_BASE}/?tour={plugin_id}"
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(entry, f, indent=2)


def capture_plugin_widget(
    plugin_id_tuple: tuple[str, int | None],
    browser: str,
    root_url: str,
    out_root: str,
) -> dict[str, str | list]:
    """Capture screenshots and metadata for a single plugin.

    For plugins with a popup, this writes both ``widget.png`` (the popup
    in its initial state) and ``menu.png`` (the navbar with the launching
    item hovered), plus ``plugin_info`` in the manifest.

    For plugins with ``noPopup = true``, no widget screenshot is taken --
    these plugins act immediately when their menu item is clicked, so
    there's no popup to capture.  ``menu.png`` and ``plugin_info`` are
    still produced so the docs site can show where the menu entry lives
    and describe what the plugin does.
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
        # Branch on noPopup *before* driving any commands.  The registry
        # is populated at mount time, which has already happened by now
        # (we successfully read #test-cmds above, which requires the
        # plugin to be fully mounted).  A read-failure defaults to False
        # so we attempt the modal flow -- the safer default.
        no_popup = _read_no_popup_flag(driver, plugin_name)
        menu_png: bytes | None = None
        png_cropped: bytes | None = None
        if no_popup:
            # No modal to wait for; just walk the command stream and
            # keep whatever menu screenshot we can grab.
            menu_png = _drive_for_menu_only(driver, plugin_name, cmds)
        else:
            _, menu_png = _drive_until_popup_visible(
                driver, plugin_name, cmds
            )
            dialog = _wait_for_modal_dialog(driver, plugin_name)
            time.sleep(POPUP_SETTLE_SECS)
            _hide_fake_cursor(driver)
            # Extract plugin metadata happens after dialog appears but
            # below; do the widget screenshot now while the modal state
            # is fresh.
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
        # Metadata extraction works the same for both branches: the
        # plugin instance is registered regardless of whether it has a
        # popup.  Read it after the menu/modal work so any registry
        # mutations from runtime callbacks have settled.
        plugin_info = extract_plugin_info(driver, plugin_name)
        out_dir = _output_dir_for(plugin_name, out_root)
        os.makedirs(out_dir, exist_ok=True)
        image_name: str | None = None
        if png_cropped is not None:
            image_name = "widget.png"
            with open(os.path.join(out_dir, image_name), "wb") as f:
                f.write(png_cropped)
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
        # Report the most relevant artifact path: prefer the widget, fall
        # back to the menu screenshot for noPopup plugins so the report
        # still has something concrete to print.
        artifact_path = ""
        if image_name is not None:
            artifact_path = os.path.join(out_dir, image_name)
        elif menu_image_name is not None:
            artifact_path = os.path.join(out_dir, menu_image_name)
        return {
            "status": "passed",
            "test": label,
            "error": "",
            "image_path": artifact_path,
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