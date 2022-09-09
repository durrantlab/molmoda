# Simple validation of some biotite-specific issues.

import json
import glob
import re
import os

print("Running validate.py\n")

# Get a list of all the ts files in the ../src/ directory
ts_files = glob.glob("../src/**/*.ts", recursive=True) + glob.glob(
    "../src/**/*.vue", recursive=True
)

errors = []


def add_error(filename, msg):
    global errors
    filename = filename.replace("../src/", "@/")
    errors.append(f"{filename}: {msg}")


for ts_file in ts_files:
    with open(ts_file, "r") as file:
        content = file.read()
    if "extends PopupPluginParent" in content:
        if "@beforePopupOpen" in content:
            add_error(
                ts_file,
                "Cannot use @beforePopupOpen in a PopupPlugin. See onPluginStart() in PopupPluginParent.ts",
            )
        if "@onPopupOpen" in content:
            add_error(
                ts_file,
                "Cannot use @onPopupOpen in a PopupPlugin. See onPluginStart() in PopupPluginParent.ts",
            )

    plugin_extends = [
        "extends PluginParent",
        "extends PopupPluginParent",
        "extends EditBarPluginParent",
        "extends OptionalPluginParent",
    ]

    # If any of the members in plugin_extends are in content, print "mooe"
    if any([x in content for x in plugin_extends]):
        # It's a plugin of some sort

        if (
            not ts_file.endswith("Plugin.ts")
            and not ts_file.endswith("Plugin.vue")
            and not ts_file.endswith("Parent.ts")
        ):
            # The filename doesn't end with Plugin.ts or Plugin.vue or Parent.ts
            add_error(
                ts_file,
                'All files containing plugins must end in "Plugin.ts" or "Plugin.vue" or "Parent.ts"',
            )

        # Find all the words that preceed any of the strings in plugin_extends
        # use regex
        for extend in plugin_extends:
            for word in re.findall(r"(\w+) " + extend, content):
                if not word.endswith("Plugin") and not word.endswith("Parent"):
                    add_error(
                        ts_file,
                        f'Plugin class {word} is a plugin. Its name must end in "Plugin" or "Parent".',
                    )
                if os.path.basename(ts_file) not in [word + ".vue", word + ".ts"]:
                    add_error(
                        ts_file,
                        f'Plugin class {word} is a plugin. Its filename must be {word}.vue or {word}.ts.',
                    )

# Save errors to ../src/compile_errors.json
with open("../src/compile_errors.json", "w") as file:
    json.dump(errors, file)

if len(errors) > 0:
    print("Validation failed. See compile_errors.json for details.\n")
    exit(1)
else:
    print("Validation passed.\n")
    exit(0)