// Some entries are very common (such as desalting). Good to standardize these
// in one place so they are the same everywhere.

import { IUserArgCheckbox, UserArgType } from "./FormFullInterfaces";

/**
 * Returns a desalt argument for use in FormFull.
 *
 * @returns {IUserArgCheckbox}  The desalt argument.
 */
export function getDesaltUserArg(): IUserArgCheckbox {
    return {
        id: "desalt",
        type: UserArgType.Checkbox,
        label: "Desalt molecules",
        description:
            "Removes any counterions and keeps only the largest fragment.",
        val: true,
    } as IUserArgCheckbox;
}