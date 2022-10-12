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
        (this as any).setUserInputsToUse((this as any).userArgs);
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

        // Just opened. If we have user arguments, set focus to first onev after
        // waiting a bit.
        if (newValue && (this as any).userArgsToUse.length > 0) {
           setTimeout(() => {
               // Note that (this as any) is ugly!
               const itemId =
                   (this as any).userArgsToUse[0].id + "-item";

               const firstInput = document.querySelector(
                   "#" + itemId
               ) as HTMLInputElement;
               if (firstInput !== null) {
                   firstInput.focus();
               }
           }, 750);
       }
    }
}
