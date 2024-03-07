<template>
    <span>
        <font-awesome-icon v-if="isFaIcon" :icon="icon" />
        <div v-else v-html="svg" class="svg-icon"></div>
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { dynamicImports } from "@/Core/DynamicImports";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

const cachedIcons: { [key: string]: string } = {};

/**
 * Icon component
 */
@Options({
    components: {},
})
export default class Icon extends Vue {
    @Prop({ required: true }) icon!: string[] | string;

    svg = "";

    /**
     * Whether the icon is a Font Awesome icon.
     *
     * @returns {boolean} Whether the icon is a Font Awesome icon.
     */
    get isFaIcon() {
        return this.icon instanceof Array;
    }

    /**
     * Update the icon when it changes.
     */
    @Watch("icon")
    onIconChange() {
        this.updateIcon();
    }

    /**
     * Update the icon. If it's a Font Awesome icon, do nothing. If it's an SVG,
     * fetch it and cache it.
     */
    async updateIcon() {
        if (!this.isFaIcon) {
            const icon = this.icon as string;
            if (!cachedIcons[icon]) {
                cachedIcons[icon] = "";

                // Fetch the icon
                const axios = await dynamicImports.axios.module;
                const resp = await axios.get(icon, {
                    responseType: "text",
                });

                const svgTxt = resp.data;

                cachedIcons[icon] = svgTxt;
                this.svg = svgTxt;
            } else {
                // Use the cached icon
                this.svg = cachedIcons[icon];
            }
        }
    }

    /**
     * Update the icon when the component is mounted.
     */
    mounted() {
        this.updateIcon();
    }
}
</script>

<style lang="scss" scoped>
.svg-icon {
    // This is a pretty hacky solution to get the half eye icon to be positioned
    // correctly.
    width: 31px;
    margin-left: -4px;
    margin-top: -6.75px;
}
</style>
