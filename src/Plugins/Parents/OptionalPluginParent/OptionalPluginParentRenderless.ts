import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { collapseFormElementArray, IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { makeMoleculeInput } from "@/UI/Forms/MoleculeInputParams/MakeMoleculeInput";
import { PopupPluginParentRenderless } from "../PopupPluginParent/PopupPluginParentRenderless";

/**
 * OptionalPluginParent
 */
export abstract class OptionalPluginParentRenderless extends PopupPluginParentRenderless {
    // Note that this isn't reactive (shouldn't be). But children must redefine
    // it.
    // userInputs: FormElement[] = [];

    public openToUse = false;
    public userInputsToUse: FormElement[] = [];

    /**
     * Runs when the user closes the simple message popup.
     */
    onClosed() {
        this.$emit("update:modelValue", false);
    }

    /**
     * Runs when the user presses the action button and the popup closes. Called
     * from _onPopupDone. Children should overwrite this.
     *
     * @param  {IUserArg[]} userParams A list of (name, val), the user-specified
     *                                 arguments.
     */
     onPopupDone(userParams: IUserArg[]) {
        console.warn(userParams);
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param  {IUserArg[]} userParams A list of (name, val), the user-specified
     *                                 arguments.
     */
    _onPopupDone() {
        const userParams: IUserArg[] = collapseFormElementArray(
            this.userInputsToUse
        );
        // this.$emit("update:modelValue", false);
        this.closePopup();

        // If one of the user parameters is of type MoleculeInputParams, replace
        // it with IFileInfo objects.
        for (const idx in userParams) {
            const param = userParams[idx];
            if (param.val.combineProteinType) {
                userParams[idx].val = makeMoleculeInput(
                    param.val,
                    this.$store.state["molecules"]
                );
            }
        }

        this.$emit("onPopupDone", userParams);

        // this.submitJobs([userParams]);
    }
}
