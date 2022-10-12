import re
import glob
import os
import json


class Param:
    def __init__(self):
        self.name = None
        self.type = None
        self.description = None


class FuncOrVar:
    def __init__(self):
        self.description = ""  # use set_description to set this variable
        self.name = ""
        self.props = []

        self.func_params = []
        self.var_type = None
        self.return_type = None
        self.extra_description_prts = []

    def set_description(self, desc):
        desc = desc.split("@")
        self.description = desc[0].strip()
        description_prts = [p.strip() for p in desc[1:]]

        params = []
        var_types = []
        return_types = []
        extra = []
        for p in description_prts:
            if p.startswith("param"):
                params.append(p)
            elif p.startswith("type"):
                var_types.append(p)
            elif p.startswith("returns"):
                return_types.append(p)
            else:
                extra.append(p)

        self.func_params = [self._extract_param_info(p) for p in params] or None
        self.var_type = var_types[0] if var_types else None

        self.return_type = (
            self._extract_returns_info(return_types[0]) if return_types else None
        )
        self.extra_description_prts = extra

    def _extract_param_info(self, param: str) -> Param:
        param = param.strip()

        param = re.findall(r"^(.+?) \{(.+?)\} (.+?) (.+?)$", param)[0]
        typ = param[1]
        name = param[2]
        desc = param[3]

        typ = typ.replace("|", "\|")
        desc = desc.replace("|", "\|")

        func_param = Param()
        func_param.type = typ
        func_param.name = name
        func_param.description = desc

        return func_param

    def _extract_returns_info(self, param: str):
        param = param.strip()

        param = re.findall(r"^(.+?) \{(.+?)\} (.+?)$", param)[0]
        typ = param[1]
        desc = param[2]

        typ = typ.replace("|", "\|")
        desc = desc.replace("|", "\|")

        param = Param()
        param.type = typ
        param.description = desc

        return param

    def fix_name(self):
        self.name = self.name.split()[-1]


def get_locs_of_all_interfaces_enums():
    files = glob.glob("../src/**/*.ts", recursive=True)

    info = {}
    for fl in files:
        with open(fl) as f:
            fl = fl[7:]
            for i, line in enumerate(f.readlines()):
                m = re.search(r"\binterface (.+?)\b", line, re.MULTILINE)
                if m:
                    name = m[1]
                    info[name] = (
                        fl,
                        i + 1,
                        f"https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/{fl}#L{i+1}",
                    )
                m = re.search(r"\benum (.+?)\b", line, re.MULTILINE)
                if m:
                    name = m[1]
                    info[name] = (
                        fl,
                        i + 1,
                        f"https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/{fl}#L{i+1}",
                    )
                m = re.search(r"\btype (.+?)\b", line, re.MULTILINE)
                if m:
                    name = m[1]
                    info[name] = (
                        fl,
                        i + 1,
                        f"https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/{fl}#L{i+1}",
                    )

    return info


def process_text(text: str) -> str:
    # Use re to remove whitespace at beginning of each line
    text = re.sub(r"^\s+", "", text, flags=re.MULTILINE)

    # Remove any line that starets with "@Watch("
    text = re.sub(r"^@Watch\(.*?\)", "", text, flags=re.MULTILINE | re.DOTALL)
    text = re.sub(r"^@Options\(.*?\)", "", text, flags=re.MULTILINE | re.DOTALL)

    text = text.replace("\n", " ")

    while "  " in text:
        text = text.replace("  ", " ")
    while " * " in text:
        text = text.replace(" * ", " ")

    return text


