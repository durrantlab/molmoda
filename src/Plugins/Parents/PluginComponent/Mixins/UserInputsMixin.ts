import {
    FormElement,
    FormElemType,
    IGenericFormElement,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Vue } from "vue-class-component";

/**
 * UserInputsMixin
 */
export class UserInputsMixin extends Vue {
    public userInputsToUse: FormElement[] = [];

    /**
     * Check if the user hasn't defined types for any inputs, and guess at the
     * types if not. I suspect users will not generally define types, so this
     * must be robust. Note that modifies the user input in place, so no need to
     * return anything.
     *
     * @param  {FormElement[]} userInputs  The user inputs.
     */
    inferUserInputTypes(userInputs: FormElement[]) {
        // Infer the type if it is not given.
        for (const userInput of userInputs) {
            if (userInput.type !== undefined) {
                // type explicitly defined. No need to guess.
                continue;
            }

            const _userInput = userInput as IGenericFormElement;
            if (_userInput.val !== undefined) {
                // User input has property val
                switch (typeof _userInput.val) {
                    case "number":
                        userInput.type =
                            _userInput.min === undefined
                                ? FormElemType.Number
                                : FormElemType.Range;
                        break;
                    case "string":
                        // If starts with #, assume color.
                        if (_userInput.val.startsWith("#")) {
                            userInput.type = FormElemType.Color;
                        } else if (_userInput.options !== undefined) {
                            userInput.type = FormElemType.Select;
                        } else {
                            userInput.type = FormElemType.Text;
                        }
                        break;
                    case "object":
                        userInput.type = FormElemType.MoleculeInputParams;
                        break;
                    case "boolean":
                        userInput.type = FormElemType.Checkbox;
                        break;
                    default:
                        throw new Error(
                            "Could not infer type of user input: " +
                                JSON.stringify(userInput)
                        );
                }
            } else {
                // The only one that doesn't define val is
                // IFormMoleculeInputParams. Do sanity check just the same.
                if (_userInput.childElements !== undefined) {
                    userInput.type = FormElemType.Group;
                    this.inferUserInputTypes(_userInput.childElements); // Recurse
                } else {
                    throw new Error(
                        "Could not infer type of user input: " +
                            JSON.stringify(userInput)
                    );
                }
            }
        }
    }

    /**
     * Add in some of the userInput values that might be missing (e.g., default
     * filter and validation functions). Doens't add in type if missing, because
     * that is determined elsewhere. This is done in place, so returns nothing.
     *
     * @param {FormElement[]} userInputs  The user inputs.
     */
    addDefaultUserInputsIfNeeded(userInputs: FormElement[]) {
        for (const userInput of userInputs) {
            // Add filter function if necessary
            const _userInput = userInput as IGenericFormElement;
            if (
                [FormElemType.Text, FormElemType.Number].includes(
                    _userInput.type as FormElemType
                ) &&
                _userInput.filterFunc === undefined
            ) {
                (userInput as IGenericFormElement).filterFunc = (val: any) =>
                    val;
            }

            // Add validation function if necessary
            if (userInput.validateFunc === undefined) {
                userInput.validateFunc = () => true;
            }
        }
    }

    /**
     * Sets the user inputs to use. Modifies the ones provided.
     *
     * @param  {FormElement[]} origUserInputs  The provided user inputs.
     */
    setUserInputsToUse(origUserInputs: FormElement[]) {
        // Make a copy of the user inputs so we don't modify the original.
        const userInputs = JSON.parse(JSON.stringify(origUserInputs));

        // Restore functions too.
        for (let i=0; i<origUserInputs.length; i++) {
            const origUserInput = origUserInputs[i] as IGenericFormElement;
            const userInput = userInputs[i] as IGenericFormElement;
            if (origUserInput.filterFunc !== undefined) {
                userInput.filterFunc = origUserInput.filterFunc;
            }
            if (origUserInput.validateFunc !== undefined) {
                userInput.validateFunc = origUserInput.validateFunc;
            }
        }

        this.inferUserInputTypes(userInputs);
        this.addDefaultUserInputsIfNeeded(userInputs);

        // Make a copy of user inputs so you can use with v-model. So not reactive
        // in parent.
        this.userInputsToUse = userInputs;
    }
}
