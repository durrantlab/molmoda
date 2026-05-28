"""
Runtime extraction of plugin metadata from the live page.

After ``capture_plugin_widget`` has opened a plugin's modal, the plugin's
Vue class instance is registered in ``window.__molmodaLoadedPlugins`` (the
test-only hook in ``LoadedPlugins.ts``).  This module asks the browser for
that instance's static fields and serialises them into a JSON-safe dict
suitable for embedding in ``manifest.json`` so the docs site can render
per-plugin descriptions without re-parsing the source tree.

Why runtime extraction (vs. regex or AST parsing):
    * Vue has already instantiated the class -- the values in memory are the
      source of truth.  No parser can be more accurate.
    * Function-valued fields (filterFunc, validateFunc, warningFunc) drop
      out naturally during JSON serialisation; we record their names under
      ``_dynamic_fields`` so consumers know they exist without trying to
      represent code in JSON.
    * Tag enum values are plain strings (e.g. ``Tag.Docking === "docking"``),
      so they round-trip cleanly.
"""
from typing import Any, TypedDict
# JS snippet executed in the page context.  It walks the loaded-plugins
# registry, pulls the requested plugin's class instance, and returns a
# JSON-safe summary.  HTML stripping uses DOMParser so we get the same
# whitespace handling browsers use natively -- safer than a regex that
# might mangle nested tags or entities.
_EXTRACT_JS = r"""
const pluginId = arguments[0];
const reg = window.__molmodaLoadedPlugins;
if (!reg) {
    return {error: 'registry missing: was the test-only hook added to LoadedPlugins.ts?'};
}
const plugin = reg[pluginId];
if (!plugin) {
    return {error: 'plugin not in registry: ' + pluginId};
}
// Build a reverse-lookup map from window.__molmodaEnums.  For each
// registered enum, walk its keys: TS numeric enums emit both forward
// (Name -> number) AND reverse (number -> "Name") entries on the same
// object, so we collect only the reverse direction (where the key is
// a stringified integer).  String enums skip this entirely; their val
// keys are non-numeric and already human-readable in the source.
//
// The lookup table maps "enumName.numericVal" -> "enumName.MemberName"
// AND tracks which numeric values appear in which enums, so the
// substitution step can find candidates by raw number alone.
const enumRegistry = window.__molmodaEnums || {};
const numericToEnumMembers = {};  // {num: [{enum: 'UserArgType', name: 'Text'}, ...]}
for (const enumName of Object.keys(enumRegistry)) {
    const enumObj = enumRegistry[enumName];
    if (!enumObj || typeof enumObj !== 'object') continue;
    for (const k of Object.keys(enumObj)) {
        // Reverse-lookup entries have integer-string keys ("0", "1", ...)
        // pointing to the member name (a string).
        if (/^\d+$/.test(k) && typeof enumObj[k] === 'string') {
            const num = parseInt(k, 10);
            if (!numericToEnumMembers[num]) numericToEnumMembers[num] = [];
            numericToEnumMembers[num].push({
                enum: enumName,
                name: enumObj[k],
            });
        }
    }
}
// Translate a numeric value into a "EnumName.MemberName" string when
// exactly one registered enum has that integer.  Ambiguous numbers
// (two different enums both define a member at value 3) get
// disambiguated by hintEnumName if provided -- e.g. the arg's `type`
// field is always a UserArgType, so we pass that hint and skip other
// enums' coincidental entries.  Returns null when no match is found,
// signalling "leave the raw number alone."
function lookupEnumName(num, hintEnumName) {
    const candidates = numericToEnumMembers[num] || [];
    if (candidates.length === 0) return null;
    if (hintEnumName) {
        const hit = candidates.find(c => c.enum === hintEnumName);
        if (hit) return hit.enum + '.' + hit.name;
    }
    if (candidates.length === 1) {
        return candidates[0].enum + '.' + candidates[0].name;
    }
    // Ambiguous and no hint: pick the first deterministically rather
    // than dropping the substitution.  The alternative (leaving a raw
    // number) is less useful for docs; the alternative (skipping)
    // would silently fail for plugins whose enums collide.
    return candidates[0].enum + '.' + candidates[0].name;
}
function stripHtml(s) {
    if (s === null || s === undefined) return null;
    if (typeof s !== 'string') return s;
    const doc = new DOMParser().parseFromString(s, 'text/html');
    const text = doc.body.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
}
function normaliseMenuPath(mp) {
    if (mp === null || mp === undefined) return null;
    if (Array.isArray(mp)) return mp.join('/');
    return mp;
}
function summariseValue(v, dynamicKeys, path) {
    if (v === null) return null;
    const t = typeof v;
    if (t === 'function') { dynamicKeys.push(path); return undefined; }
    if (t === 'undefined') return undefined;
    if (t === 'string' || t === 'boolean') return v;
    if (t === 'number') {
        // Try to map raw numbers back to enum names.  No hint here
        // because we don't know what role this number plays in the
        // nested context (could be an enum, could be a real number
        // like padding=3.4).  Only substitute on integers and only
        // when the registry actually has a match; otherwise leave
        // the number untouched.
        if (Number.isInteger(v)) {
            const enumName = lookupEnumName(v, null);
            if (enumName !== null) return enumName;
        }
        return v;
    }
    if (t === 'bigint' || t === 'symbol') return String(v);
    if (Array.isArray(v)) {
        const out = [];
        v.forEach((item, i) => {
            const summarised = summariseValue(item, dynamicKeys, path + '[' + i + ']');
            if (summarised !== undefined) out.push(summarised);
        });
        return out;
    }
    if (t === 'object') {
        const proto = Object.getPrototypeOf(v);
        if (proto !== Object.prototype && proto !== null) {
            return {__class__: v.constructor ? v.constructor.name : 'unknown'};
        }
        const out = {};
        for (const k of Object.keys(v)) {
            const summarised = summariseValue(v[k], dynamicKeys, path + '.' + k);
            if (summarised !== undefined) out[k] = summarised;
        }
        return out;
    }
    return null;
}
function summariseArg(arg) {
    const dynamicKeys = [];
    const keep = [
        'id', 'label', 'description', 'placeHolder', 'val', 'type',
        'min', 'max', 'step', 'options', 'inputType', 'alertType',
        'enabled',
    ];
    const out = {};
    for (const k of keep) {
        if (k in arg) {
            const summarised = summariseValue(arg[k], dynamicKeys, k);
            if (summarised !== undefined) out[k] = summarised;
        }
    }
    // The arg's `type` field is *always* UserArgType.  Re-process it
    // with that hint so a numeric collision with another enum (e.g.
    // some other enum also has a member at value 0) can't misroute it.
    // If `type` was absent on the arg, we leave the slot empty.
    if (typeof arg.type === 'number' && Number.isInteger(arg.type)) {
        const typed = lookupEnumName(arg.type, 'UserArgType');
        if (typed !== null) out.type = typed;
    }
    const functionKeys = [
        'filterFunc', 'validateFunc', 'warningFunc',
    ];
    for (const k of functionKeys) {
        if (typeof arg[k] === 'function') dynamicKeys.push(k);
    }
    if (dynamicKeys.length) out._dynamic_fields = Array.from(new Set(dynamicKeys));
    if (typeof out.description === 'string') {
        out.description = stripHtml(out.description);
    }
    return out;
}
const args = Array.isArray(plugin.userArgs) ? plugin.userArgs : [];
return {
    plugin_id: plugin.pluginId,
    title: plugin.title || null,
    menu_path: normaliseMenuPath(plugin.menuPath),
    intro: stripHtml(plugin.intro),
    details: stripHtml(plugin.details),
    tags: Array.isArray(plugin.tags) ? plugin.tags.slice() : [],
    hotkey: plugin.hotkey || null,
    user_args: args.map(summariseArg),
};
"""
class IUserArgSummary(TypedDict, total=False):
    """JSON-safe summary of a single UserArg.

    Static fields are copied verbatim; function-valued fields like
    ``filterFunc`` and ``validateFunc`` are dropped during serialisation
    and listed under ``_dynamic_fields`` so docs consumers know they
    exist without needing to represent code.
    """
    id: str
    label: str
    description: str | None
    placeHolder: str
    val: object
    type: str
    min: float
    max: float
    step: float
    options: list[dict[str, object]]
    inputType: str
    alertType: str
    enabled: bool
    _dynamic_fields: list[str]
