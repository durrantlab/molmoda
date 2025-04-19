<template>
    <div class="progress-bar-container bg-light hide-on-app-closed">
        <div class="progress" style="height: 20px; border-radius: 0">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                :style="{ width: progressPercent + '%' }" :aria-valuenow="progressPercent" aria-valuemin="0"
                aria-valuemax="100">
                {{ message }} ({{ progressPercent }}%)
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * A simple progress bar component using Bootstrap styles.
 */
@Options({})
export default class ProgressBar extends Vue {
    /** The progress value, expected to be between 0 and 1. Defaults to 0. */
    @Prop({ type: Number, default: 0 })
    progress!: number;

    /** An optional message to display overlayed on the progress bar. Defaults to empty string. */
    @Prop({ type: String, default: "" })
    message!: string;

    /**
     * Calculates the progress percentage (0-100) from the progress prop (0-1).
     * Ensures the value is clamped between 0 and 100.
     *
     * @returns {number} The progress as an integer percentage.
     */
    get progressPercent(): number {
        const percent = Math.round(this.progress * 100);
        return Math.max(0, Math.min(100, percent)); // Clamp between 0 and 100
    }
}
</script>

<style scoped lang="scss">
.progress-bar-container {
    width: 100%;
    /* Optional: Add styling like padding, borders etc. */
    // padding: 5px 0;
    border-top: 1px solid #dee2e6;
    /* Subtle top border */
    z-index: 50;
    /* Ensure it's above some elements but below menus/modals */
    flex-shrink: 0;
    /* Prevent shrinking when in a flex container */
}

.progress {
    background-color: #e9ecef;
    /* Lighter background for the track */
    overflow: hidden;
    /* Hide overflow for rounded corners if any */
}

.progress-bar {
    /* Customize bar appearance */
    background-color: #0d6efd;
    /* Bootstrap primary blue */
    color: white;
    text-align: center;
    white-space: nowrap;
    font-size: 0.85rem;
    line-height: 20px;
    /* Match height for vertical centering */
    transition: width 0.3s ease-in-out;
    /* Smooth transition for width changes */
}
</style>