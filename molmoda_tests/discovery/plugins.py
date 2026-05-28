"""
Discovers plugin IDs by scanning Vue source files for pluginId declarations.
"""

import glob
import re
import sys


def find_plugin_ids(
    src_glob: str = "./src/**/*Plugin.vue",
    argv: list[str] | None = None,
) -> list[tuple[str, int | None]]:
    """
    Return a sorted list of (plugin_id, sub_index) tuples.

    If command-line arguments are supplied (or argv is given), parse them to
    return only the requested plugin(s) and optional sub-index. Otherwise,
    discover all plugins by scanning Vue files matching `src_glob`.

    CLI arg format:  script.py [plugin_name ...] [sub_index (1-based int)]
    """
    args = argv if argv is not None else sys.argv[1:]

    if args:
        subjob_idx = None
        names: list[str] = []
        for arg in args:
            try:
                subjob_idx = int(arg) - 1
            except ValueError:
                names.append(arg)
        return [(name, subjob_idx) for name in names]

    plugin_ids: list[tuple[str, int | None]] = []
    for ts_file in glob.glob(src_glob, recursive=True):
        with open(ts_file) as f:
            content = f.read()
        match = re.search(r'[^:]\bpluginId *?= *?"(.+)"', content, re.MULTILINE)
        if match:
            plugin_ids.append((match[1], None))

    plugin_ids.sort()
    return plugin_ids


def filter_plugin_ids(
    plugin_ids: list[tuple[str, int | None]],
    browsers: list[str],
) -> list[tuple[str, int | None]]:
    """
    Remove plugins that are not compatible with the selected browsers.

    Currently removes:
      - 'simplemsg', 'testplugin', 'redo' from all browsers.
      - 'documentation' when Safari is in the browser list.
    """
    excluded_always = {"simplemsg", "testplugin", "redo"}

    filtered = [
        p for p in plugin_ids
        if not any(ex in p[0] for ex in excluded_always)
    ]

    if "safari" in browsers:
        filtered = [p for p in filtered if "documentation" not in p[0]]

    return filtered

def _plugin_id_to_source_map(
    src_glob: str = "./src/**/*Plugin.vue",
) -> dict[str, str]:
    """Map each discovered pluginId to the source text of its Vue file.

    Built once per call so screenshot filtering can inspect plugin source
    without re-globbing for every id.

    Args:
        src_glob: Glob pattern for Vue plugin source files.

    Returns:
        Dict mapping plugin_id -> full source text of the defining file.
    """
    id_to_source: dict[str, str] = {}
    for ts_file in glob.glob(src_glob, recursive=True):
        with open(ts_file) as f:
            content = f.read()
        match = re.search(r'[^:]\bpluginId *?= *?"(.+)"', content, re.MULTILINE)
        if match:
            id_to_source[match[1]] = content
    return id_to_source


def _has_no_popup(source: str) -> bool:
    """Check whether a plugin source declares ``noPopup = true``.

    Plugins with no popup expose nothing visual to screenshot, so they
    should be skipped by the docs-capture pipeline. Matches the same
    relaxed whitespace style used for pluginId detection.

    Args:
        source: Full source text of a Vue plugin file.

    Returns:
        True when the plugin disables its popup.
    """
    # Leading [^:] guard mirrors the pluginId regex: it prevents matches
    # on ``this.noPopup`` / ``self.noPopup`` references elsewhere in the
    # file, restricting the hit to the class-field declaration.
    return bool(
        re.search(r'[^:]\bnoPopup *?= *?true\b', source, re.MULTILINE)
    )


def _has_null_menu_path(source: str) -> bool:
    """Check whether a plugin source declares ``menuPath = null``.

    A null menuPath means the plugin is not user-invocable from a menu, so
    the test infrastructure has no menu-click path to drive it open for a
    screenshot. Skip these in the docs-capture pipeline.

    Args:
        source: Full source text of a Vue plugin file.

    Returns:
        True when the plugin has no menu path.
    """
    return bool(
        re.search(r'[^:]\bmenuPath *?= *?null\b', source, re.MULTILINE)
    )


def filter_capturable_plugin_ids(
    plugin_ids: list[tuple[str, int | None]],
    src_glob: str = "./src/**/*Plugin.vue",
) -> list[tuple[str, int | None]]:
    """Drop plugins that have no menu entry to capture.

    A plugin is uncapturable for docs only when it has ``menuPath = null``
    (no menu entry, so there is nothing visual to drive open and no menu
    image to show users).  Plugins with ``noPopup = true`` are kept: they
    don't have a popup widget, but they still have a menu entry that users
    need to find, so the menu screenshot and metadata are still valuable.
    The capture layer is responsible for branching on noPopup at runtime
    (read from the live plugin instance via the registry hook) to skip
    the modal-related work.

    Args:
        plugin_ids: Candidate (plugin_id, sub_index) tuples.
        src_glob: Glob pattern for Vue plugin source files.

    Returns:
        Filtered list preserving input order.
    """
    id_to_source = _plugin_id_to_source_map(src_glob)
    filtered: list[tuple[str, int | None]] = []
    for pid, sub_idx in plugin_ids:
        source = id_to_source.get(pid)
        if source is None:
            # If we can't locate the source (e.g. CLI-supplied id with no
            # matching file), keep it: the user asked for it explicitly.
            filtered.append((pid, sub_idx))
            continue
        if _has_null_menu_path(source):
            continue
        filtered.append((pid, sub_idx))
    return filtered