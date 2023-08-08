/* eslint-disable jsdoc/check-tag-names */
import { FileInfo } from "@/FileSystem/FileInfo";
import {
    UserArg,
    UserArgType,
    IUserArgGroup,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Vue } from "vue-class-component";
import { recurseUserArgsAndAct } from "../../UserInputUtils";

/**
 * HooksMixin
 */
export class UserArgsMixin extends Vue {
    /**
     * Update whether a user argument is enabled. You can access the userArgs
     * variable directly, but this is more convenient because you can look it up
     * by id (helper function). Allows you to modify one `userArgs` enabled
     * value based on the value of another (see also `<PluginComponent>`'s
     * `onUserArgChange` function).
     *
     * @param {string}                id          The id of the user argument to
     *                                            update.
     * @param {boolean}               val         The new value of the enabled
     *                                            flag.
     */
    protected setUserArgEnabled(id: string, val: boolean) {
        recurseUserArgsAndAct(
            (userArg: UserArg) => {
                return userArg.id === id;
            },
            (userArg: UserArg) => {
                userArg.enabled = val;
            },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.userArgs
        );
    }

    /**
     * Note that userArgs is reactive, so you can just modify it directly. But
     * it is a list, not an object, so you can't easily update based on the id.
     * This is a helper function to do that.
     *
     * @param {string} id   The id of the user argument to update.
     * @param {any}    val  The new value of the user argument.
     */
    protected setUserArg(id: string, val: any) {
        recurseUserArgsAndAct(
            (userArg: UserArg) => {
                return userArg.id === id;
            },
            (userArg: UserArg) => {
                userArg.val = val;
            },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.userArgs
        );
    }

    /**
     * Given a list of user arguments, find the one with the specified name and
     * return its value. A helper function.
     *
     * @param  {string}                id        The name of the user argument
     *                                           to find.
     * @returns {any}  The value of the user argument with the specified name.
     */
    protected getUserArg(id: string): any {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const {userArgs} = this;

        // It's a form element
        let val: any = undefined;
        recurseUserArgsAndAct(
            (userArg: UserArg) => {
                return userArg.id === id;
            },
            (userArg: UserArg) => {
                val = userArg.val;
            },
            userArgs as any[]
        );

        return val;
    }
}
