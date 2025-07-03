/* eslint-disable jsdoc/check-tag-names */
import { Vue } from "vue-class-component";

/**
 * HooksMixin
 */
export class HooksMixin extends Vue {
    /**
     * Called right before the plugin popup opens. Can be used to initialize the
     * plugin's state.
     *
     * The default implementation supports programmatic execution. If a
     * `payload` object containing `runProgrammatically: true` is passed, other
     * properties of the payload are mapped to the plugin's user arguments, and
     * the plugin's action is triggered without opening a popup. This function
     * can also be overwritten by child plugins (and often is).
     *
     * @param {any} [payload] The payload passed to the plugin, used for UI
     *        initialization or programmatic execution.
     * @return {Promise<boolean | void>} If `false` is returned, the popup will
     *         not open (abort).
     * @document
     */
    protected async onBeforePopupOpen(payload?: any): Promise<boolean | void> {
        // if payload is an object with runProgrammatically=true, set userArgs and bypass popup
        if (
            payload &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            payload.runProgrammatically === true
        ) {
            const progPayload = { ...payload };
            delete progPayload.runProgrammatically;
            for (const key in progPayload) {
                if (Object.prototype.hasOwnProperty.call(progPayload, key)) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    this.setUserArg(key, progPayload[key]);
                }
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.noPopup = true;
        }
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
