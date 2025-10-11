<template>
    <button @click="launchTour" class="btn btn-sm btn-outline-primary py-0 px-1 ms-2" style="font-size: 0.7em;">
        <slot>Tour</slot>
    </button>
</template>
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import * as api from "@/Api";

/**
 * A button component that launches a tour for a given plugin.
 */
@Options({})
export default class TourLauncher extends Vue {
    @Prop({ required: true }) plugin!: PluginParentClass;
    @Prop({ default: 0 }) testIndex!: number;

    /**
     * Closes the parent plugin's popup and then launches the tour plugin.
     */
    launchTour() {
        // The parent component (e.g., HelpPlugin) is expected to have a closePopup method.
        const parent = this.$parent as { closePopup?: () => void };
        if (parent && typeof parent.closePopup === "function") {
            parent.closePopup();
        } else {
            // Fallback: if the parent context is not as expected, close all plugins.
            api.plugins.closeAllPlugins();
        }

        setTimeout(() => {
            api.tour.startTour(this.plugin, this.testIndex);
        }, 300); // Delay to allow the closing animation to complete
    }
}
</script>