import { Vue } from "vue-class-component";

/**
 * HooksMixin
 */
export class HooksMixin extends Vue {
    /**
     * Runs before the popup opens. Children can optionally override.
     */
    beforePopupOpen() {
        return;
    }

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     * Children can optionally override.
     */
    onPopupOpen() {
        // can be optionally overridden.
        return;
    }
}
