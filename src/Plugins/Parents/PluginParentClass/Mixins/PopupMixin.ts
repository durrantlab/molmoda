import type { PluginParentClass } from "../PluginParentClass";

/**
 * PopupMixin
 */
export class PopupMixin {
    protected parent: PluginParentClass;

    /**
     * Closes the popup.
     * @helper
     * @document
     */
    closePopup(): void {
        this.parent.open = false;
        // this.$emit("update:modelValue", false);
    }

    /**
     * Opens the popup.
     * @helper
     * @document
     */
    public openPopup(): void {
        this.parent.open = true;

        // If no popup, don't change open and just submit jobs automatically.
        if (this.parent.noPopup) {
            this.parent.open = false;

            this.parent.onPopupDone();
        }

        // this.$emit("update:modelValue", true);
    }

    /**
     * Constructor
     * @param {PluginParentClass} parent The parent plugin class instance, used
     *     to access shared state and functions.
     */
    constructor(parent: PluginParentClass) {
        this.parent = parent;
    }
}
