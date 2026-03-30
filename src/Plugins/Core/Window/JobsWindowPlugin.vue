<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import { createWindowPlugin } from "./WindowPluginFactory";

export default createWindowPlugin({
    panelName: "Jobs",
    menuPath: ["[8] Window", "Records", "Jobs"],
    title: "Jobs Panel",
    pluginId: "jobswindow",
    intro: "Switch to the Jobs panel.",
    details: "This plugin brings the Jobs panel into focus, allowing you to monitor the progress of background tasks.",
});

// BELOW TO PASS VALIDATION
// pluginId = "jobswindow";
// getTests()
// noPopup = true;
// tags = [Tag.All];
// extends PluginParentClass
</script>
<style scoped lang="scss"></style>