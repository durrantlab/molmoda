<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { createWindowPlugin } from "./WindowPluginFactory";

export default createWindowPlugin({
    panelName: "Data",
    menuPath: ["[8] Window", "Molecules", "[8] Data"],
    title: "Data Panel",
    pluginId: "datawindow",
    intro: "Switch to the Data panel.",
    details: "This plugin brings the Data panel into focus, where the user can view molecular properties and other tabular data.",
});

// BELOW TO PASS VALIDATION
// getTests()
// noPopup = true;
// tags = [Tag.All];
// extends PluginParentClass
</script>

<style scoped lang="scss"></style>
