# Simple validation of some molmoda-specific issues.

import json
import glob
import re
import os

print("Running validate.py\n")


def add_error(filename, msg):
    global errors
    filename = filename.replace("../src/", "@/")
    errors.append(f"{filename}: {msg}")


def validate_plugin(ts_file, content): # Added content as a parameter
    # ts_file is a plugin

    # It must end in Plugin.vue
    if not ts_file.endswith("Plugin.vue"):
        add_error(
            ts_file, 'All files containing plugins must end in "Plugin.vue"',
        )

    required_substrs = [
        # (
        #     ':userArgs="userArgs"',
        #     'The PluginComponent must define a userArgs prop like this: :userArgs="userArgs"',
        #     None,
        # ),
        # (
        #     ':intro="intro',
        #     'The PluginComponent must define an intro prop like this: :intro="intro"',
        #     None,
        # ),
        (
            ':infoPayload="infoPayload"',
            'The PluginComponent must define a title prop like this: :infoPayload="infoPayload"',
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
        # (
        #     'title="',
        #     'The PluginComponent must define a title like this: title="My Plugin"',
        #     None,
        # ),
        # (
        #     ':pluginId="pluginId"',
        #     'The PluginComponent must define a pluginId prop like this: :pluginId="pluginId"',
        #     None,
        # ),
        (
            "extends PluginParentClass",
            "All plugins must extend PluginParentClass",
            [
                "PubChemBioassaysPlugin.vue",
                "PubChemNamesPlugin.vue",
                "PubChemPropsPlugin.vue"
            ],
        ),
        (
            "<PluginComponent",
            "All plugins must use the PluginComponent component",
            None,
        ),
        (
            '@onUserArgChanged="onUserArgChanged"',
            'All plugins must include @onUserArgChanged="onUserArgChanged"',
            None,
        ),
        (
            'getTests(',
            'All plugins must define a getTests function. If a test is not needed, return an empty array. You can use `FailingTest` as a placeholder if you do not want to make the test now.',
            None
        )
    ]

    # NOTE: Below is not strictly required for all plugins. Only those that have
    # a MoleculeInputParams form item. But let's just enforce it throughout.
    required_substrs.append(
        (
            '@onMolCountsChanged="onMolCountsChanged"',
            'The PluginComponent must define an onMolCountsChanged event like this: @onMolCountsChanged="onMolCountsChanged"',
            [
                # "SimpleMsgPlugin.vue",
                # "SimpleTableDataPlugin.vue",
                # "RedoPlugin.vue",
                # "UndoPlugin.vue",
                # "ClearSelectionPlugin.vue",
            ],
        ),
    )

    if "noPopup = true" not in content:
        required_substrs.append(
            (
                '@onPopupDone="onPopupDone"',
                'The PluginComponent must define an onPopupDone event like this: @onPopupDone="onPopupDone"',
                [
                    "SimpleMsgPlugin.vue",
                    "SimpleTableDataPlugin.vue",
                    "RedoPlugin.vue",
                    "UndoPlugin.vue",
                    "ClearSelectionPlugin.vue",
                ],
            ),
        )

        if "menuPath = null" not in content:
            required_substrs.append(
                (
                    '..."',
                    'Unless a plugin defines noPopup to be true, its menu item must end in "..." (use double quotes).',
                    [],
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

    prohibited_substrings = [
        (
            "onUserArgChanged(",
            "Plugins must not define onUserArgChanged function. That's reserved for the parent class. Use onUserArgChange instead, which is called by the parent class.",
            None
        ),
    ]

    for strng, msg, exceptions in prohibited_substrings:
        if strng in content:
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

    # All core plugins must define tag "Tag.All".
    if "/Core/" in ts_file and "Tag.All" not in content:
        add_error(
            ts_file,
            'Core plugins must use the tag "Tag.All".',
        )

    # No optional plugin should have tag "Tag.All".
    if "/Optional/" in ts_file and "Tag.All" in content:
        add_error(
            ts_file,
            'Optional plugins must not use the tag "Tag.All".',
        )



# Get a list of all the ts files in the ../src/ directory
ts_files = glob.glob("../src/**/*.ts", recursive=True) + glob.glob(
    "../src/**/*.vue", recursive=True
)

errors = []


for ts_file in ts_files:
    # try:
    with open(ts_file, "r") as file:
        content = file.read()

    # The string "LAST_NAME" must not appear anywhere.
    if "LAST_NAME" in content:
        add_error(ts_file, 'The string "LAST_NAME" must not appear anywhere in any file.')

    # The string "No changes" must not appear anywhere.
    if "No changes" in content:
        add_error(ts_file, 'The string "No changes" should not appear anywhere.')

    # No use fetch( anywhere. Prefer fetcher().
    if "fetch(" in content:
        add_error(ts_file, "Use fetcher() instead of fetch.")

    if "axios.get" in content and "Fetcher.ts" not in ts_file:
        add_error(ts_file, "Use fetcher() instead of axios.get.")

    if "localStorage." in content and "LocalStorage.ts" not in ts_file:
        add_error(ts_file, "Use the LocalStorage class instead of localStorage.setItem or localStorage.getItem.")

    if "location.reload" in content and "CloseAppUtils.ts" not in ts_file:
        add_error(ts_file, "Use closeDownApp() class instead of location.reload.")

    if "URLSearchParams(" in content and "UrlParams.ts" not in ts_file:
        add_error(ts_file, "Use getUrlParam() instead of URLSearchParams.")

    if 'href="#"' in content or 'href= "#"' in content:
        add_error(ts_file, 'No <a> should have `href="#"`. Remove it and use `class="link-primary"` if needed.')

    # if ".catch(" in content, there must be a "throw" within the next few
    # lines. Use regex.
    if ".catch(" in content:
        # import pdb; pdb.set_trace()
        for match in re.findall(r"\.catch\((.{0,200})", content, re.DOTALL):
            if "throw" not in match and "reject" not in match:
                add_error(
                    ts_file,
                    "If you use .catch(), you must throw an error or reject within the next few lines. Comment out 'throw err' in those rare cases where you want to ignore an error.",
                )
    if "import(" in content and os.path.basename(ts_file) != "DynamicImports.ts":
        add_error(ts_file, "Use import() only in the DynamicImports.ts file.")

    # Don't allow "MolModa" anywhere but in GlobalVars.ts
    content_without_dot_molmoda = content.replace("MOLMODA:", '')
    content_without_dot_molmoda = content_without_dot_molmoda.lower()
    content_without_dot_molmoda = content_without_dot_molmoda.replace('"molmoda"', '')
    content_without_dot_molmoda = content_without_dot_molmoda.replace(".molmoda", "")
    content_without_dot_molmoda = content_without_dot_molmoda.replace("/molmoda/", "")

    # Remove comments
    content_without_dot_molmoda = re.sub(r"//.*", "", content_without_dot_molmoda)
    content_without_dot_molmoda = re.sub(r" \* .*", "", content_without_dot_molmoda)

    has_mol_moda = re.search(r"\bmolmoda\b", content_without_dot_molmoda)
    if has_mol_moda and "GlobalVars.ts" not in ts_file:
        add_error(
            ts_file,
            'The string "MolModa" should only be used in GlobalVars.ts. Import the app name from there.',
        )

    # The substring ".get_svg" is only allowed in the file "Mol2DView.vue"
    if ".get_svg" in content and os.path.basename(ts_file) != "Mol2DView.vue":
        add_error(
            ts_file,
            'The substring ".get_svg" is only allowed in Mol2DView.vue.'
        )

    # Find all `.popupMessage` calls and check if the title is descriptive enough.
    # The regex finds `.popupMessage(`, optional whitespace, then captures the content
    # of the first string argument (single, double, or backtick quoted).
    popup_title_pattern = r'\.popupMessage\(\s*(["\'`])(.*?)\1'
    for match in re.finditer(popup_title_pattern, content, re.DOTALL):
        # group(2) captures the content inside the quotes
        title = match.group(2)
        
        # Count words by splitting on whitespace.
        # A title like "Error" (1 word) or "Access Denied" (2 words) is too short.
        if len(title.strip().split()) < 2:
            add_error(
                ts_file,
                f'Popup titles must be more than two words long for clarity. Found: "{title}"'
            )


    # Try to avoid filtering molecules directly. Use the shallowFilters
    # subclass.
    # matches = (
    #     [t for t in re.finditer(r"[cC]ontainer.{0,25}\.filter", content, re.DOTALL)]
    #     + [t for t in re.finditer(r"\.filter.{0,25}[cC]ontainer", content, re.DOTALL)]
    #     + [t for t in re.finditer(r"[nN]ode.{0,25}\.filter", content, re.DOTALL)]
    # )
    # txts = [content[m.span()[0] - 65 : m.span()[1] + 65] for m in matches]
    # txts = [t for t in txts if "mol_filter_ok" not in t]

    # for txt in txts:
    #     # replace all new lines and double spaces using regex
    #     txt = re.sub(r"\s+", " ", txt)

    #     add_error(
    #         ts_file,
    #         f"Use the shallowFilters subclass instead of filtering TreeNodeList directly (or include mol_filter_ok somewhere nearby): `{txt}`",
    #     )

    ##### BELOW HERE, ONLY VALIDATE PLUGINS #####

    # All *.vue files /Plugins/ must be plugins, except those in .../Parents/...
    if "/Plugins/" not in ts_file:
        # It's not a plugin
        continue
    if "/Parents/" in ts_file:
        # It's a parent, not a plugin
        continue

    if not ts_file.endswith(".vue"):
        # It's not a vue file, so not a plugin
        continue

    if os.path.basename(ts_file) in ["AllPlugins.vue"]:
        # It's not a plugin (in blacklist)
        continue

    if "<PluginComponent" not in content:
        # It's not a plugin (doesn't contain <PluginComponent)
        continue

    validate_plugin(ts_file, content) # Pass content to validate_plugin

errors = sorted(set(errors))

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