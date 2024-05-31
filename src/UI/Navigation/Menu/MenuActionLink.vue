<template>
    <li v-if="isTopLevel" class="nav-item">
        <a class="nav-link" @click="runFunction(menuData)">
            {{ menuData.text }}
        </a>
    </li>
    <li v-else>
        <Tooltip :tip="introductionTxt(menuData.pluginId)" placement="right">
            <a
                :class="'dropdown-item pt-0' + (disabled ? ' disabled' : '')"
                style="padding-bottom: 2px; pointer-events: all"
                @click="runFunction(menuData)"
                :id="'menu-plugin-' + idSlug"
            >
                {{ menuData.text?.replace("_", "") }}
                <div v-if="showHotkey" style="float: right" class="text-muted">
                    {{ hotkeyPrefix }}{{ hotkeyToShow(menuData) }}
                </div>
            </a>
        </Tooltip>
    </li>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

// import "bootstrap/js/dist/collapse";
import { IMenuItem } from "./Menu";
import { dynamicImports } from "@/Core/DynamicImports";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import { loadedPlugins } from "@/Plugins/LoadedPlugins";
import { slugify } from "@/Core/Utils/StringUtils";

let collapseHamburger: any;
let hamburgerMenu: HTMLElement;

/**
 * MenuActionLink component
 */
@Options({
    components: { Tooltip },
})
export default class MenuActionLink extends Vue {
    @Prop() menuData!: IMenuItem;
    @Prop({ default: false }) isTopLevel!: boolean;

    hotkeyPrefix = "Ctrl+";
    // disabled = false;

    /**
     * Gets the introduction text for the plugin.
     *
     * @param {string | undefined}  pluginId The plugin ID.
     * @returns {string} The introduction text for the plugin.
     */
    introductionTxt(pluginId: string | undefined): string {
        if (pluginId === undefined) {
            return "";
        }

        let txt = loadedPlugins[pluginId].intro;

        // Get text, but not any HTML tags.
        txt = txt.replace(/<[^>]*>?/g, "");

        return txt;
    }

    /**
     * Whether the menu item is disabled.
     *
     * @returns {boolean}  Whether the menu item is disabled.
     */
    get disabled(): boolean {
        const checkPluginAllowed = this.menuData.checkPluginAllowed;
        if (checkPluginAllowed) {
            const pluginAllowed = checkPluginAllowed(
                this.$store.state.molecules
            );
            return pluginAllowed !== null;
        }
        return false;
    }

    /**
     * Gets the hot key to show in the menu.
     *
     * @param {IMenuItem} menuData  The menu data.
     * @returns {string}  The hot key to show.
     */
    hotkeyToShow(menuData: IMenuItem): string {
        if (!menuData.hotkey) {
            return "";
        }

        if (menuData.hotkey === "up") {
            return "↑";
        }

        if (menuData.hotkey === "down") {
            return "↓";
        }

        return menuData.hotkey.toUpperCase();
    }

    /**
     * Whether to show the hot key in the menu.
     *
     * @returns {boolean}  Whether to show the hot-key text.
     */
    get showHotkey(): boolean {
        const hotkey = this.menuData.hotkey;
        if (!hotkey) {
            return false;
        }
        if (hotkey === "") {
            return false;
        }

        if (hotkey == "up" || hotkey == "down") {
            return true;
        }

        // Conveniently, hotkey length covers case where hotkey is a long string
        // ("backspace") or an array (multiple hotkeys). In either case, don't
        // want to show it in the menu.
        return hotkey.length === 1;
    }

    /**
     * Gets a slug for the menu text.
     *
     * @returns {string}  The slug.
     */
    get idSlug(): string {
        return slugify(this.menuData.text as string);
    }

    /**
     * Hide all toggles. This is good for regular menu (not hamburger, bigger
     * screens).
     */
    private closeRegularMenu() {
        const dropdownElementList = document.querySelectorAll(
            ".top-level-menu-item"
        );

        dynamicImports.bootstrapDropdown.module
            .then((Dropdown: any) => {
                dropdownElementList.forEach((dropdownToggleEl) =>
                    new Dropdown(dropdownToggleEl).hide()
                );
                return;
            })
            .catch((err) => {
                throw err;
            });
    }

    /**
     * Close the menu. Effective if using hamburger menu (smaller screens).
     */
    private closeHamburgerMenu() {
        if (!hamburgerMenu) {
            hamburgerMenu = document.getElementById(
                "hamburger-button"
            ) as HTMLElement;
        }

        if (hamburgerMenu.offsetWidth > 0 && hamburgerMenu.offsetHeight > 0) {
            dynamicImports.bootstrapCollapse.module
                .then((Collapse: any) => {
                    // Hamburger menu is visible
                    if (!collapseHamburger) {
                        collapseHamburger = new Collapse(
                            document.getElementById(
                                "navbarSupportedContent"
                            ) as HTMLElement
                        );
                    }

                    collapseHamburger.toggle();
                    return;
                })
                .catch((err) => {
                    throw err;
                });
        }
    }

    /**
     * Run the function of the menu item.
     *
     * @param {IMenuItem} item  The menu item.
     */
    runFunction(item: IMenuItem) {
        if (item.function) {
            this.closeRegularMenu();
            this.closeHamburgerMenu();

            // Run the function
            item.function();
        }
    }

    /**
     * Mounted function.
     */
    mounted() {
        // Get the os
        dynamicImports.detectOs.module
            .then((OSDetector) => {
                const os = new OSDetector().detect().os;
                switch (os) {
                    case "macos":
                    case "ios":
                        this.hotkeyPrefix = "⌘ ";
                        break;
                    default:
                        this.hotkeyPrefix = "Ctrl+";
                        break;
                }
                return;
            })
            .catch((err) => {
                throw err;
            });
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
