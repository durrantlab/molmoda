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
     */
    protected onBeforePopupOpen() {
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
