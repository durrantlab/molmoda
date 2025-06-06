<template>
    <span>
        <span v-if="!testMode" @mouseover="loadTip" @mouseleave="hideTip" data-bs-toggle="tooltip"
            :data-bs-placement="placement" :title="tip" ref="tooltip" style="margin: 0; padding: 0">
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

const allOpenTooltips: { [key: string]: Tooltip } = {};

/**
 * Tooltip component with enhanced flicker prevention
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
     * Sets up the tooltip with enhanced flicker prevention
     */
    async loadTip() {
        if (!this.tipLoaded) {
            this.tipLoaded = true;

            try {
                const BSToolTip = await dynamicImports.bootstrapTooltip.module;
                const element = this.$refs["tooltip"] as Element;
                this.tipObj = new BSToolTip(element);

                // Listen for Bootstrap's positioning event for optimal timing
                element.addEventListener('inserted.bs.tooltip', () => {
                    // Validate immediately when tooltip is inserted into DOM
                    setTimeout(() => {
                        if (!this.validateTooltip()) {
                            this.hideTip();
                            return;
                        }

                        // Make sure all other tooltips close
                        for (const key in allOpenTooltips) {
                            if (key !== this.id) {
                                allOpenTooltips[key].hideTip();
                            }
                        }

                        // Add this to list of ones that are open
                        allOpenTooltips[this.id] = this;

                        // Set up periodic validation
                        this.validationInterval = setInterval(() => {
                            if (!this.validateTooltip()) {
                                this.hideTip();
                            }
                        }, 500) as unknown as number;

                        // Auto-close after 15 seconds
                        setTimeout(() => {
                            this.hideTip();
                        }, 15000);
                    }, 10); // Very small delay to allow positioning
                });

                // Also add immediate validation as fallback
                this.tipObj.show();

                // Immediate check right after show() as additional safeguard
                setTimeout(() => {
                    if (!this.validateTooltip()) {
                        this.hideTip();
                    }
                }, 1);
            } catch (err: any) {
                this.tipLoaded = false;
                throw err;
            }
        }
    }

    /**
     * Called when the component is mounted.
     */
    mounted() {
        // No tooltips if testing
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

<style scoped lang="scss">
// CSS-based flicker prevention - hide tooltips at 0,0 position
:deep(.tooltip) {

    // Hide tooltips that are positioned at 0,0 (common Bootstrap bug)
    &[style*="left: 0px"][style*="top: 0px"],
    &[style*="left:0px"][style*="top:0px"],
    &[style*="left: 0"][style*="top: 0"] {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    // Also catch transform-based positioning at origin
    &[style*="transform: translate3d(0px, 0px"],
    &[style*="transform: translate(0px, 0px"] {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    // Smooth transition when tooltip becomes visible
    transition: opacity 0.1s ease-in-out;
}
</style>