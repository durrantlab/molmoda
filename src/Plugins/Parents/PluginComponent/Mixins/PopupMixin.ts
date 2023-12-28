import { delayForPopupOpenClose } from "@/Core/GlobalVars";
import { Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

/**
 * PopupMixin
 */
export class PopupMixin extends Vue {
    @Prop({ required: true }) modelValue!: any; // open

    public openToUse = false;
    public renderInnerPopup = false;

    /**
     * Runs when the user closes the simple message popup.
     */
    onClosed() {
        this.$emit("update:modelValue", false);
        // this.closePopup();
        // this.$emit("onClosed");

        // Reset for next time. Note that (this as any) is ugly!
        // (this as any).setUserInputsToUse((this as any).userArgs);
    }

    /**
     * Watches the modelValue variable (whether to open modal).
     *
     * @param {boolean} newValue  The new value of the open variable.
     */
    @Watch("modelValue")
    onModelValueChange(newValue: boolean) {
        // You must first render the inner plugin before you can open the modal
        if (newValue) {
            this.renderInnerPopup = newValue;
        }

        this.$nextTick(() => {

            this.openToUse = newValue;
    
            this.$emit("update:modelValue", newValue);
    
            // Just opened. If we have user arguments, set focus to first onev after
            // waiting a bit.
            if (newValue && (this as any).userArgsFixed.length > 0) {
                setTimeout(() => {
                    // Note that (this as any) is ugly!
                    const itemId =
                        (this as any).userArgsFixed[0].id +
                        "-" +
                        (this as any).pluginId +
                        "-item";
    
                    const firstInput = document.querySelector(
                        "#" + itemId
                    ) as HTMLInputElement;
                    if (firstInput !== null) {
                        firstInput.focus();
                    }
                }, delayForPopupOpenClose);
            }

            // NOTE: Leaving the component rendered. I would like to unrender
            // it, but it causes problems when the plugin closes and then is
            // followed by an immediate new open. TODO: Could try to debug this
            // in the future.

            // Wait some time before unrendering the inner plugin
            // if (!newValue) {
            //     setTimeout(() => {
            //         this.renderInnerPopup = newValue;
            //     }, delayForPopupOpenClose);
            // }
        })
    }
}
