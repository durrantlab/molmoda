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

export interface IMenuSubmenu extends IMenuSeparator {
    text: string;
    items: (IMenuSubmenu | IMenuItem)[];
}

export interface IMenuItem extends IMenuSeparator {
    text: string;
    pathNames: string[];
    function?: () => void;
}

// This is where the menu data is actually stored (not in VueX store, because no
// need to save on restart).
export const menuData: (IMenuItem | IMenuSubmenu)[] = [];

// export const menuData: (IMenuItem | IMenuSubmenu)[] = [
//     {
//         text: "Home",
//         type: MenuItemType.ACTION,
//         function: () => {
//             console.log("Home");
//         },
//     },
//     {
//         text: "Link",
//         type: MenuItemType.ACTION,
//         function: () => {
//             console.log("Link");
//         },
//     },
//     {
//         text: "Dropdown",
//         type: MenuItemType.SUBMENU,
//         items: [
//             {
//                 text: "Action",
//                 type: MenuItemType.ACTION,
//                 function: () => {
//                     console.log("Action");
//                 },
//             },
//             {
//                 text: "Dropdow2",
//                 type: MenuItemType.SUBMENU,
//                 items: [
//                     {
//                         text: "Action5",
//                         type: MenuItemType.ACTION,
//                         function: () => {
//                             console.log("Action5");
//                         },
//                     },
//                     {
//                         text: "Dropdow2a",
//                         type: MenuItemType.SUBMENU,
//                         items: [
//                             {
//                                 text: "Action5a",
//                                 type: MenuItemType.ACTION,
//                                 function: () => {
//                                     console.log("Action5a");
//                                 },
//                             },
//                             {
//                                 text: "Action6a",
//                                 type: MenuItemType.ACTION,
//                                 function: () => {
//                                     console.log("Action6a");
//                                 },
//                             },
//                         ],
//                     },
//                     {
//                         text: "Action6",
//                         type: MenuItemType.ACTION,
//                         function: () => {
//                             console.log("Action6");
//                         },
//                     },
//                 ],
//             },
//         ],
//     },
// ];

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
    return menuDat.map((m) => m.text).includes(name);
}

function getSubMenu(
    menuDat: (IMenuItem | IMenuSubmenu)[],
    name: string
): (IMenuItem | IMenuSubmenu)[] {
    return (menuDat.find((m) => m.text === name) as IMenuSubmenu).items;
}

export function addMenuItem(
    menuItem: IMenuItem
) {
    if (api.sys.loadStatus.menuFinalized) {
        // Error: Menu already finalized. Assert
        throw new Error("Menu already finalized.");
    }

    let menuDataToUse = menuData;

    for (const level of menuItem.pathNames) {
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
