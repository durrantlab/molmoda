# Simple validation of some biotite-specific issues.

import json
import glob
import re
import os

print("Running validate.py\n")


def add_error(filename, msg):
    global errors
    filename = filename.replace("../src/", "@/")
    errors.append(f"{filename}: {msg}")


def validate_plugin(ts_file):
    # ts_file is a plugin

    # It must end in Plugin.vue
    if not ts_file.endswith("Plugin.vue"):
        add_error(
            ts_file,
            'All files containing plugins must end in "Plugin.vue"',
        )

    required_substrs = [
        (
            ':userArgs="userArgs"',
            'The PluginComponent must define a userArgs prop like this: :userArgs="userArgs"',
            None,
        ),
        (
            'v-model="open"',
            'The PluginComponent must define a v-model like this: v-model="open"',
            [
                "RenameMolPlugin.vue",
                "DeleteMolPlugin.vue",
                "CloneExtractMolPlugin.vue",
            ],
        ),
        (
            'title="',
            'The PluginComponent must define a title like this: title="My Plugin"',
            None,
        ),
        (
            ':pluginId="pluginId"',
            'The PluginComponent must define a pluginId prop like this: :pluginId="pluginId"',
            None,
        ),
        (
            "extends PluginParentClass",
            "All plugins must extend PluginParentClass",
            None,
        ),
        (
            "<PluginComponent",
            "All plugins must use the PluginComponent component",
            None,
        ),
    ]

    if "noPopup = true" not in content:
        required_substrs.append(
            (
                '@onPopupDone="onPopupDone"',
                'The PluginComponent must define an onPopupDone event like this: @onPopupDone="onPopupDone"',
                [
                    "SimpleMsgPlugin.vue",
                    "RedoPlugin.vue",
                    "UndoPlugin.vue",
                    "ClearSelectionPlugin.vue",
                ],
            ),
        )

    for strng, msg, exceptions in required_substrs:
        if strng not in content:
            # Substring not in content, but is this an exception?
            is_exception = False
            if exceptions is not None:
                is_exception = any(exception in ts_file for exception in exceptions)
            if not is_exception:
                add_error(ts_file, msg)

    # The filename must match the class name
    for word in re.findall(r"(\w+) extends PluginParentClass", content):
        if f"{word}.vue" != os.path.basename(ts_file):
            add_error(
                ts_file,
                f"Plugin class {word} is a plugin. Its filename must be {word}.vue.",
            )

    # No plugin should define mounted(
    if "mounted(" in content:
        add_error(
            ts_file,
            "Plugins should not define a mounted() function. Use onMounted() instead.",
        )


# Get a list of all the ts files in the ../src/ directory
ts_files = glob.glob("../src/**/*.ts", recursive=True) + glob.glob(
    "../src/**/*.vue", recursive=True
)

errors = []


for ts_file in ts_files:
    with open(ts_file, "r") as file:
        content = file.read()

    # No use fetch( anywhere. Prefer axios.get.
    if "fetch(" in content:
        add_error(ts_file, "Use axios.get instead of fetch.")

    # All *.vue files /Plugins/ must be plugins, except those in .../Parents/...
    if (
        "/Plugins/" in ts_file
        and "/Parents/" not in ts_file
        and ts_file.endswith(".vue")
        and os.path.basename(ts_file) not in ["AllPlugins.vue"]
    ):
        validate_plugin(ts_file)


# Save errors to ../src/compile_errors.json
with open("../src/compile_errors.json", "w") as file:
    json.dump(errors, file)

if errors:
    print("Validation failed. See compile_errors.json for details.\n")
    for err in errors:
        print(err)
    print("")
    exit(1)
else:
    print("Validation passed.\n")
    exit(0)
