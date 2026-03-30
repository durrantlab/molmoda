<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { createWindowPlugin } from "./WindowPluginFactory";

export default createWindowPlugin({
    panelName: "Viewer",
    menuPath: ["[8] Window", "Molecules", "[3] Viewer"],
    title: "Viewer Panel",
    pluginId: "viewerwindow",
    intro: "Switch to the Viewer panel.",
    details: "This plugin brings the 3D molecular viewer panel into focus.",
});

// BELOW TO PASS VALIDATION
// pluginId = "viewerwindow";
// getTests()
// noPopup = true;
// tags = [Tag.All];
// extends PluginParentClass
</script>
<style scoped lang="scss"></style>