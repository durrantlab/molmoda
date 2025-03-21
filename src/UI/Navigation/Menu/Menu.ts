import { loadedPlugins } from "@/Plugins/LoadedPlugins";
import { matchesTag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { Vue } from "vue-class-component";

export type IMenuEntry = IMenuItem | IMenuSubmenu;

export enum MenuItemType {
    Action,
    Submenu,
    Separator,
}

export interface IMenuSeparator {
    type: MenuItemType;
}

export interface IMenuSubmenu {
    // This doesn't have an action, but contains items that may have actions (or
    // themselves be other submenus).

    // Using text to match IMenuItem.
    text: string;
    items: IMenuEntry[];
    type: MenuItemType;
    _rank?: number;
}

export interface IMenuItem {
    path: string[] | string | undefined; // Directory structure, ending in text label
    function?: () => void;
    checkPluginAllowed?: (_?: any) => string | boolean;
    type?: MenuItemType; // If absent, will assume MenuItemType.ACTION
    hotkey?: string;
    pluginId?: string;
    text?: string;

    // Below used internally, not from plugin.
    _rank?: number;
    _pathNames?: string[];
}

export interface IMenuPathInfo {
    rank: number | undefined;
    text: string;
}

/**
 * MenuLevelParent component
 */
export class MenuLevelParent extends Vue {
    /**
     * Determines if a menu item is an action.
     *
     * @param {IMenuEntry | IMenuSeparator} item  The menu item to check.
     * @returns {boolean} True if the item is an action.
     */
    isAction(item: IMenuEntry | IMenuSeparator): boolean {
        return item.type === MenuItemType.Action;
    }

    /**
     * Determines if a menu item is a separator.
     *
     * @param {IMenuEntry | IMenuSeparator} item  The menu item to check.
     * @returns {boolean} True if the item is a separator.
     */
    isSeparator(item: IMenuEntry | IMenuSeparator): boolean {
        return item.type === MenuItemType.Separator;
    }

    /**
     * Gets the submenu items for a menu item. They are sorted.
     *
     * @param {IMenuEntry} item  The menu item.
     * @returns {IMenuEntry[]}  The submenu items.
     */
    getItems(item: IMenuEntry): IMenuEntry[] {
        const {items} = item as IMenuSubmenu;
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
    return menuDat.map((m: IMenuEntry) => m.text).includes(name);
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
        (m) => (m as IMenuSubmenu).text === name
    ) as IMenuSubmenu;
}

/**
 * Given any kind of menu path (string[], string, etc.), returns the menu path
 * info.
 *
 * @param  {string[]|string|null|undefined} menuPath  Menu path.
 * @returns {IMenuPathInfo}  Menu path info.
 */
export function processMenuPath(
    menuPath: string[] | string | null | undefined
): IMenuPathInfo[] | null {
    if (menuPath === null || menuPath === undefined) {
        return null;
    }

    if (typeof menuPath === "string") {
        menuPath = menuPath.split("/");
    }

    // If you get here, it's an array of strings.

    // Extract the rank, if any.
    return menuPath.map((m) => _extractRankFromText(m));
}

/**
 * Extract the rank in menu text, if any.
 *
 * @param  {string} text  Text to extract rank from.
 * @returns {IMenuPathInfo} Contains both the rank and the text with ranked removed.
 */
function _extractRankFromText(text: string): IMenuPathInfo {
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
 * Sets defaults on menu items, for cases when not specified in plugins. All
 * this in place, so no need to return anything.
 *
 * @param  {IMenuItem} newMenuItem  Menu item, with defaults set.
 */
function _setNewMenuItemDefaults(newMenuItem: IMenuItem) {
    // If type is not set, default to MenuItemType.ACTION.
    if (newMenuItem.type === undefined) {
        newMenuItem.type = MenuItemType.Action;
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

    // If tags don't match, don't add the menu item.
    if (pluginId !== undefined) {
        const plugin = loadedPlugins[pluginId as string]
        const {tags} = plugin;
        if (!matchesTag(tags)) {
            return existingMenuItems;
        }
    }

    // Plugin is excluded per the plugin user parameter
    // if (
    //     pluginId !== undefined &&
    //     LoadedPlugins.alwaysEnabledPlugins.indexOf(pluginId) === -1
    // ) {
    //     return existingMenuItems;
    // }

    const menuPathInfo = processMenuPath(newMenuItem.path);
    const actionItem = menuPathInfo?.pop();

    // Separate path data to _text and _pathNames rather than path.
    newMenuItem.text = actionItem?.text;
    newMenuItem._pathNames = menuPathInfo?.map((m) => m.text);
    newMenuItem.path = undefined;

    // Add rank too
    newMenuItem._rank = actionItem?.rank;

    _setNewMenuItemDefaults(newMenuItem);

    let existingMenuItemsPlaceholder = existingMenuItems;
    for (let i = 0; i < (menuPathInfo as IMenuPathInfo[]).length; i++) {
        // Get rank and pathName from text.
        const pathNameWithoutRank = (menuPathInfo as IMenuPathInfo[])[i].text;
        const {rank} = (menuPathInfo as IMenuPathInfo[])[i];

        if (
            !_isNameInMenuData(
                existingMenuItemsPlaceholder,
                pathNameWithoutRank
            )
        ) {
            // This level doesn't exist, so add it.
            existingMenuItemsPlaceholder.push({
                type: MenuItemType.Submenu,
                text: pathNameWithoutRank,
                items: [],
                _rank: rank,
            } as IMenuSubmenu);
        }

        const subMenu = _getSubMenu(
            existingMenuItemsPlaceholder,
            pathNameWithoutRank
        );

        // Check whether to update rank.
        if (rank !== undefined) {
            if (subMenu._rank === undefined) {
                subMenu._rank = rank;
            } else if (subMenu._rank !== rank) {
                // Error: Rank already set. Assert
                throw new Error(
                    `Plugin "${pluginId}" set rank of "${subMenu.text}" menu item to ${rank}, but it is already set to ${subMenu._rank}.`
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
        const a_text = a.text as string;
        const b_text = b.text as string;
        if (a_text < b_text) {
            return -1;
        }
        if (a_text > b_text) {
            return 1;
        }

        return 0;
    });
}
