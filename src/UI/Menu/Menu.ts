import { Vue } from "vue-class-component";
import * as api from "../../Api";

export enum MenuItemType {
    ACTION,
    SUBMENU,
    SEPARATOR,
}

export interface IMenuSeparator {
    type: MenuItemType;
}

export interface IMenuSubmenu extends IMenuSeparator {
    text: string;
    items: (IMenuSubmenu | IMenuAction)[];
}

export interface IMenuAction extends IMenuSeparator {
    text: string;
    function: () => void;
}

export const menuData: (IMenuAction | IMenuSubmenu)[] = [
    {
        text: "Home",
        type: MenuItemType.ACTION,
        function: () => {
            console.log("Home");
        },
    },
    {
        text: "Link",
        type: MenuItemType.ACTION,
        function: () => {
            console.log("Link");
        },
    },
    {
        text: "Dropdown",
        type: MenuItemType.SUBMENU,
        items: [
            {
                text: "Action",
                type: MenuItemType.ACTION,
                function: () => {
                    console.log("Action");
                },
            },
            {
                text: "Dropdow2",
                type: MenuItemType.SUBMENU,
                items: [
                    {
                        text: "Action5",
                        type: MenuItemType.ACTION,
                        function: () => {
                            console.log("Action5");
                        },
                    },
                    {
                        text: "Dropdow2a",
                        type: MenuItemType.SUBMENU,
                        items: [
                            {
                                text: "Action5a",
                                type: MenuItemType.ACTION,
                                function: () => {
                                    console.log("Action5a");
                                },
                            },
                            {
                                text: "Action6a",
                                type: MenuItemType.ACTION,
                                function: () => {
                                    console.log("Action6a");
                                },
                            },
                        ],
                    },
                    {
                        text: "Action6",
                        type: MenuItemType.ACTION,
                        function: () => {
                            console.log("Action6");
                        },
                    },
                ],
            },
        ],
    },
];

export class MenuLevelParent extends Vue {
    isAction(item: IMenuAction | IMenuSubmenu | IMenuSeparator): boolean {
        return item.type === MenuItemType.ACTION;
    }

    isSeparator(item: IMenuAction | IMenuSubmenu | IMenuSeparator): boolean {
        return item.type === MenuItemType.SEPARATOR;
    }

    getItems(item: IMenuAction | IMenuSubmenu): (IMenuAction | IMenuSubmenu)[] {
        return (item as IMenuSubmenu).items;
    }
}

function menuDataHasName(
    menuDat: (IMenuAction | IMenuSubmenu)[],
    name: string
): boolean {
    return menuDat.map((m) => m.text).includes(name);
}

function getSubMenu(
    menuDat: (IMenuAction | IMenuSubmenu)[],
    name: string
): (IMenuAction | IMenuSubmenu)[] {
    return (menuDat.find((m) => m.text === name) as IMenuSubmenu).items;
}

export function addMenuItem(
    menuItem: IMenuAction,
    level1: string,
    level2?: string,
    level3?: string
) {
    if (api.sys.loadStatus.menuFinalized()) {
        // Error: Menu already finalized. Assert
        throw new Error("Menu already finalized.");
    }

    let menuDataToUse = menuData;

    for (const level of [level1, level2, level3]) {
        if (level) {
            if (!menuDataHasName(menuDataToUse, level)) {
                menuDataToUse.push({
                    type: MenuItemType.SUBMENU,
                    text: level,
                    items: [],
                } as IMenuSubmenu);
            }
            menuDataToUse = getSubMenu(menuDataToUse, level);
        } else {
            break;
        }
    }

    menuDataToUse.push(menuItem);
}
