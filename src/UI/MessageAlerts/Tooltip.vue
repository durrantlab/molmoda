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

const allOpenTooltips: {[key: string]: Tooltip} = {};

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
    private id = ""

    testMode = false;

    /**
     * Hides the tooltip.
     */
    hideTip() {
        if (this.tipLoaded && this.tipObj !== null) {
            this.tipLoaded = false;
            this.tipObj.hide();
            delete allOpenTooltips[this.id];
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

                    // Make sure tip is not at 0, 0, a common bug that should be
                    // avoided.
                    // const box = this.tipObj.tip.getBoundingClientRect();
                    // if (box.x === 0 && box.y === 0) {
                    //     this.hideTip();
                    //     return;
                    // }

                    // Make sure all other tool tips close.
                    for (const key in allOpenTooltips) {
                        if (key !== this.id) {
                            allOpenTooltips[key].hideTip();
                        }
                    }

                    // Add this to list of ones that are open.
                    allOpenTooltips[this.id] = this;

                    // Always automatically close after 15 seconds. Probably
                    // buggy by then.
                    setTimeout(() => {
                        this.hideTip();
                    }, 15000);
                    return;
                })
                .catch((err: any) => {
                    // throw "Error loading bootstrap tooltip.";
                    throw err;
                });
        }
    }

    /**
     * Called when the component is mounted.
     */
    mounted() {
        // No tool tips if teting.
        if (isTest) {
            this.testMode = true;
        }

        this.id = Math.random().toString();
    }

    /** mounted function */
    // mounted() {
    // new BSToolTip(this.$refs["tooltip"] as Element);
    // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
