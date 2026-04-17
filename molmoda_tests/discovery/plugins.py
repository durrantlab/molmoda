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
