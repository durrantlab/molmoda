/* eslint-disable jsdoc/check-tag-names */
import { Vue } from "vue-class-component";

/**
 * HooksMixin
 */
export class HooksMixin extends Vue {
    /**
     * Called right before the plugin popup opens.
     *
     * @document
     * @returns {boolean | Promise<boolean> | void}  If `onBeforePopupOpen`
     *     returns false or a promise that resolves false, the popup will not
     *     open. This is useful for those rare occasions when you need to stop
     *     an opening plugin. If void (or true), the popup will still open.
     */
    protected onBeforePopupOpen(): boolean | Promise<boolean> | void {
        return true;
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
