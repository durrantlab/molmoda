"""
Discovers tour-capable plugins by scanning Vue source files for non-trivial
getTests() implementations.

A plugin is considered tour-capable if its getTests() method contains more
than just ``return []`` or ``return [tests]`` with no prior test definitions,
i.e. it actually defines test steps that the tour system can convert into
driver.js guided steps.
"""

import glob
import re
import sys

from .plugins import find_plugin_ids


def find_tour_plugin_ids(
    src_glob: str = "./src/**/*Plugin.vue",
    argv: list[str] | None = None,
) -> list[str]:
    """Return a sorted list of plugin IDs that have non-trivial tours.

    If CLI arguments are provided (via ``argv`` or ``sys.argv[1:]``), those
    are treated as explicit plugin IDs to run and no discovery is performed.

    Args:
        src_glob: Glob pattern for Vue plugin source files.
        argv: Optional override for command-line arguments.

    Returns:
        A sorted list of plugin ID strings.
    """
    args = argv if argv is not None else sys.argv[1:]

    if args:
        return sorted(args)

    tour_ids: list[str] = []
    for ts_file in glob.glob(src_glob, recursive=True):
        with open(ts_file) as f:
            content = f.read()

        # Extract pluginId.
        id_match = re.search(
            r'[^:]\bpluginId *?= *?"(.+)"', content, re.MULTILINE
        )
        if not id_match:
            continue

        plugin_id = id_match[1]

        # Check whether getTests() is non-trivial.  We look for the method
        # body and reject plugins whose implementation only returns an empty
        # array (``return []``).
        if _has_nontrivial_tests(content):
            tour_ids.append(plugin_id)

    tour_ids.sort()
    return tour_ids


def _has_nontrivial_tests(source: str) -> bool:
    """Heuristic check for a non-trivial getTests() implementation.

    Looks for the ``getTests`` method and checks whether its body contains
    substantive test definitions rather than just returning an empty array.

    Args:
        source: The full source text of a Vue plugin file.

    Returns:
        True if the plugin appears to define real test steps.
    """
    # Find the getTests method.
    match = re.search(r'\bgetTests\b.*?\{', source, re.DOTALL)
    if not match:
        return False

    # Extract a rough method body by finding the content after the opening
    # brace.  We don't need a perfect parser; a heuristic suffices.
    body_start = match.end()
    body_snippet = source[body_start:body_start + 500]

    # Strip comments and whitespace for analysis.
    cleaned = re.sub(r'//.*', '', body_snippet)
    cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
    cleaned = cleaned.strip()

    # If the body immediately returns an empty array, there are no tours.
    if re.match(r'^return\s*\[\s*\]\s*;', cleaned):
        return False

    # If the snippet contains TestCmdList, pluginOpen, beforePluginOpens,
    # or afterPluginCloses, it almost certainly defines real test steps.
    tour_indicators = [
        'TestCmdList',
        'pluginOpen',
        'beforePluginOpens',
        'afterPluginCloses',
        'closePlugin',
    ]
    return any(indicator in body_snippet for indicator in tour_indicators)