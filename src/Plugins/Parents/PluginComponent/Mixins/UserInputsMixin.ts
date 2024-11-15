import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Vue } from "vue-class-component";
import { fixUserArgs } from "../../UserInputUtils";

/**
 * UserInputsMixin
 */
export class UserInputsMixin extends Vue {
    // public userArgsFixed: UserArg[] = [];

    /**
     * Sets the user arguments to use. Modifies the ones provided.
     * 
     * @param {UserArg[]} userArgs  The user arguments.
     */
    set userArgsFixed(userArgs: UserArg[]) {
        fixUserArgs(userArgs);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.userArgs = userArgs;
    }

    /**
     * Sets the user arguments to use. Modifies the ones provided.
     *
     * @returns {UserArg[]} The user arguments.
     */
    get userArgsFixed(): UserArg[] {
        // Make a copy of the user arguments so we don't modify the original.
        // const userArgs = JSON.parse(JSON.stringify(this.userArgs));

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { userArgs } = this;

        // // Restore functions too.
        // for (let i = 0; i < userArgs.length; i++) {
        //     const origUserInput = userArgs[i] as UserArg;
        //     const userArg = userArgs[i] as UserArg;
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
