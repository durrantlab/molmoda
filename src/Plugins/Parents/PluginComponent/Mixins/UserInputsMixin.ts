import {
    FormElement,
    FormElemType,
    IGenericFormElement,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IMoleculeInputParams,
    MoleculeInput,
} from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Vue } from "vue-class-component";
import { fixUserArgs } from "../../UserInputUtils";

/**
 * UserInputsMixin
 */
export class UserInputsMixin extends Vue {
    // public userArgsFixed: FormElement[] = [];

    set userArgsFixed(userArgs: FormElement[]) {
        fixUserArgs(userArgs);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.userArgs = userArgs;
    }

    /**
     * Sets the user arguments to use. Modifies the ones provided.
     *
     * @param  {FormElement[]} origUserArgs  The provided user arguments.
     */
    get userArgsFixed(): FormElement[] {
        // Make a copy of the user arguments so we don't modify the original.
        // const userArgs = JSON.parse(JSON.stringify(this.userArgs));
        

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const {userArgs} = this;

        // // Restore functions too.
        // for (let i = 0; i < userArgs.length; i++) {
        //     const origUserInput = userArgs[i] as IGenericFormElement;
        //     const userArg = userArgs[i] as IGenericFormElement;
        //     if (origUserInput.filterFunc !== undefined) {
        //         userArg.filterFunc = origUserInput.filterFunc;
        //     }
        //     if (origUserInput.validateFunc !== undefined) {
        //         userArg.validateFunc = origUserInput.validateFunc;
        //     }

        //     // If it's a MoleculeInput, turn it back into an object.
        //     if (userArg.val && userArg.val.isMoleculeInput) {
        //         userArg.val = new MoleculeInput(
        //             userArg.val as IMoleculeInputParams
        //         );
        //     }
        // }

        // this.inferUserInputTypes(userArgs);
        // this.addDefaultUserInputsIfNeeded(userArgs);

        fixUserArgs(userArgs);

        // Make a copy of user arguments so you can use with v-model. So not
        // reactive in parent.
        // this.userArgsFixed = userArgs;
        return userArgs;
    }
}
