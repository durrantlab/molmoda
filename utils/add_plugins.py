# This scripts modifies AllPlugins.vue to automatically load all the plugins.

import glob
import os
import re

print("Running add_plugins.py\n")

core_plugins = glob.glob("../src/Plugins/Core/**/*Plugin.vue", recursive=True)
optional_plugins = glob.glob("../src/Plugins/Optional/**/*Plugin.vue", recursive=True)

# Sort by basename
core_plugins.sort(key=lambda x: os.path.basename(x))
optional_plugins.sort(key=lambda x: os.path.basename(x))

# Remove if os.basename is AboutPlugin.vue (handled special case in
# AllPlugins.vue). Same with HelpPlugin.vue
core_plugins = [
    x
    for x in core_plugins
    if os.path.basename(x) not in ["AboutPlugin.vue", "HelpPlugin.vue"]
]


all_plugins = "../src/Plugins/AllPlugins.vue"

# Make a backup of all_plugins
with open(all_plugins, "r") as file:
    content = file.read()
with open(f"{all_plugins}.bak", "w") as file:
    file.write(content)

# Modify the content
template1 = "<!-- TEMPLATE1 START -->\n"
for core_plugin in core_plugins:
    plugin_name = os.path.basename(core_plugin).replace(".vue", "").replace(".ts", "")
    template1 += f'    <{plugin_name} @onPluginSetup="onPluginSetup"></{plugin_name}>\n'
template1 += "\n"
for optional_plugin in optional_plugins:
    plugin_name = (
        os.path.basename(optional_plugin).replace(".vue", "").replace(".ts", "")
    )
    template1 += f'    <{plugin_name} @onPluginSetup="onPluginSetup"></{plugin_name}>\n'
template1 += "    <!-- TEMPLATE1 END -->"
# print(template1)

template2 = "// TEMPLATE2 START\n"
for core_plugin in core_plugins:
    plugin_name = os.path.basename(core_plugin).replace(".vue", "").replace(".ts", "")
    plugin_path = core_plugin.replace("../src/Plugins/", "./")
    template2 += f'import {plugin_name} from "{plugin_path}";\n'
template2 += "\n"
for optional_plugin in optional_plugins:
    plugin_name = (
        os.path.basename(optional_plugin).replace(".vue", "").replace(".ts", "")
    )
    plugin_path = optional_plugin.replace("../src/Plugins/", "./")
    template2 += f'import {plugin_name} from "{plugin_path}";\n'
template2 += "// TEMPLATE2 END"

template3 = "// TEMPLATE3 START\n"
for core_plugin in core_plugins:
    plugin_name = os.path.basename(core_plugin).replace(".vue", "").replace(".ts", "")
    template3 += f"    {plugin_name},\n"
template3 += "\n"
for optional_plugin in optional_plugins:
    plugin_name = (
        os.path.basename(optional_plugin).replace(".vue", "").replace(".ts", "")
    )
    template3 += f"    {plugin_name},\n"
template3 += "    // TEMPLATE3 END\n"
# print(template3)

# Insert template1
content = re.sub(
    r"<!-- TEMPLATE1 START -->.*<!-- TEMPLATE1 END -->",
    template1,
    content,
    flags=re.DOTALL,
)

# Insert template2
content = re.sub(
    r"// TEMPLATE2 START.*// TEMPLATE2 END", template2, content, flags=re.DOTALL,
)

# Insert template3
content = re.sub(
    r"// TEMPLATE3 START.*// TEMPLATE3 END", template3, content, flags=re.DOTALL,
)
# print(content)

while "\n\n\n" in content:
    content = content.replace("\n\n\n", "\n\n")

# Write the modified content
with open(all_plugins, "w") as file:
    file.write(content)

