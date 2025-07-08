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
            // NOTE: The focus logic has been removed from here and moved to Popup.vue,
            // where it is handled by the 'shown.bs.modal' event.

            // Wait some time before unrendering the inner plugin
            // if (!newValue) {
            //     setTimeout(() => {
            //         this.renderInnerPopup = newValue;
            //     }, delayForPopupOpenClose);
            // }
        })
    }
}
