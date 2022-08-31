import { Vue } from "vue-class-component";

export type IMenuEntry = IMenuItem | IMenuSubmenu;

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
    isAction(item: IMenuEntry | IMenuSeparator): boolean {
        return item.type === MenuItemType.ACTION;
    }

    isSeparator(item: IMenuEntry | IMenuSeparator): boolean {
        return item.type === MenuItemType.SEPARATOR;
    }

    getItems(item: IMenuEntry): IMenuEntry[] {
        const items = (item as IMenuSubmenu).items;
        menuDataSorted(items);
        return items;
    }
}

/**
 * Given a list of menu entries, does one of them have a given name?
 *
 * @param  {IMenuEntry[]} menuDat List of menu entries.
 * @param  {string}       name    Name to look for.
 * @returns {boolean} True if found, false otherwise.
 */
function _isNameInMenuData(menuDat: IMenuEntry[], name: string): boolean {
    return menuDat.map((m: IMenuEntry) => m._text).includes(name);
}

/**
 * Given menu data, get the submenu of an item with a given name.
 *
 * @param  {IMenuEntry[]} menuDat  List of menu entries.
 * @param  {string}       name     Name of submenu to get.
 * @returns {IMenuSubmenu} Submenu with the given name.
 */
function _getSubMenu(menuDat: IMenuEntry[], name: string): IMenuSubmenu {
    return menuDat.find(
        (m) => (m as IMenuSubmenu)._text === name
    ) as IMenuSubmenu;
}

/**
 * Given menu item, momdify the ._text and ._pathNames entries. Convert
 * newMenuItem.path to newMenuItem._text and newMenuItem._pathNames. Done in
 * place, so no need to return anything.
 * 
 * @param  {IMenuItem} newMenuItem  Menu item to modify.
 */
function _convertPathToTextAndPathNames(newMenuItem: IMenuItem) {
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

/**
 * Extract the rank in menu text, if any.
 *
 * @param  {string} text  Text to extract rank from.
 * @returns {any} Contains both the rank and the text with ranked removed.
 */
function _getRankFromText(text: string): any {
    const rankInfo = text.match(/^\[(\d+)\]/);
    let rank: number | undefined = undefined;
    if (rankInfo) {
        rank = parseInt(rankInfo[1]);
        text = text.replace(/^\[\d+\]/, "").trim();

        // If rank is not between 0 and 10, throw an error.
        if (rank < 0 || rank > 10) {
            throw new Error("Rank must be between 0 and 10. Found: " + rank);
        }
    }

    return { rank, text };
}

/**
 * Extract the rank in menu text, if any, and updates the ._rank and ._text
 * fields.
 *
 * @param  {IMenuItem} newMenuItem  Menu item to modify.
 */
function _extractRankFromText(newMenuItem: IMenuItem) {
    // Extract [#] from begining of IMenuItem._text
    const { rank, text } = _getRankFromText(newMenuItem._text as string);
    newMenuItem._rank = rank;
    newMenuItem._text = text;
}

/**
 * Sets defaults on menu items, for cases when not specified in plugins. All
 * this in place, so no need to return anything.
 *
 * @param  {IMenuItem} newMenuItem  Menu item, with defaults set.
 */
function _setNewMenuItemDefaults(newMenuItem: IMenuItem) {
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

/**
 * Add an entry to the menu system.
 *
 * @param  {IMenuItem} newMenuItem           Menu item to add.
 * @param  {IMenuEntry[]} existingMenuItems  List of existing menu items.
 * @param  {string} [pluginId]               Plugin id to add. Optional.
 * @returns {IMenuEntry[]}  The new menu, with the entry added.
 */
export function addMenuItem(
    newMenuItem: IMenuItem,
    existingMenuItems: IMenuEntry[],
    pluginId?: string
): IMenuEntry[] {
    // if (api.sys.loadStatus.menuFinalized) {
    //     // Error: Menu already finalized. Assert
    //     throw new Error("Menu already finalized.");
    // }
    if (newMenuItem.path === null) {
        // One of the rare plugins that does't use the menu system.
        return existingMenuItems;
    }

    _convertPathToTextAndPathNames(newMenuItem);
    _extractRankFromText(newMenuItem);
    _setNewMenuItemDefaults(newMenuItem);

    let existingMenuItemsPlaceholder = existingMenuItems;
    for (const pathName of newMenuItem._pathNames as string[]) {
        // Get rank and pathName from text.
        const { rank, text: pathNameWithoutRank } = _getRankFromText(pathName);

        if (
            !_isNameInMenuData(
                existingMenuItemsPlaceholder,
                pathNameWithoutRank
            )
        ) {
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
                throw new Error(
                    `Plugin "${pluginId}" set rank of "${subMenu._text}" menu item to ${rank}, but it is already set to ${subMenu._rank}.`
                );
            }
        }

        existingMenuItemsPlaceholder = subMenu.items;
    }

    // You've gone down all the levels in pathNames, so add the item.
    existingMenuItemsPlaceholder.push(newMenuItem);

    // Return the whole menu-data object.
    return existingMenuItems;
}

/** 
 * Sort menu data by rank, then by text if rank equal. In place, so no need to
 * return anything.
 * 
 * @param  {IMenuEntry[]} menuData  Menu data to sort.
 */
export function menuDataSorted(menuData: IMenuEntry[]) {
    menuData.sort((a: IMenuEntry, b: IMenuEntry) => {
        // Sort the items by rank. Defaults to 5 if not set.
        const a_rank = a._rank !== undefined ? a._rank : 5;
        const b_rank = b._rank !== undefined ? b._rank : 5;
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
    });
}
