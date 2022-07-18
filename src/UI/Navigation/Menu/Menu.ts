import { Vue } from "vue-class-component";
import * as api from "../../../Api";

export enum MenuItemType {
    ACTION,
    SUBMENU,
    SEPARATOR,
}

export interface IMenuSeparator {
    type: MenuItemType;
}

export interface IMenuSubmenu {
    // This doesn't have an action, but contains items that may have actions (or
    // themselves be other submenus).
    
    // Using _text to match IMenuItem. Note that IMenuSubmenu is never used
    // directly in any plugin anyway.
    _text: string;
    items: (IMenuSubmenu | IMenuItem)[];
    type: MenuItemType;
}

export interface IMenuItem {
    path: string[] | string | undefined; // Directory structure, ending in text label
    function?: () => void;
    type?: MenuItemType;  // If absent, will assume MenuItemType.ACTION

    // Below are used internally, not from plugin.
    _pathNames?: string[];
    _text?: string;
}

export class MenuLevelParent extends Vue {
    isAction(item: IMenuItem | IMenuSubmenu | IMenuSeparator): boolean {
        return item.type === MenuItemType.ACTION;
    }

    isSeparator(item: IMenuItem | IMenuSubmenu | IMenuSeparator): boolean {
        return item.type === MenuItemType.SEPARATOR;
    }

    getItems(item: IMenuItem | IMenuSubmenu): (IMenuItem | IMenuSubmenu)[] {
        return (item as IMenuSubmenu).items;
    }
}

function menuDataHasName(
    menuDat: (IMenuItem | IMenuSubmenu)[],
    name: string
): boolean {
    return menuDat
        .map((m: IMenuItem | IMenuSubmenu) => m._text)
        .includes(name);
}

function getSubMenu(
    menuDat: (IMenuItem | IMenuSubmenu)[],
    name: string
): (IMenuItem | IMenuSubmenu)[] {
    return (
        menuDat.find((m) => (m as IMenuSubmenu)._text === name) as IMenuSubmenu
    ).items;
}

export function addMenuItem(
    newMenuItem: IMenuItem,
    existingMenuItems: (IMenuItem | IMenuSubmenu)[]
): (IMenuItem | IMenuSubmenu)[] {
    // if (api.sys.loadStatus.menuFinalized) {
    //     // Error: Menu already finalized. Assert
    //     throw new Error("Menu already finalized.");
    // }

    let existingMenuItemsPlaceholder = existingMenuItems;

    // Convert newMenuItem.path to newMenuItem._text and newMenuItem._pathNames.
    if (typeof newMenuItem.path === "string") {
        // If newMenuItem.path is string, divide by "/"
        const prts = newMenuItem.path.split("/");
        newMenuItem._text = prts.pop();
        newMenuItem._pathNames = prts;
    } else {
        // Already a list of paths, ending in text label.
        const path = newMenuItem.path as string[];
        newMenuItem._text = path.pop();
        newMenuItem._pathNames = path;
    }
    newMenuItem.path = undefined;

    // If type is not set, default to MenuItemType.ACTION.
    if (newMenuItem.type === undefined) {
        newMenuItem.type = MenuItemType.ACTION;
    }

    for (const level of newMenuItem._pathNames) {
        // This level doesn't exist, so add it.
        if (!menuDataHasName(existingMenuItemsPlaceholder, level)) {
            existingMenuItemsPlaceholder.push({
                type: MenuItemType.SUBMENU,
                _text: level,
                items: [],
            } as IMenuSubmenu);
        }
        existingMenuItemsPlaceholder = getSubMenu(
            existingMenuItemsPlaceholder,
            level
        );
    }

    // You've gone down all the levels in pathNames, so add the item.
    existingMenuItemsPlaceholder.push(newMenuItem);

    // Return the whole menu-data object.
    return existingMenuItems;
}
