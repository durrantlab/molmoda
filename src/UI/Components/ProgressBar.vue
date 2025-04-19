<template>
    <div class="progress-bar-container bg-light hide-on-app-closed">
        <div class="progress" style="height: 20px; border-radius: 0">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                :style="{ width: progressPercent + '%' }" :aria-valuenow="progressPercent" aria-valuemin="0"
                aria-valuemax="100">
                <!-- Conditionally render text only when progress > 0 -->
                <span v-if="displayProgress > 0">
                    {{ displayMessage }} ({{ progressPercent }}%)
                </span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const COMPLETION_PAUSE_MS = 250; // 0.25 seconds
const MIN_DISPLAY_PROGRESS = 0.05; // 5%

/**
 * A simple progress bar component that manages its own display logic,
 * including minimum display, completion pause, and inactivity timeout.
 * The gray track is always visible, the colored bar shows progress.
 */
@Options({})
export default class ProgressBar extends Vue {
    /** The actual highest progress value (0-1) from the parent. Defaults to 0. */
    @Prop({ type: Number, default: 0 })
    progress!: number;

    /** Indicates if any job is actively running in the parent. Defaults to false. */
    @Prop({ type: Boolean, default: false })
    active!: boolean;

    // --- Internal State ---
    // displayVisible is removed - container is always visible
    displayProgress = 0; // The progress value shown (0-1), controls the inner bar width
    displayMessage = "";
    completionPauseActive = false;
    completionPauseTimeout: number | null = null;
    inactivityTimeout: number | null = null;
    // ----------------------

    /**
     * Calculates the display percentage (0-100).
       *
     * @returns {number} The display progress as an integer percentage.
       */
    get progressPercent(): number {
        const percent = Math.round(this.displayProgress * 100);
        return Math.max(0, Math.min(100, percent)); // Clamp
    }

    /** Resets the internal state (progress/message/timers). */
    private resetInternalState() {
        // Don't change visibility, container is always visible
        this.displayProgress = 0;
        this.displayMessage = "";
        this.completionPauseActive = false;
        this.clearCompletionPauseTimeout();
        this.clearInactivityTimeout();
    }

    /** Clears the inactivity timeout. */
    private clearInactivityTimeout() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }
    }

    /** Starts or restarts the inactivity timeout. */
    private startInactivityTimeout() {
        this.clearInactivityTimeout();
        this.inactivityTimeout = window.setTimeout(() => {
            console.warn("Progress bar timed out due to inactivity.");
            this.resetInternalState(); // Reset if inactive
            this.inactivityTimeout = null;
        }, INACTIVITY_TIMEOUT_MS);
    }

    /** Clears the completion pause timeout. */
    private clearCompletionPauseTimeout() {
        if (this.completionPauseTimeout) {
            clearTimeout(this.completionPauseTimeout);
            this.completionPauseTimeout = null;
        }
    }

    /** Initiates the 100% completion pause. */
    private startCompletionPause() {
        this.clearInactivityTimeout();
        this.cancelCompletionPause(); // Clear any previous pause

        this.displayProgress = 1; // Force 100% width
        this.displayMessage = "Finishing...";
        // displayVisible is always true now
        this.completionPauseActive = true;

        this.completionPauseTimeout = window.setTimeout(() => {
            this.completionPauseActive = false; // End pause state
            this.completionPauseTimeout = null;
            // Reset progress and message, bar stays visible but empty
            if (!this.active) { // Only reset if no new job started
                this.displayProgress = 0;
                this.displayMessage = "";
            } else {
                // If a job started during the pause, re-evaluate state
                this.evaluateState();
            }
        }, COMPLETION_PAUSE_MS);
    }

    /** Cancels an active completion pause. */
    private cancelCompletionPause() {
        this.clearCompletionPauseTimeout();
        this.completionPauseActive = false;
    }

    /** Evaluates the current state based on props and updates internal display state. */
    private evaluateState() {
        // If pausing, do nothing here, let the timeout handle it.
        if (this.completionPauseActive) {
            return;
        }

        // const wasVisible = this.displayProgress > 0; // Use progress > 0 as proxy for visibility

        if (this.active) {
            // --- Jobs are active ---
            const potentialNewProgress = Math.max(MIN_DISPLAY_PROGRESS, this.progress);
            // Only update if progress increases or if bar was previously empty
            if (potentialNewProgress > this.displayProgress || this.displayProgress === 0) {
                this.displayProgress = potentialNewProgress;
            }
            this.displayMessage = "Job running";
            // displayVisible is always true now
            this.startInactivityTimeout(); // Keep resetting inactivity timer
            this.cancelCompletionPause(); // Ensure no pause is active

        } else {
            // --- No jobs are active ---
            this.clearInactivityTimeout(); // Stop inactivity timer

            // Check if the internal bar was showing progress before this update
            if (this.displayProgress > 0) {
                // Jobs just finished (internal bar was > 0, now inactive)
                this.startCompletionPause(); // Start the 100% pause
            } else {
                // Was already inactive and bar was empty, ensure reset state
                this.resetInternalState();
            }
        }
    }


    /** Watches the 'active' prop. Calls evaluateState on change. */
    @Watch("active")
    onActiveChanged() {
        this.evaluateState();
    }

    /** Watches the 'progress' prop. Calls evaluateState on change. */
    @Watch("progress")
    onProgressChanged() {
        this.evaluateState();
    }

    /** Lifecycle hook: Clear timeouts when component is destroyed. */
    beforeUnmount() {
        this.clearInactivityTimeout();
        this.clearCompletionPauseTimeout();
    }

    /** Lifecycle hook: Initialize state when component is created/mounted. */
    mounted() {
        this.evaluateState(); // Set initial state based on props
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
    /* Track color */
    overflow: hidden;
    /* Important for the inner bar display */
    height: 20px;
    /* Match inner bar height */
    border-radius: 0;
    /* Remove default rounding if desired */
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
    /* Ensure bar starts from the left */
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Ensure text is only visible when the bar has width */
.progress-bar span {
    display: inline-block;
    /* Or block */
}
</style>