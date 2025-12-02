<template>
 <a :class="linkClass" @click.prevent="goToMenuPath" v-html="titleToUse"></a>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import MenuLevel1 from "./Menu/MenuLevel1.vue";

import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { loadedPlugins } from "@/Plugins/LoadedPlugins";
import { messagesApi } from "@/Api/Messages";
import { pluginsApi } from "@/Api/Plugins";
import { delayForPopupOpenClose } from "@/Core/GlobalVars";

/**
 * PluginPathLink component
 */
@Options({
    components: {
        MenuLevel1,
    },
})
export default class PluginPathLink extends Vue {
    @Prop({ required: true }) plugin!: PluginParentClass | string;
    @Prop({ default: undefined }) title!: string | undefined;
 @Prop({ default: "link-primary" }) linkClass!: string;
    pluginToUse: PluginParentClass | null = null;

    /**
     * Gets the menu path to display for the plugin.
     *
     * @returns {string} The menu path to display, formatted as a string.
     */
    get titleToUse(): string {
        if (this.pluginToUse === null) {
            // Not read yet.
            return "";
        }

        if (this.title !== undefined) {
            return this.title;
        }

        // If null, return ""
        if (this.pluginToUse.menuPath === null) {
            return "";
        }

        // If it's an array, convert it to a string.
        let menuPath = Array.isArray(this.pluginToUse.menuPath)
            ? this.pluginToUse.menuPath.join("/")
            : this.pluginToUse.menuPath;

        // Remove anything like [#], where # is a number
        menuPath = menuPath.replace(/\[\d+\] /g, "");

        menuPath = menuPath.replace(/\//g, " &rarr; ");

        return menuPath;
    }

    /**
     * Open the plugin specified by the component menu path.
     */
    goToMenuPath() {
        pluginsApi.closeAllPlugins();

        const waitId = messagesApi.startWaitSpinner();

        setTimeout(() => {
            if (this.pluginToUse !== null) {
                this.pluginToUse.menuOpenPlugin();
                messagesApi.stopWaitSpinner(waitId);
            }
        }, delayForPopupOpenClose);
    }
    
    /**
     * When the component is mounted.
     */
    mounted() {
        if (typeof this.plugin === "string") {
            // Keep checking until plugin is available.
            const interval = setInterval(() => {
                const plugin = loadedPlugins[this.plugin as string];
                if (plugin !== undefined) {
                    this.pluginToUse = plugin;
                    clearInterval(interval);
                }
            }, 100);
        } else {
            this.pluginToUse = this.plugin;
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
