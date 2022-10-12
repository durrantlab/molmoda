/* eslint-disable jsdoc/check-tag-names */
import { Vue } from "vue-class-component";

/**
 * PopupMixin
 */
export class PopupMixin extends Vue {
    open = false;

    // Occasionally, you might need a plugin that doesn't require a popup (e.g.,
    // undo/redo). In that case, set this to true.
    protected noPopup = false;

    /**
     * Closes the popup.
     * 
     * @helper
     * @document
     */
    protected closePopup(): void {
        this.open = false;
        // this.$emit("update:modelValue", false);
    }

    /**
     * Opens the popup.
     * 
     * @helper
     * @document
     */
    protected openPopup(): void {
        this.open = true;

        // If no popup, don't change open and just submit jobs automatically.
        if (this.noPopup) {
            this.open = false;

            // Note: (this as any) is ugly.
            (this as any).onPopupDone();
        }

        // this.$emit("update:modelValue", true);
    }
}
