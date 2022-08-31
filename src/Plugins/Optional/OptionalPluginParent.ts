import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IUserArg,
} from "@/UI/Forms/FormFull/FormFullUtils";
import { PopupPluginParent } from "../PopupPluginParent";

export abstract class OptionalPluginParent extends PopupPluginParent {
    // Note that this isn't reactive (shouldn't be).
    abstract userInputs: FormElement[];

    
    /**
     * Runs when the popup closes.
     *
     * @param  {IUserArg[]} userParams A list of (name, val), the user-specified
     *                                 arguments.
     */
    public onPopupDone(userParams: IUserArg[]) {
        this.closePopup();

        // TODO: Note that below doesn't consider multiple proteins/ligands. There
        // still work to do here.
        this.submitJobs([userParams]);
    }
}