class IPluginInfo(TypedDict):
    """Plugin metadata recorded in the manifest under ``plugin_info``.

    ``menu_path`` is normalised to a single string (or None) regardless
    of whether the source declared it as ``string``, ``string[]``, or
    ``null``.  ``intro`` and ``details`` are HTML-stripped plain text.
    """
    plugin_id: str
    title: str | None
    menu_path: str | None
    intro: str | None
    details: str | None
    tags: list[str]
    hotkey: str | list[str] | None
    user_args: list[IUserArgSummary]
def extract_plugin_info(driver: object, plugin_id: str) -> IPluginInfo | None:
    """Read live plugin metadata from the page and return a JSON-safe dict.

    The plugin must already be registered in ``window.__molmodaLoadedPlugins``
    -- which happens automatically once the page has loaded with ``?test=``,
    via the test-only hook at the bottom of ``LoadedPlugins.ts``.  Failures
    return None and print a diagnostic; we don't raise because a missing
    description shouldn't abort a multi-hour batch capture.

    Args:
        driver: Active Selenium WebDriver.
        plugin_id: The plugin id whose metadata to extract.

    Returns:
        The plugin's metadata, or None if extraction failed.
    """
    try:
        result = driver.execute_script(_EXTRACT_JS, plugin_id)  # type: ignore[attr-defined]
    except Exception as e:
        print(f"  [{plugin_id}] plugin info extraction raised: {e}")
        return None
    if not isinstance(result, dict):
        print(f"  [{plugin_id}] plugin info extraction returned {type(result).__name__}")
        return None
    if "error" in result:
        print(f"  [{plugin_id}] plugin info extraction error: {result['error']}")
        return None
    return result  # type: ignore[return-value]