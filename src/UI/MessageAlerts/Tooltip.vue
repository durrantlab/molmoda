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
    private validationInterval: number | null = null;

    testMode = false;

    /**
     * Validates tooltip position and target existence
     *
     * @returns {boolean} True if tooltip is valid, false otherwise.
     */
    private validateTooltip(): boolean {
        if (!this.tipObj || !this.tipObj.tip) {
            return false;
        }

        // Check if the target element still exists in the DOM
        const targetElement = this.$refs["tooltip"] as Element;
        if (!targetElement || !document.contains(targetElement)) {
            return false;
        }

        // Check tooltip position - if at 0,0 it's likely a positioning bug
        const box = this.tipObj.tip.getBoundingClientRect();
        return !(box.x === 0 && box.y === 0);
    }

    /**
     * Hides the tooltip.
     */
    hideTip() {
        if (this.tipLoaded && this.tipObj !== null) {
            this.tipLoaded = false;
            this.tipObj.hide();
            delete allOpenTooltips[this.id];
            
            // Clear validation interval
            if (this.validationInterval) {
                clearInterval(this.validationInterval);
                this.validationInterval = null;
            }
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

                    // Validate tooltip after a brief delay to allow positioning
                    setTimeout(() => {
                        if (!this.validateTooltip()) {
                            this.hideTip();
                            return;
                        }

                    // Make sure all other tool tips close.
                    for (const key in allOpenTooltips) {
                        if (key !== this.id) {
                            allOpenTooltips[key].hideTip();
                        }
                    }

                    // Add this to list of ones that are open.
                    allOpenTooltips[this.id] = this;

                        // Set up periodic validation to check if target still exists
                        // and tooltip is properly positioned
                        this.validationInterval = setInterval(() => {
                            if (!this.validateTooltip()) {
                                this.hideTip();
                            }
                        }, 500) as unknown as number; // Check every 500ms

                        // Always automatically close after 15 seconds
                    setTimeout(() => {
                        this.hideTip();
                    }, 15000);
                    }, 100); // Small delay to allow Bootstrap to position the tooltip

                    return;
                })
                .catch((err: any) => {
                    this.tipLoaded = false; // Reset flag on error
                    throw err;
                });
        }
    }

    /**
     * Called when the component is mounted.
     */
    mounted() {
        // No tool tips if testing.
        if (isTest) {
            this.testMode = true;
        }

        this.id = Math.random().toString();
    }

    /**
     * Called when component is about to be unmounted
     */
    beforeUnmount() {
        // Clean up tooltip and interval when component is destroyed
        this.hideTip();
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>