def get_all_functions(dir: str):
    files = glob.glob(f"{dir}/**/*.vue", recursive=True)
    files += glob.glob(f"{dir}/**/*.ts", recursive=True)
    funcs = []
    for file in files:
        with open(file, "r") as f:
            content = f.read()

        content = process_text(content)

        # Get all regex that matches \/\*\* (.+?)\*\/ (.+?)\( This matches all
        # functions with comments and returns a list of tuples (comment,
        # function_name)
        funcs += re.findall(r"\/\*\* (.+?) \*\/ (.+?)[\({:=]", content)

        # import pdb; pdb.set_trace()

    # Remove funcs if "class " in second element of tuple
    funcs = [func for func in funcs if "class " not in func[1]]

    # Make a list of FuncOrVar objects
    func_vars = []
    for description, name in funcs:
        func_var = FuncOrVar()
        func_var.name = name
        func_var.set_description(description)

        # Only keep those functions that have "@document" in the comment or
        # "abstract" in the function name.

        if "@document" not in description and "abstract" not in name:
            continue

        # Add additional information (props).
        # description_prts_str = "@" + "@".join(func_var.description_prts)
        if func_var.var_type is not None:
            func_var.props.append("variable")

        if "abstract " in func_var.name:
            func_var.props.append("required")
        else:
            func_var.props.append("optional")

            if "gooddefault" in func_var.extra_description_prts:
                func_var.props.append("good_default")

            if "helper" in func_var.extra_description_prts:
                func_var.props.append("helper")

        func_var.fix_name()

        func_vars.append(func_var)

    # funcs = [f for f in funcs if "@document" in f[0] or "abstract " in f[1]]

    # # Divide first element by "@"
    # funcs = [[[f.strip() for f in func[0].split("@")], func[1]] for func in funcs]

    # If "abstract ", add " All plugins must define this function." to the
    # comment
    # for f in funcs:
    #     # func_name = f[1].split(" ")[-1]
    #     props = []
    #     if ":type " in ":".join(f[0]):
    #         props.append("variable")

    #     if "abstract " in f[1]:
    #         # f[0][0] += f"\n\nAll plugins must define the ```{func_name}()``` function."
    #         props.append("required")
    #     else:
    #         # f[0][0] += f"\n\nPlugins are not required to define the ```{func_name}()``` function. It is optional."
    #         props.append("optional")

    #         if "@gooddefault" in "@".join(f[0]):
    #             props.append("good_default")
    #             # f[0][0] += " This function has a good default implementation, so most plugins do not need to define it."

    #         if "@helper" in "@".join(f[0]):
    #             props.append("helper")

    #     f.append(props)

    # Keep only last word in function name
    # funcs = [(f[0], f[1].split(" ")[-1], f[2]) for f in funcs]

    # Divide into requireds, optional, optional but good default, and variables
    required_funcs = []
    optional_funcs = []
    good_default_funcs = []
    helper_funcs = []
    # variables = []

    for i, func_var in enumerate(func_vars):
        # comment, func_name, props = func_var

        # if "variable" in props:
        # variables.append((comment, func_name))
        if "required" in func_var.props:
            required_funcs.append(func_var)
        elif "good_default" in func_var.props:
            good_default_funcs.append(func_var)
        elif "helper" in func_var.props:
            helper_funcs.append(func_var)
        elif "optional" in func_var.props:
            optional_funcs.append(func_var)
        func_vars[i] = None

    while None in func_vars:
        func_vars.remove(None)

    if func_vars:
        print("funcs should be empty!")
        exit(1)

    return required_funcs, good_default_funcs, helper_funcs, optional_funcs


def add_type_def_info(type_name, interfaces_and_enums):
    type_name = type_name.replace("[", "").replace("]", "").replace("\\", "")
    type_names = [t.strip() for t in type_name.split("|")]
    return "".join(
        f" `{name}` is defined in [{os.path.basename(interfaces_and_enums[name][0])}, line {interfaces_and_enums[name][1]}]({interfaces_and_enums[name][2]})."
        for name in type_names
        if name not in ["string", "number", "any", "null", "boolean", "undefined"]
    )


def add_named_links(text, all_funcs_names):
    for fname in all_funcs_names:
        text = text.replace(f"`{fname}`", f"{fname}")
        text = re.sub(rf"\b{fname}\b", f"[`{fname}`](#{fname})", text)
    return text


def make_markdown(func_vars: FuncOrVar, all_funcs_names, interfaces_and_enums):
    # Sort funcs by name
    func_vars = sorted(func_vars, key=lambda x: x.name)

    markdown = ""

    for func_var in func_vars:
        desc = add_named_links(func_var.description, all_funcs_names)

        typ = "(function)"
        if "variable" in func_var.props:
            typ = "(variable)"
        elif "prop" in func_var.props:
            typ = "(:property)"
        elif "emit" in func_var.props:
            typ = "(@event)"

        markdown += f'\n#### `{func_var.name}` {typ} <a id="{func_var.name}"></a>\n\n'
        markdown += f"{desc}\n"
        table_data = ""
        if func_var.func_params is not None:
            for param in func_var.func_params:
                param_desc = add_named_links(param.description, all_funcs_names)
                param_desc += add_type_def_info(param.type, interfaces_and_enums)
                table_data += f"| `{param.name}` | `{param.type}` | {param_desc}\n"
        if func_var.return_type is not None:
            param_desc = add_named_links(
                func_var.return_type.description, all_funcs_names
            )
            param_desc += add_type_def_info(
                func_var.return_type.type, interfaces_and_enums
            )
            # markdown += f"\n| Returns | Description\n"
            # markdown += f"| ------- | -----------\n"
            table_data += (
                f"| `(returns)` | `{func_var.return_type.type}` | {param_desc}\n"
            )
        if func_var.var_type is not None:
            var_typ = " ".join(func_var.var_type.split(" ")[1:])[1:-1]
            var_desc = add_type_def_info(var_typ, interfaces_and_enums)
            markdown += f" Type: `{var_typ}`. {var_desc}\n"
        if "prop" in func_var.props:
            prop_desc = add_named_links(
                add_type_def_info(func_var.type, interfaces_and_enums), all_funcs_names
            )
            markdown += f" Type: `{func_var.type}`. {prop_desc}\n"

        if table_data != "":
            markdown += "\n| Parameter | Type | Description\n"
            markdown += "| --------- | ---- | -----------\n"
            markdown += table_data

    return markdown


