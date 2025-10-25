<template>
    <button @click="launchTour" class="btn btn-sm btn-outline-primary py-0 px-1 ms-2" style="font-size: 0.7em;">
        <slot>Tour</slot>
    </button>
</template>
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";

/**
 * A button component that launches a tour for a given plugin.
 */
@Options({})
export default class TourLauncher extends Vue {
    @Prop({ required: true }) plugin!: PluginParentClass;
    @Prop({ default: 0 }) testIndex!: number;

    /**
     * Opens a new window/tab to start the tour for the given plugin.
     */
    launchTour() {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set("tour", this.plugin.pluginId);
        if (this.testIndex !== 0) {
            url.searchParams.set("testIndex", this.testIndex.toString());
        }
        window.open(url.toString(), "_blank");
    }
}
</script>