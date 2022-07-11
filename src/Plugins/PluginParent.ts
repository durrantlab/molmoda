import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import * as api from "@/Api";
import { Vue } from "vue-class-component";

export abstract class PluginMenuItemClass {
    // All plugins should add a menu item
    abstract menuData: IMenuItem;

    vueComponent: any;
    
    public setupMenus(): void {
        // Do some checks.
        if (this.menuData.function !== undefined) {
            throw new Error("PluginParent: menuData.function is not allowed.");
        }
    
        // Add the menu item
        this.menuData.function = () => { this.vueComponent.start(); }
        api.menus.addItem(this.menuData);
    }
}

export abstract class PluginParent extends Vue {
    // Below is mostly just to ensure that such a plugin is available.
    abstract pluginMenuItemClass: PluginMenuItemClass;

    // All plugins should have a start function.
    abstract start(): void;

    mounted() {
        this.pluginMenuItemClass.vueComponent = this;
    }
}