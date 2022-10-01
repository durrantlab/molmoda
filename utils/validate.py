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


def checkFileAndClassName(ts_file, content, extends_str):
    # The filename must end with Plugin.ts or Plugin.vue or Parent.ts
    if (
        not ts_file.endswith("Plugin.ts")
        and not ts_file.endswith("Plugin.vue")
        and not ts_file.endswith("Parent.ts")
        and not ts_file.endswith("Renderless.ts")
    ):
        add_error(
            ts_file,
            'All files containing plugins must end in "Plugin.ts" or "Plugin.vue" or "Parent.ts" or "Renderless.ts"',
        )

    # Make sure the plugin class name is appropriate (must end in Plugin)
    for word in re.findall(r"(\w+) " + extends_str, content):
        if not word.endswith("Plugin") and not word.endswith("Parent"):
            add_error(
                ts_file,
                f'Plugin class {word} is a plugin. Its name must end in "Plugin" or "Parent".',
            )
        if os.path.basename(ts_file) not in [f"{word}.vue", f"{word}.ts"]:
            add_error(
                ts_file,
                f"Plugin class {word} is a plugin. Its filename must be {word}.vue or {word}.ts.",
            )

def checkIfTagMatchesExtends(ts_file, content, extends_str):
    # If extends Renderless, then associated component must be used.
    if "Renderless" in extends_str:
        tag = "<" + extends_str.split()[1].replace("Renderless", "")

        # If PopupPlugin or EditBarPlugin, allow <PopupOneTextInput tag
        if tag in ["<PopupPluginParent", "<EditBarPluginParent"] and "<PopupOneTextInput" in content:
            # It's ok. No error.
            pass
        elif tag not in content:
            add_error(
                ts_file,
                f"Plugin {extends_str}, but no {tag}> tag in the template.",
            )

def popupPlugin(ts_file, content):
    # Add Renderless when ready
    extends_str = "extends PopupPluginParentRenderless"
    if extends_str not in content:
        return

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

    for required in ["intro", "onPopupDone", "beforePopupOpen"]:
        if required not in content:
            add_error(
                ts_file,
                f"PopupPlugin must use or define {required}",
            )

    checkFileAndClassName(ts_file, content, extends_str)
    checkIfTagMatchesExtends(ts_file, content, extends_str)


def parentPlugin(ts_file, content):
    # Plugins are those that extend plugin parents
    extends_str = "extends PluginParentRenderless"
    if extends_str not in content:
        return

    # It's a plugin of some sort
    checkFileAndClassName(ts_file, content, extends_str)
    checkIfTagMatchesExtends(ts_file, content, extends_str)
    for required in [
        "menuPath",
        "softwareCredits",
        "contributorCredits",
        "pluginId",
        "onPluginStart",
        "runJob",
    ]:
        if required not in content:
            add_error(
                ts_file,
                f"Plugin must use or define {required}",
            )


def optionalPlugin(ts_file, content):
    # Plugins are those that extend plugin parents
    extends_str = "extends OptionalPluginParentRenderless"
    if extends_str not in content:
        return

    # It's a plugin of some sort
    checkFileAndClassName(ts_file, content, extends_str)
    checkIfTagMatchesExtends(ts_file, content, extends_str)
    for required in ["userInputs", "onPopupDone"]:
        if required not in content:
            add_error(
                ts_file,
                f"Plugin must use or define {required}",
            )


def editBarPlugin(ts_file, content):
    extends_str = "extends EditBarPluginParentRenderless"
    if extends_str not in content:
        return

    checkFileAndClassName(ts_file, content, extends_str)
    # checkIfTagMatchesExtends(ts_file, content, extends_str)
    if "<PopupPluginParent" not in content and "<PopupOneTextInput" not in content:
        add_error(
            ts_file,
            "EditBarPluginParent must use or define <PopupPluginParent> or <PopupOneTextInput>",
        )


for ts_file in ts_files:
    with open(ts_file, "r") as file:
        content = file.read()

    # Ignore parents of plugins
    if "/Parents/" not in ts_file:
        popupPlugin(ts_file, content)
        parentPlugin(ts_file, content)
        optionalPlugin(ts_file, content)
        editBarPlugin(ts_file, content)


# Save errors to ../src/compile_errors.json
with open("../src/compile_errors.json", "w") as file:
    json.dump(errors, file)

if len(errors) > 0:
    print("Validation failed. See compile_errors.json for details.\n")
    for err in errors:
        print(err)
    print("")
    exit(1)
else:
    print("Validation passed.\n")
    exit(0)
