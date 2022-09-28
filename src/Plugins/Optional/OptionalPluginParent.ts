import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IUserArg,
} from "@/UI/Forms/FormFull/FormFullUtils";
import { makeMoleculeInput } from "@/UI/Forms/MoleculeInputParams/MakeMoleculeInput";
import { PopupPluginParent } from "../PopupPluginParent";

/**
 * OptionalPluginParent
 */
export abstract class OptionalPluginParent extends PopupPluginParent {
    // Note that this isn't reactive (shouldn't be).
    abstract userInputs: FormElement[];

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param  {IUserArg[]} userParams A list of (name, val), the user-specified
     *                                 arguments.
     */
    public onPopupDone(userParams: IUserArg[]) {
        this.closePopup();

        // If one of the user parameters is of type MoleculeInputParams, replace
        // it with IFileInfo objects.
        for (const idx in userParams) {
            const param = userParams[idx];
            if (param.val.combineProteinType) {
                userParams[idx].val = makeMoleculeInput(param.val, this.$store.state["molecules"]);
            }
        }

        this.submitJobs([userParams]);
    }
}
