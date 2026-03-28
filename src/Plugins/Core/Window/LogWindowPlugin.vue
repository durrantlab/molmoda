<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { createWindowPlugin } from "./WindowPluginFactory";

export default createWindowPlugin({
    panelName: "Log",
    menuPath: ["[8] Window", "Records", "Log"],
    title: "Log Panel",
    pluginId: "logwindow",
    intro: "Switch to the Log panel.",
    details: "This plugin brings the Log panel into focus, where you can see a history of actions and system messages.",
});

// BELOW TO PASS VALIDATION
// getTests()
// noPopup = true;
// tags = [Tag.All];
// extends PluginParentClass
</script>
<style scoped lang="scss"></style>