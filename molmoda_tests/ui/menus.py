"""
Interactive terminal menus for selecting the root URL and browsers.
"""

from simple_term_menu import TerminalMenu

AVAILABLE_URLS = [
    "http://localhost:8080",
    "https://molmoda.org",
    "https://beta.molmoda.org",
]

AVAILABLE_BROWSERS = [
    "chrome",
    "chrome-headless",
    "firefox",
    "firefox-headless",
    "safari",
]

_STANDARD_THREE = {"chrome-headless", "firefox", "safari"}


def select_root_url(urls: list[str] | None = None) -> str:
    """
    Show a terminal menu of URLs and return the one the user picks.
    Selecting '[c] custom' prompts for a manually typed URL.

    Args:
        urls: Override the default URL list if provided.
    """
    choices = urls or AVAILABLE_URLS
    options = choices + ["[c] custom"]
    menu = TerminalMenu(options, title="Select the root URL")
    idx = menu.show()

    if options[idx] == "[c] custom":
        return input("Enter custom URL: ").strip()

    return choices[idx]


def select_browsers(browsers: list[str] | None = None) -> list[str]:
    """
    Show a repeated terminal menu letting the user pick one or more browsers.
    Selecting '[s] standard three' adds chrome-headless, firefox, and safari.
    Selecting '[d] done' finishes selection.

    Args:
        browsers: Override the default browser list if provided.
    """
    available = browsers or AVAILABLE_BROWSERS
    options = ["[s] standard three"] + available + ["[d] done"]
    menu = TerminalMenu(options, title="Select the browsers to use")

    selected: list[str] = []
    while True:
        print("Selected browsers: " + ", ".join(selected))
        idx = menu.show()
        choice = options[idx]

        if choice == "[d] done":
            break
        elif choice == "[s] standard three":
            selected = list(set(selected) | _STANDARD_THREE)
        else:
            selected = list(set(selected) | {choice})

        selected.sort()

    return selected
