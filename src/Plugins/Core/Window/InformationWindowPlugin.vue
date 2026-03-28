<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { createWindowPlugin } from "./WindowPluginFactory";

export default createWindowPlugin({
    panelName: "Information",
    menuPath: ["[8] Window", "Molecules", "[7] Information"],
    title: "Information Panel",
    pluginId: "informationwindow",
    intro: "Switch to the Information panel.",
    details: "This plugin brings the Information panel into focus, which displays details about the selected molecule.",
});

// BELOW TO PASS VALIDATION
// getTests()
// noPopup = true;
// tags = [Tag.All];
// extends PluginParentClass
</script>
<style scoped lang="scss"></style>
