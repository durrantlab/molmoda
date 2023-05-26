<template>
    <span
        @mouseover="loadTip"
        data-bs-toggle="tooltip"
        :data-bs-placement="placement"
        :title="tip"
        ref="tooltip"
        style="margin: 0; padding: 0"
    >
        <slot></slot>
    </span>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
// import BSToolTip from "bootstrap/js/dist/tooltip";

/**
 * Tooltip component
 */
@Options({
    components: {},
})
export default class Tooltip extends Vue {
    @Prop({ required: true }) tip!: string;
    @Prop({ default: "top" }) placement!: string;

    private tipLoaded = false;

    /**
     * Sets up the tooltip. Dynamic imports, etc.
     */
    loadTip() {
        if (!this.tipLoaded) {
            this.tipLoaded = true;

            dynamicImports.bootstrapTooltip.module
                .then((BSToolTip: any) => {
                    const tip = new BSToolTip(this.$refs["tooltip"] as Element);
                    tip.show();
                    return;
                })
                .catch((err: any) => {
                    // throw "Error loading bootstrap tooltip.";
                    throw err;
                });
        }
    }

    /** mounted function */
    // mounted() {
    // new BSToolTip(this.$refs["tooltip"] as Element);
    // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
