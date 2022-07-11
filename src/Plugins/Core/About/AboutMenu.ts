import { PluginMenuItemClass } from "@/Plugins/PluginParent";
import { IMenuItem, MenuItemType } from "@/UI/Navigation/Menu/Menu";

class AboutMenuItem extends PluginMenuItemClass {
    menuData: IMenuItem = {
        text: "About",
        type: MenuItemType.ACTION,
        pathNames: ["Biotite"],
    };
}

export default new AboutMenuItem();