import { FileInfo } from "@/FileSystem/FileInfo";
import {
    UserArgType,
    UserArg,
    IUserArgGroup,
    IUserArgRange,
    IUserArgSelect,
    IUserArgMoleculeInputParams,
    IUserArgAlert,
    IUserArgText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IMoleculeInputParams,
    IProtCmpdTreeNodePair,
    MoleculeInput,
} from "@/UI/Forms/MoleculeInputParams/MoleculeInput";

/**
 * Fix the user arguments. Infers the types if not given, and adds in default
 * values if not given. 
 * 
 * @param {UserArg[]} userArgs  The user arguments.
 * @returns {UserArg[]} The user arguments, fixed.
 */
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

        const _userArg = userArg as UserArg;
        // User arg has property val
        switch (typeof _userArg.val) {
            case "number":
                userArg.type =
                    (_userArg as IUserArgRange).min === undefined
                        ? UserArgType.Number
                        : UserArgType.Range;
                break;
            case "string":
                // If starts with #, assume color.
                if (_userArg.val.startsWith("#")) {
                    userArg.type = UserArgType.Color;
                } else if ((_userArg as IUserArgSelect).options !== undefined) {
                    userArg.type = UserArgType.Select;
                } else if ((<IUserArgAlert>_userArg).alertType !== undefined) {
                    // It's a message
                    userArg.type = UserArgType.Alert;

                    if ((<IUserArgAlert>_userArg).label !== undefined) {
                        throw new Error(
                            "Cannot specify label on UserArgType.Alert argument: " +
                                JSON.stringify(userArg)
                        );
                    }
                } else {
                    userArg.type = UserArgType.Text;
                }
                break;
            case "object": // A list or object
                // if (_userArg.val.center !== undefined) {
                //     userArg.type = UserArgType.SelectRegion;
                // } else {
                // }

                if (Array.isArray(_userArg.val)) {
                    // If it's an array, assume it's a group.
                    userArg.type = UserArgType.Group;
                    _inferUserInputTypes((<IUserArgGroup>_userArg).val); // Recurse
                } else {
                    // Assume it's a molecule input params
                    userArg.type = UserArgType.MoleculeInputParams;
                }
                break;
            case "boolean":
                userArg.type = UserArgType.Checkbox;
                break;
            default:
                throw new Error(
                    "Could not infer type of user argument: " +
                        JSON.stringify(userArg)
                );
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
        const _userInput = userArg as UserArg;
        if (
            // NOTE: Don't put UserArgType.Number below.
            [UserArgType.Text].includes(_userInput.type as UserArgType) &&
            (<IUserArgText>_userInput).filterFunc === undefined
        ) {
            // The default filterFunc is empty.
            (<IUserArgText>_userInput).filterFunc = (val: any) => val;
        }

        // Add validation function if necessary (default if not given).
        if (userArg.validateFunc === undefined) {
            if (_userInput.type === UserArgType.Number) {
                userArg.validateFunc = (v: number) => {
                    return !isNaN(v);
                };
            } else {
                userArg.validateFunc = () => true;
            }
        }

        // Add warning function if necessary (default if not given).
        if (userArg.warningFunc === undefined) {
            userArg.warningFunc = () => "";
        }

        // Enabled by default
        if (userArg.enabled === undefined) {
            userArg.enabled = true;
        }
    }
}

/**
 * Copy the user arguments.
 * 
 * @param {UserArg[]} origUserArgs  The original user arguments.
 * @returns {UserArg[]} The copied user arguments.
 */
export function copyUserArgs(origUserArgs: UserArg[]): UserArg[] {
    // Make a copy of the user arguments so we don't modify the original.
    const userArgs = JSON.parse(JSON.stringify(origUserArgs));

    // Restore functions from original.
    for (let i = 0; i < userArgs.length; i++) {
        const origUserInput = origUserArgs[i] as UserArg;
        const userArg = userArgs[i] as UserArg;
        // Casting to IUserArgText to avoid typescript error.
        if ((<IUserArgText>origUserInput).filterFunc !== undefined) {
            (<IUserArgText>userArg).filterFunc = (<IUserArgText>(
                origUserInput
            )).filterFunc;
        }
        if (origUserInput.validateFunc !== undefined) {
            userArg.validateFunc = origUserInput.validateFunc;
        }
        if (origUserInput.warningFunc !== undefined) {
            userArg.warningFunc = origUserInput.warningFunc;
        }

        // If it's a MoleculeInput, turn it back into an object.
        if (
            userArg.val &&
            ((<IUserArgMoleculeInputParams>userArg).val as MoleculeInput)
                .isMoleculeInput
        ) {
            userArg.val = new MoleculeInput(
                userArg.val as IMoleculeInputParams
            );
        }

        // If it's a Region, turn it back into an object.
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
 * @param {UserArg[]} userArgs     The userArgs to update. If
 *                                             not given, uses the
 *                                             `userArgs` object variable.
 * @returns {boolean} Returns true if the user argument was found and false
 *     otherwise.
 */
export function recurseUserArgsAndAct(
    compareFunc: (userArg: UserArg) => boolean,
    onMatch: (userArg: UserArg) => void,
    userArgs: UserArg[]
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
            userArg.type === UserArgType.Group &&
            recurseUserArgsAndAct(
                compareFunc,
                onMatch,
                (userArg as IUserArgGroup).val
            )
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Goes through userArgs and converts any MoleculeInputParams to FileInfos.
 *
 * @param {UserArg[]} userArgs  The user arguments.
 * @returns {Promise<any>} A promise that resolves when all the
 *                         MoleculeInputParams have been converted to FileInfos.
 */
export function convertMoleculeInputParamsToFileInfos(
    userArgs: UserArg[]
): Promise<any> {
    const promises: Promise<any>[] = [];
    recurseUserArgsAndAct(
        (userArg: UserArg) => {
            if (userArg.val === undefined) {
                return false;
            }
            return (
                ((<IUserArgMoleculeInputParams>userArg).val as MoleculeInput)
                    .molsToConsider !== undefined
            );
        },
        (userArg: UserArg) => {
            const promise = (
                (<IUserArgMoleculeInputParams>userArg).val as MoleculeInput
            )
                .getProtAndCompoundPairs()
                .then((fileInfos: FileInfo[] | IProtCmpdTreeNodePair[]) => {
                    userArg.val = fileInfos;
                    return;
                });
            promises.push(promise);
        },
        userArgs
    );

    return Promise.all(promises);
}
