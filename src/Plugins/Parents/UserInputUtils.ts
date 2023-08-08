import { FileInfo } from "@/FileSystem/FileInfo";
import {
    FormElemType,
    UserArg,
    IUserArgGroup,
    IGenericUserArg,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IMoleculeInputParams,
    MoleculeInput,
} from "@/UI/Forms/MoleculeInputParams/MoleculeInput";

export function fixUserArgs(userArgs: UserArg[]): UserArg[] {
    _inferUserInputTypes(userArgs);
    _addDefaultUserInputsIfNeeded(userArgs);
    return userArgs;
}

/**
 * Check if the user hasn't defined types for any arguments, and guess
 * at/infer/detect the types if not. I suspect users will not generally
 * define types, so this must be robust. Note that modifies the user
 * argument in place, so no need to return anything.
 *
 * @param  {UserArg[]} userArgs  The user arguments.
 */
function _inferUserInputTypes(userArgs: UserArg[]) {
    // Infer the type if it is not given.
    for (const userArg of userArgs) {
        if (userArg.type !== undefined) {
            // type explicitly defined. No need to guess.
            continue;
        }

        const _userArg = userArg as IGenericUserArg;
        if (_userArg.val !== undefined) {
            // User arg has property val
            switch (typeof _userArg.val) {
                case "number":
                    userArg.type =
                        _userArg.min === undefined
                            ? FormElemType.Number
                            : FormElemType.Range;
                    break;
                case "string":
                    // If starts with #, assume color.
                    if (_userArg.val.startsWith("#")) {
                        userArg.type = FormElemType.Color;
                    } else if (_userArg.options !== undefined) {
                        userArg.type = FormElemType.Select;
                    } else {
                        userArg.type = FormElemType.Text;
                    }
                    break;
                case "object":
                    // if (_userArg.val.center !== undefined) {
                    //     userArg.type = FormElemType.SelectRegion;
                    // } else {
                    userArg.type = FormElemType.MoleculeInputParams;
                    // }
                    break;
                case "boolean":
                    userArg.type = FormElemType.Checkbox;
                    break;
                default:
                    throw new Error(
                        "Could not infer type of user argument: " +
                            JSON.stringify(userArg)
                    );
            }
        } else {
            // The only one that doesn't define val is
            // IUserArgMoleculeInputParams. Do sanity check just the same.
            if (_userArg.childElements !== undefined) {
                userArg.type = FormElemType.Group;
                _inferUserInputTypes(_userArg.childElements); // Recurse
            } else if (_userArg.alertType !== undefined) {
                // It's a message
                userArg.type = FormElemType.Alert;

                if (_userArg.label !== undefined) {
                    throw new Error(
                        "Cannot specify label on FormElemType.Alert argument: " +
                            JSON.stringify(userArg)
                    );
                }
            } else {
                throw new Error(
                    "Could not infer type of user argument: " +
                        JSON.stringify(userArg)
                );
            }
        }
    }
}

/**
 * Add in some of the userArg values that might be missing (e.g., default
 * filter and validation functions). Doens't add in type if missing, because
 * that is determined elsewhere. This is done in place, so returns nothing.
 *
 * @param {UserArg[]} userArgs  The user arguments.
 */
function _addDefaultUserInputsIfNeeded(userArgs: UserArg[]) {
    for (const userArg of userArgs) {
        // Add filter function if necessary
        const _userInput = userArg as IGenericUserArg;
        if (
            // NOTE: Don't put FormElemType.Number below.
            [FormElemType.Text].includes(_userInput.type as FormElemType) &&
            _userInput.filterFunc === undefined
        ) {
            (userArg as IGenericUserArg).filterFunc = (val: any) => val;
        }

        // Add validation function if necessary
        if (userArg.validateFunc === undefined) {
            if (_userInput.type === FormElemType.Number) {
                userArg.validateFunc = (v: number) => {
                    return !isNaN(v);
                };
            } else {
                userArg.validateFunc = () => true;
            }
        }

        // Enabled by default
        if (userArg.enabled === undefined) {
            userArg.enabled = true;
        }
    }
}

export function copyUserArgs(origUserArgs: UserArg[]): UserArg[] {
    // Make a copy of the user arguments so we don't modify the original.
    const userArgs = JSON.parse(JSON.stringify(origUserArgs));

    // Restore functions from original.
    for (let i = 0; i < userArgs.length; i++) {
        const origUserInput = userArgs[i] as IGenericUserArg;
        const userArg = userArgs[i] as IGenericUserArg;
        if (origUserInput.filterFunc !== undefined) {
            userArg.filterFunc = origUserInput.filterFunc;
        }
        if (origUserInput.validateFunc !== undefined) {
            userArg.validateFunc = origUserInput.validateFunc;
        }

        // If it's a MoleculeInput, turn it back into an object.
        if (userArg.val && userArg.val.isMoleculeInput) {
            userArg.val = new MoleculeInput(
                userArg.val as IMoleculeInputParams
            );
        }
    }

    // this.inferUserInputTypes(userArgs);
    // this.addDefaultUserInputsIfNeeded(userArgs);

    fixUserArgs(userArgs);

    // Make a copy of user arguments so you can use with v-model. So not
    // reactive in parent.
    // this.userArgsFixed = userArgs;
    return userArgs;
}

/**
 * Recursively go through userArgs looking for a userArg of a given ID.
 *
 * @param {Function}              compareFunc  A function to run on the user
 *                                             argument to see if it's the
 *                                             right one.
 * @param {Function}              onMatch      A function to run on the user
 *                                             argument to update it.
 * @param {IGenericUserArg[]} userArgs     The userArgs to update. If
 *                                             not given, uses the
 *                                             `userArgs` object variable.
 * @returns {boolean} Returns true if the user argument was found and false
 *     otherwise.
 */
export function recurseUserArgsAndAct(
    compareFunc: (userArg: IGenericUserArg) => boolean,
    onMatch: (userArg: IGenericUserArg) => void,
    userArgs: IGenericUserArg[]
): boolean {
    // if (this.validatePluginComponentRefIsSet() === false) {
    //     return false;
    // }

    for (const userArg of userArgs) {
        if (compareFunc(userArg)) {
            // You found it. Set the enabled and return true.
            onMatch(userArg);
            // userArg.enabled = val;
            return true;
        } else if (
            // It's a group. Recurse. If you find it, return true.
            userArg.type === FormElemType.Group &&
            recurseUserArgsAndAct(
                compareFunc,
                onMatch,
                (userArg as IUserArgGroup).childElements
            )
        ) {
            return true;
        }
    }

    return false;
}

export function convertMoleculeInputParamsToFileInfos(userArgs: IGenericUserArg[]): Promise<any> {
    const promises: Promise<any>[] = [];
    recurseUserArgsAndAct(
        (userArg: IGenericUserArg) => {
            if (userArg.val === undefined) {
                return false;
            }
            return userArg.val.molsToConsider !== undefined;
        },
        (userArg: IGenericUserArg) => {
            const promise = userArg.val
                .getProtAndCompoundPairs()
                .then((fileInfos: FileInfo[]) => {
                    userArg.val = fileInfos;
                    return;
                });
            promises.push(promise);
        },
        userArgs
    );

    return Promise.all(promises);
}
