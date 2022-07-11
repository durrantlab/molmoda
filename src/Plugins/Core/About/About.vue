<template>
<div></div>
</template>

<script lang="ts">
import { PluginParent, PluginMenuItemClass } from "../../PluginParent";
import AboutMenuItem from "./AboutMenu";

export default class AboutPlugin extends PluginParent {
    pluginMenuItemClass = AboutMenuItem as unknown as PluginMenuItemClass;

    start(): void {
        alert("hi");
    }
}
</script>

<style scoped lang="scss">
</style>
