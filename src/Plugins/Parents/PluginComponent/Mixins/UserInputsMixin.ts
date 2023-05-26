import {
    FormElement,
    FormElemType,
    IGenericFormElement,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IMoleculeInputParams, MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Vue } from "vue-class-component";

/**
 * UserInputsMixin
 */
export class UserInputsMixin extends Vue {
    public userArgsToUse: FormElement[] = [];

    /**
     * Check if the user hasn't defined types for any arguments, and guess
     * at/infer/detect the types if not. I suspect users will not generally
     * define types, so this must be robust. Note that modifies the user
     * argument in place, so no need to return anything.
     *
     * @param  {FormElement[]} userArgs  The user arguments.
     */
    inferUserInputTypes(userArgs: FormElement[]) {
        // Infer the type if it is not given.
        for (const userArg of userArgs) {
            if (userArg.type !== undefined) {
                // type explicitly defined. No need to guess.
                continue;
            }

            const _userArg = userArg as IGenericFormElement;
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
                // IFormMoleculeInputParams. Do sanity check just the same.
                if (_userArg.childElements !== undefined) {
                    userArg.type = FormElemType.Group;
                    this.inferUserInputTypes(_userArg.childElements); // Recurse
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
     * @param {FormElement[]} userArgs  The user arguments.
     */
    addDefaultUserInputsIfNeeded(userArgs: FormElement[]) {
        for (const userArg of userArgs) {
            // Add filter function if necessary
            const _userInput = userArg as IGenericFormElement;
            if (
                // NOTE: Don't put FormElemType.Number below.
                [FormElemType.Text].includes(
                    _userInput.type as FormElemType
                ) &&
                _userInput.filterFunc === undefined
            ) {
                (userArg as IGenericFormElement).filterFunc = (val: any) =>
                    val;
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

    /**
     * Sets the user arguments to use. Modifies the ones provided.
     *
     * @param  {FormElement[]} origUserArgs  The provided user arguments.
     */
    setUserInputsToUse(origUserArgs: FormElement[]) {
        // Make a copy of the user arguments so we don't modify the original.
        const userArgs = JSON.parse(JSON.stringify(origUserArgs));

        // Restore functions too.
        for (let i=0; i<origUserArgs.length; i++) {
            const origUserInput = origUserArgs[i] as IGenericFormElement;
            const userArg = userArgs[i] as IGenericFormElement;
            if (origUserInput.filterFunc !== undefined) {
                userArg.filterFunc = origUserInput.filterFunc;
            }
            if (origUserInput.validateFunc !== undefined) {
                userArg.validateFunc = origUserInput.validateFunc;
            }

            // If it's a MoleculeInput, turn it back into an object.
            if (userArg.val && userArg.val.isMoleculeInput) {
                userArg.val = new MoleculeInput(userArg.val as IMoleculeInputParams);
            }
        }



        this.inferUserInputTypes(userArgs);
        this.addDefaultUserInputsIfNeeded(userArgs);

        // Make a copy of user arguments so you can use with v-model. So not
        // reactive in parent.
        this.userArgsToUse = userArgs;
    }
}
