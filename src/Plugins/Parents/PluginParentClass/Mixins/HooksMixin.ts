/* eslint-disable jsdoc/check-tag-names */
import { Vue } from "vue-class-component";

/**
 * HooksMixin
 */
export class HooksMixin extends Vue {
    /**
     * Called right before the plugin popup opens.
     *
     * @param  {any} payload  The payload passed to the popup if it is accessed
     *                        programatically.
     *
     * @return {boolean | void}  If false, the popup will not open (abort).
     *                           Anything else, and the popup will open.
     * @document
     */
    protected onBeforePopupOpen(payload?: any): boolean | void {
        // can be optionally overridden.
        return;
    }

    /**
     * Called right after the plugin popup opens.
     *
     * @document
     */
    protected onPopupOpen(): void {
        // can be optionally overridden.
        return;
    }
}
