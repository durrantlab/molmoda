import time
from typing import Any, TypedDict
from selenium.webdriver.remote.webelement import WebElement
from ..elements import el


class ITestCommand(TypedDict, total=False):
    """Shape of a single test command read from the page's #cmds-element.

    Mirrors the TypeScript ITestCommand interface in TestInterfaces.ts.
    """
    cmd: str
    selector: str
    data: object


def dispatch_command(driver: Any, cmd: ITestCommand) -> None:
    """Execute a single test command against the live page.

    Extracted from executor.run_test() so multiple runners (functional tests
    and docs-screenshot capture) can share the same command interpretation
    without diverging.

    Args:
        driver: The active Selenium WebDriver.
        cmd: A single command dict (see ITestCommand).

    Raises:
        Exception: Propagates whatever the underlying element helpers raise.
    """
    name = cmd["cmd"]
    if name == "click":
        el(cmd["selector"], driver).click(cmd.get("data", False))
    elif name == "text":
        el(cmd["selector"], driver).text = cmd["data"]
    elif name == "wait":
        time.sleep(cmd["data"])
    elif name == "waitUntilRegex":
        el(cmd["selector"], driver).wait_until_contains_regex(cmd["data"])
    elif name == "waitUntilNotRegex":
        el(cmd["selector"], driver).wait_until_does_not_contain_regex(cmd["data"])
    elif name == "upload":
        el(cmd["selector"], driver).upload_file(cmd["data"])
    elif name == "checkBox":
        el(cmd["selector"], driver).check_box(cmd["data"])
    # "addTests" is intentionally not handled here; it is a meta-instruction
    # the orchestrator must intercept before dispatch.