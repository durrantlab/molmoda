/* eslint-disable jsdoc/check-tag-names */
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { Vue } from "vue-class-component";

/**
 * HooksMixin
 */
export class UserArgsMixin extends Vue {
    /**
     * Programmatically update whether a user argument is enabled. Necessary
     * because `userArgs` is NOT reactive. `updateUserArgEnabled` allows you to
     * modify one `userArgs` enabled value based on the value of another (see
     * also `<PluginComponent>`'s `onDataChanged` function). For
     * `updateUserArgEnabled` to work, the plugin's `<PluginComponent>` must
     * have `ref="pluginComponent"`.
     *
     * @param {string} argId  The id of the user argument to update.
     * @param {boolean} val   The new value of the enabled flag.
     */
    protected updateUserArgEnabled(argId: string, val: boolean) {
        const pluginComponent = this.isPluginComponentRefSet();
        if (pluginComponent === false) {
            return;
        }

        for (const arg of pluginComponent.userArgsToUse) {
            if (arg.id === argId) {
                arg.enabled = val;
                return;
            }
        }
    }

    /**
     * Programmatically update user arguments. Necessary because `userArgs` is
     * NOT reactive. Useful to do things like (1) prepopulate a `userArgs` value
     * or (2) modify one `userArgs` value based on the value of another (see
     * also `<PluginComponent>`'s `onDataChanged` function). For
     * `updateUserArgs` to work, the plugin's `<PluginComponent>` must have
     * `ref="pluginComponent"`.
     *
     * @param {IUserArg[]} userArgs  The user variables to update.
     * @helper
     * @document
     */
    protected updateUserArgs(userArgs: IUserArg[]) {
        const pluginComponent = this.isPluginComponentRefSet();
        if (pluginComponent === false) {
            return;
        }

        const existingNames: string[] = pluginComponent.userArgsToUse.map(
            (i: FormElement): string => {
                return i.id;
            }
        );
        for (const userArg of userArgs) {
            const name = userArg.name;
            const idx = existingNames.indexOf(name);
            if (idx === -1) {
                // Asking to update a user var that doesn't exist.
                console.warn(
                    `Plugin ${(this as any).pluginId} is trying to update user var ${name}, but it doesn't exist.`
                );
                return;
            }

            // Update the value
            pluginComponent.userArgsToUse[idx].val = userArg.val;
        }
    }

    /**
     * Checks if the plugin component has ref set to pluginComponent.
     *
     * @returns {any} Returns false if ref is not set, otherwise returns the
     *     plugin component.
     */
    private isPluginComponentRefSet(): any {
        const pluginComponent = this.$refs["pluginComponent"] as any;
        if (pluginComponent === undefined) {
            console.warn(
                'To use the updateUserVars() function, the PluginComponent must have ref "pluginComponent".'
            );
            return false;
        }
        return pluginComponent;
    }

    /**
     * Given a list of user arguments, find the one with the specified name and
     * return its value.
     *
     * @param  {IUserArg[]} userArgs  The list of user arguments.
     * @param  {string}     name      The name of the user argument to find.
     * @returns {any}  The value of the user argument with the specified name.
     */
    protected getArg(userArgs: IUserArg[], name: string): any {
        for (const userArg of userArgs) {
            if (userArg.name === name) {
                return userArg.val;
            }
        }
        return undefined;
    }
}
