<template>
    <span>
        <span
            v-if="!testMode"
            @mouseover="loadTip"
            @mouseleave="hideTip"
            data-bs-toggle="tooltip"
            :data-bs-placement="placement"
            :title="tip"
            ref="tooltip"
            style="margin: 0; padding: 0"
        >
            <slot></slot>
        </span>
        <span v-else>
            <slot></slot>
        </span>
    </span>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { isTest } from "@/Testing/SetupTests";
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
    private tipObj: any = null;

    testMode = false;

    /**
     * Hides the tooltip.
     */
    hideTip() {
        if (this.tipLoaded && this.tipObj !== null) {
            this.tipObj.hide();
        }
    }

    /**
     * Sets up the tooltip. Dynamic imports, etc.
     */
    loadTip() {
        if (!this.tipLoaded) {
            this.tipLoaded = true;

            dynamicImports.bootstrapTooltip.module
                .then((BSToolTip: any) => {
                    this.tipObj = new BSToolTip(
                        this.$refs["tooltip"] as Element
                    );
                    this.tipObj.show();

                    // Always automatically close after 15 seconds. Probably
                    // buggy by then. NOTE: I think this is solved with
                    // mouseleave event now.
                    // setTimeout(() => {
                    //     this.tipObj.hide();
                    // }, 15000);
                    return;
                })
                .catch((err: any) => {
                    // throw "Error loading bootstrap tooltip.";
                    throw err;
                });
        }
    }

    mounted() {
        // No tool tips if teting.
        if (isTest) {
            this.testMode = true;
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
