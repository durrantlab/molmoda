import { IMenuEntry, IMenuItem, IMenuSubmenu } from "@/UI/Navigation/Menu/Menu";
import { isElectron } from "./ElectronUtils";
import { loadedPlugins } from "@/Plugins/LoadedPlugins";

let onMenuItemClickAlreadySetup = false;

/**
 * Collapse the first sublevel of the menu.
 * 
 * @param  {any[]} menu  The menu.
 * @returns {any[]}  The collapsed menu.
 */
function collapseFirstSublevel(menu: any[]): any[] {
    const collapsedMenu: any[] = [];

    menu.forEach((item) => {
        if (item.submenu) {
            const collapsedSubmenu: any[] = [];

            item.submenu.forEach((subItem: any, index: number) => {
                if (subItem.submenu) {
                    subItem.submenu.forEach((nestedItem: any) => {
                        collapsedSubmenu.push(nestedItem);
                    });
                    if (index < item.submenu?.length - 1) {
                        collapsedSubmenu.push({ type: "separator" });
                    }
                } else {
                    collapsedSubmenu.push(subItem);
                }
            });

            collapsedMenu.push({ ...item, submenu: collapsedSubmenu });
        } else {
            collapsedMenu.push(item);
        }
    });

    return collapsedMenu;
}

/**
 * Setup the Electron menu.
 *
 * @param  {IMenuEntry[]} menuData  The menu data.
 */
export function setupElectronMenu(menuData: IMenuEntry[]) {
    if (!isElectron()) {
        return;
    }

    // Hide #menuContainer
    const menuContainer = document.getElementById("menuContainer");
    if (menuContainer) {
        menuContainer.style.display = "none";
    }

    /**
     * Recursively create the menu.
     *
     * @param  {IMenuItem|IMenuSubmenu} menuEntry  The menu entry.
     * @returns {any}  The new menu entry.
     */
    const recurseFunc = function (menuEntry: IMenuItem | IMenuSubmenu): any {
        const newEntry = {
            label: menuEntry.text,
        } as any;

        if ((menuEntry as IMenuItem).hotkey) {
            let { hotkey } = menuEntry as IMenuItem;

            // If it's an array, keep the first one.
            if (Array.isArray(hotkey)) {
                hotkey = hotkey[0];
            }

            if (hotkey !== "" && hotkey !== undefined) {
                newEntry["accelerator"] = `CmdOrCtrl+${hotkey.toUpperCase()}`;
            }
        }

        if ((menuEntry as IMenuItem).pluginId) {
            newEntry["pluginId"] = (menuEntry as IMenuItem).pluginId;
        }

        if ((menuEntry as IMenuSubmenu).items) {
            newEntry["submenu"] = (menuEntry as IMenuSubmenu).items.map(
                recurseFunc
            );
        }

        return newEntry;
    };

    let menu = menuData.map(recurseFunc);

    menu = collapseFirstSublevel(menu);

    (window as any).electronAPI.setupMenu(menu);

    if (!onMenuItemClickAlreadySetup) {
        // Register the menu item click handler
        (window as any).electronAPI.onMenuItemClick((pluginId: string) => {
            const plugin = loadedPlugins[pluginId];
            plugin.menuOpenPlugin();
        });
        onMenuItemClickAlreadySetup = true;
    }
}
