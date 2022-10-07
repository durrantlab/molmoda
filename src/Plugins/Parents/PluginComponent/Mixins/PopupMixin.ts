import { Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

/**
 * PopupMixin
 */
export class PopupMixin extends Vue {
    @Prop({ required: true }) modelValue!: any; // open

    public openToUse = false;

    /**
     * Runs when the user closes the simple message popup.
     */
    onClosed() {
        this.$emit("update:modelValue", false);
        // this.closePopup();
        // this.$emit("onClosed");

        // Reset for next time. Note that (this as any) is ugly!
        (this as any).setUserInputsToUse((this as any).userInputs);
    }

    /**
     * Watches the modelValue variable (whether to open modal).
     *
     * @param {boolean} newValue  The new value of the open variable.
     */
    @Watch("modelValue")
    onModelValueChange(newValue: boolean) {
        this.openToUse = newValue;
        this.$emit("update:modelValue", newValue);

        // Just opened. If we have user inputs, set focus to first onev after
        // waiting a bit.
        if (newValue && (this as any).userInputsToUse.length > 0) {
           setTimeout(() => {
               // Note that (this as any) is ugly!
               const itemId =
                   (this as any).userInputsToUse[0].id + "-item";

               const firstInput = document.querySelector(
                   "#" + itemId
               ) as HTMLInputElement;
               if (firstInput !== null) {
                   firstInput.focus();
               }
           }, 750);
       }
    }

    // /**
    //  * Closes the popup.
    //  */
    // closePopup() {
    //     this.openToUse = false;
    //     this.$emit("update:modelValue", false);
    // }

    // /**
    //  * Opens the popup.
    //  */
    // openPopup(): void {
    //     this.openToUse = true;
    //     this.$emit("update:modelValue", true);
    // }
}