def get_all_props_and_emits(dir: str):
    files = glob.glob(f"{dir}/**/*.vue", recursive=True)
    files += glob.glob(f"{dir}/**/*.ts", recursive=True)
    props = []
    emits = []
    for file in files:
        with open(file, "r") as f:
            content = f.read()

        content = process_text(content)

        # Get all regex that matches \/\*\* (.+?)\*\/ (.+?)\( This matches all
        # functions with comments and returns a list of tuples (comment,
        # function_name)
        props += re.findall(
            r"\/\*\*([^\/]+?)\*\/.{0,5}@Prop\((.+?)\) (.+?)!: (.+?);",
            content,
            re.DOTALL | re.MULTILINE,
        )

        emits += re.findall(
            r"\/\*\*([^\/]+?)\*\/[^\{]+?\$emit\(\"(.+?)\"",
            content,
            re.DOTALL | re.MULTILINE,
        )

    for i, prop in enumerate(props):
        comment, json_str, name, typ = prop
        comment = comment.strip()

        # Search json_str for required and default
        required = re.findall(r"required: (.+?)[ ,}]", json_str)
        default = re.findall(r"default: (.+?)[ ,}]", json_str)
        default = default[0] if default else None
        required = required[0] if required else None

        prop = FuncOrVar()

        if required is not None and required == "true":
            comment += " This component property is required."
            prop.props.append("required")

        if default is not None:
            comment += f" This component property is optional. If it is not specified, the default value is used: `{default}`."

        prop.set_description(comment)
        prop.type = typ
        prop.name = name
        prop.props.append("prop")

        props[i] = prop

    for i, emit in enumerate(emits):
        comment, name = emit
        comment = comment.strip()

        prts = comment.split("@")
        comment = prts[0].strip()
        params = None
        if len(prts) > 1:
            prts = re.findall(r"param \{(.+?)\} (.+?) (.+?)$", prts[1], re.MULTILINE)
            if prts:
                params = prts[0]

        emit = FuncOrVar()
        emit.set_description(comment)
        emit.name = name
        emit.props.append("emit")
        if params is not None:
            prm = Param()
            prm.name = params[1]
            prm.type = params[0]
            prm.description = params[2]
            emit.func_params = [prm]
        emits[i] = emit

    # Separate required and optional props
    required_props = [p for p in props if "required" in p.props]
    optional_props = [p for p in props if "required" not in p.props]

    return required_props, optional_props, emits


# Get all interfaces and enums
interfaces_and_enums = get_locs_of_all_interfaces_enums()

# plugin_component_funcs = get_all_functions("../src/Plugins/Parents/PluginComponent/")
required_funcs, good_default_funcs, helper_funcs, optional_funcs = get_all_functions(
    "../src/Plugins/Parents/PluginParentClass/"
)

# [["comment", "type"], "name", ["props"]]

required_props, optional_props, emits = get_all_props_and_emits(
    "../src/Plugins/Parents/PluginComponent/"
)

# Get all function and variable names
all_funcs_names = [
    f.name
    for f in required_funcs + good_default_funcs + helper_funcs + optional_funcs
    # + props
    # + emits
]

required_funcs_mrkdown = make_markdown(
    required_funcs, all_funcs_names, interfaces_and_enums
)
good_default_funcs_mrkdown = make_markdown(
    good_default_funcs, all_funcs_names, interfaces_and_enums
)
helper_funcs_mrkdown = make_markdown(
    helper_funcs, all_funcs_names, interfaces_and_enums
)
optional_funcs_mrkdown = make_markdown(
    optional_funcs, all_funcs_names, interfaces_and_enums
)

required_props_mrkdown = make_markdown(
    required_props, all_funcs_names, interfaces_and_enums
)

optional_props_mrkdown = make_markdown(
    optional_props, all_funcs_names, interfaces_and_enums
)

emits_mrkdown = make_markdown(emits, all_funcs_names, interfaces_and_enums)

mrkdown = f"""# How to Make a Plugin

## \<PluginComponent>

All plugins must include a template that contains only a single
\<PluginComponent> tag, which is used to display the plugin.

### Required Properties

Every \<PluginComponent> must define the following properties.

{required_props_mrkdown}

### Optional Properties

\<PluginComponent> is not required to define the following properties. They are
optional.

{optional_props_mrkdown}

### Events

\<PluginComponent> emits the following events.

{emits_mrkdown}

## Plugin Class

All plugin classes must export a class that extends the `PluginParentClass`
class. The class name must end in `Plugin`. For example:

`export default class ActionPlugin extends PluginParentClass`

### Required Functions/Variables

Every plugin class must define the following functions and variables.

{required_funcs_mrkdown}

### Optional Functions/Variables

Plugin classes are not required to define the following functions and variables.
They are optional.

{optional_funcs_mrkdown}

### Helper Functions

Plugin classes should not define the following helper (utility) functions. They
are defined in the `PluginParentClass` and can be called from other plugin class
functions.

{helper_funcs_mrkdown}

### Optional Functions/Variables with Good Defaults

The following functions and variables have good default implementations, so most
plugin classes should not define them. But they can be defined if needed
(advanced use, rare cases).

{good_default_funcs_mrkdown}
"""

# plugin_parent_class_mrkdown = make_markdown(plugin_parent_class_funcs)
print(mrkdown)
# import pdb; pdb.set_trace()
