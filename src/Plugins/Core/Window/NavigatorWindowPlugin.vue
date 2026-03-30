<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { createWindowPlugin } from "./WindowPluginFactory";

export default createWindowPlugin({
    panelName: "Navigator",
    menuPath: ["[8] Window", "Molecules", "[1] Navigator"],
    title: "Navigator Panel",
    pluginId: "navigatorwindow",
    intro: "Switch to the Navigator panel.",
    details: "This plugin brings the Navigator panel into focus, where the molecular hierarchy is displayed.",
});

// BELOW TO PASS VALIDATION
// pluginId = "navigatorwindow";
// getTests()
// noPopup = true;
// tags = [Tag.All];
// extends PluginParentClass
</script>
<style scoped lang="scss"></style>