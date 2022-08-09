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
    _rank?: number;
}

export interface IMenuItem {
    path: string[] | string | undefined; // Directory structure, ending in text label
    function?: () => void;
    type?: MenuItemType; // If absent, will assume MenuItemType.ACTION
    
    // Below are used internally, not from plugin.
    _rank?: number;
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
        const items = (item as IMenuSubmenu).items;
        menuDataSorted(items);
        return items;
    }
}

function _isNameInMenuData(
    menuDat: (IMenuItem | IMenuSubmenu)[],
    name: string
): boolean {
    return menuDat.map((m: IMenuItem | IMenuSubmenu) => m._text).includes(name);
}

function _getSubMenu(
    menuDat: (IMenuItem | IMenuSubmenu)[],
    name: string
): IMenuSubmenu {
    return menuDat.find((m) => (m as IMenuSubmenu)._text === name) as IMenuSubmenu;
}

function _convertPathToTextAndPathNames(newMenuItem: IMenuItem): void {
    // Convert newMenuItem.path to newMenuItem._text and newMenuItem._pathNames.
    // Note that it is done in place, so no need to return anything.
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
}

function _getRankFromText(text: string): any {
    const rankInfo = text.match(/^\[(\d+)\]/);
    let rank: number | undefined = undefined;
    if (rankInfo) {
        rank = parseInt(rankInfo[1]);
        text = text.replace(
            /^\[\d+\]/,
            ""
        ).trim();

        // If rank is not between 0 and 10, throw an error.
        if (rank < 0 || rank > 10) {
            throw new Error("Rank must be between 0 and 10. Found: " + rank);
        }
    }

    return {rank, text}
}

function _extractRankFromText(newMenuItem: IMenuItem): void {
    // Extract [#] from begining of IMenuItem._text
    const {rank, text} = _getRankFromText(newMenuItem._text as string);
    newMenuItem._rank = rank;
    newMenuItem._text = text;
}

function _setNewMenuItemDefaults(newMenuItem: IMenuItem): void {
    // All this in place, so no need to return anything.

    // If type is not set, default to MenuItemType.ACTION.
    if (newMenuItem.type === undefined) {
        newMenuItem.type = MenuItemType.ACTION;
    }

    // If rank is not set, default to 5.
    // if (newMenuItem._rank === undefined) {
    //     newMenuItem._rank = 5;
    // }

    // // If rank is not between 0 and 10, throw an error.
    // if (newMenuItem._rank < 0 || newMenuItem._rank > 10) {
    //     throw new Error("Rank must be between 0 and 10.");
    // }
}

export function addMenuItem(
    newMenuItem: IMenuItem,
    existingMenuItems: (IMenuItem | IMenuSubmenu)[],
    pluginId?: string
): (IMenuItem | IMenuSubmenu)[] {
    // if (api.sys.loadStatus.menuFinalized) {
    //     // Error: Menu already finalized. Assert
    //     throw new Error("Menu already finalized.");
    // }

    _convertPathToTextAndPathNames(newMenuItem);
    _extractRankFromText(newMenuItem);
    _setNewMenuItemDefaults(newMenuItem);

    let existingMenuItemsPlaceholder = existingMenuItems;
    for (const pathName of newMenuItem._pathNames as string[]) {
        // Get rank and pathName from text.
        const {rank, text: pathNameWithoutRank} = _getRankFromText(pathName);

        if (!_isNameInMenuData(existingMenuItemsPlaceholder, pathNameWithoutRank)) {
            // This level doesn't exist, so add it.
            existingMenuItemsPlaceholder.push({
                type: MenuItemType.SUBMENU,
                _text: pathNameWithoutRank,
                items: [],
                _rank: rank,
            } as IMenuSubmenu);
        }

        const subMenu = _getSubMenu(
            existingMenuItemsPlaceholder,
            pathNameWithoutRank
        );

        // Check if rank needs to be updated.
        if (rank !== undefined) {
            if (subMenu._rank === undefined) {
                subMenu._rank = rank;
            } else if (subMenu._rank !== rank) {
                // Error: Rank already set. Assert
                throw new Error(`Plugin "${pluginId}" set rank of "${subMenu._text}" menu item to ${rank}, but it is already set to ${subMenu._rank}.`);
            }
        }

        existingMenuItemsPlaceholder = subMenu.items;
    }

    // You've gone down all the levels in pathNames, so add the item.
    existingMenuItemsPlaceholder.push(newMenuItem);

    // Return the whole menu-data object.
    return existingMenuItems;
}

export function menuDataSorted(menuData: (IMenuItem | IMenuSubmenu)[]): void {
    // In place, so no need to return anything.

    menuData.sort(
        (a: IMenuItem | IMenuSubmenu, b: IMenuItem | IMenuSubmenu) => {
            // Sort the items by rank. Defaults to 5 if not set.
            const a_rank = (a._rank !== undefined) ? a._rank : 5;
            const b_rank = (b._rank !== undefined) ? b._rank : 5;
            if (a_rank < b_rank) {
                return -1;
            }
            if (a_rank > b_rank) {
                return 1;
            }

            // If ranks are equal, sort by text.
            const a_text = a._text as string;
            const b_text = b._text as string;
            if (a_text < b_text) {
                return -1;
            }
            if (a_text > b_text) {
                return 1;
            }

            return 0;
        }
    );
}