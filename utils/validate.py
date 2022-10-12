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


# Get a list of all the ts files in the ../src/ directory
ts_files = glob.glob("../src/**/*.ts", recursive=True) + glob.glob(
    "../src/**/*.vue", recursive=True
)

errors = []


for ts_file in ts_files:
    with open(ts_file, "r") as file:
        content = file.read()

    # All *.vue files /Plugins/ must be plugins, except those in .../Parents/...
    if (
        "/Plugins/" in ts_file
        and "/Parents/" not in ts_file
        and ts_file.endswith(".vue")
        and os.path.basename(ts_file) not in ["AllPlugins.vue"]
    ):

        # ts_file is a plugin

        # It must end in Plugin.vue
        if not ts_file.endswith("Plugin.vue"):
            add_error(
                ts_file,
                'All files containing plugins must end in "Plugin.vue"',
            )

        # All plugins must extend PluginParentClass
        if "extends PluginParentClass" not in content:
            add_error(
                ts_file,
                "All plugins must extend PluginParentClass",
            )

        # All plugins must use the PluginComponent component
        if "<PluginComponent" not in content:
            add_error(
                ts_file,
                "All plugins must use the PluginComponent component",
            )

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
