import os
import glob
import regex

# Delete all files in present directory that end in wasm, js, html, data
for file in (
    glob.glob("*.wasm") + glob.glob("*.js") + glob.glob("*.html") + glob.glob("*.data")
):
    os.remove(file)

# Copy all files from ./orig directory to this one
for file in glob.glob("./orig/*"):
    os.system(f"cp {file} .")

for file in glob.glob("*.js"):
    with open(file, "r") as f:
        content = f.read()

    # Use regex to replace Module (while word) with OpenBabelModule
    # content = regex.sub(
    #     r"\bModule\b", file[:1].upper() + file[1:-3] + "Module", content
    # )

    content = f"""/* eslint-disable */
// @ts-nocheck
{content}
"""


    # Wrap in function that can be imported
    # content = f"""/* eslint-disable */
    # // @ts-nocheck
    # export function initOpenBabel(OpenBabelModule) {{
    #     {content}
    # }}
    # """

    # Save file
    with open(file, "w") as f:
        f.write(content)
