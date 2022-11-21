/* eslint-disable jsdoc/check-tag-names */
import {
    FormElement,
    FormElemType,
    IFormGroup,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
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
     * @returns {boolean}  True if successfully updated, false otherwise.
     */
    protected updateUserArgEnabled(argId: string, val: boolean): boolean {
        const pluginComponent = this.validatePluginComponentRefSet();
        if (pluginComponent === false) {
            return false;
        }

        for (const arg of pluginComponent.userArgsToUse as FormElement[]) {
            if (arg.id === argId) {
                arg.enabled = val;
                return true;
            } else if (arg.type === FormElemType.Group) {
                for (const childArg of (arg as IFormGroup).childElements) {
                    if (childArg.id === argId) {
                        childArg.enabled = val;
                        return true;
                    }
                }
            }
        }

        return false;
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
        const pluginComponent = this.validatePluginComponentRefSet();
        if (pluginComponent === false) {
            return;
        }

        // Get a list of the existing user-argument names.
        const topLevelNames: string[] = pluginComponent.userArgsToUse.map(
            (i: FormElement): string => {
                return i.id;
            }
        );

        // Don't forget the names within the groups.
        const groupPaths: string[][] = pluginComponent.userArgsToUse
            .filter((i: FormElement): boolean => {
                return i.type === FormElemType.Group;
            })
            .map((i: FormElement): string[][] => {
                return (i as IFormGroup).childElements.map(
                    (j: FormElement): string[] => {
                        return [i.id, j.id];
                    }
                );
            })
            .reduce((a: string[], b: string[]): string[] => {
                return a.concat(b);
            }, []);

        const groupLevelNames = groupPaths.map((i: string[]): string => {
            return i[1];
        });

        // Get a list of all acceptable names.
        const acceptableNames: string[] = [
            ...topLevelNames,
            ...groupLevelNames,
        ];

        // Remove any user arguments that are not in the list of acceptable
        // names.
        userArgs = userArgs.filter((i: IUserArg): boolean => {
            const ok = acceptableNames.includes(i.name);
            if (!ok) {
                console.warn(
                    `Plugin ${
                        (this as any).pluginId
                    } is trying to update user var ${
                        i.name
                    }, but it doesn't exist.`
                );
            }
            return ok;
        });

        // Go through each of the arguments, and update.
        for (const userArg of userArgs) {
            const name = userArg.name;

            // Is it in top-level?
            if (topLevelNames.includes(name)) {
                const idx = topLevelNames.indexOf(name);
                pluginComponent.userArgsToUse[idx].val = userArg.val;
            } else if (groupLevelNames.includes(name)) {
                // It's in one of the groups.
                const idx = groupPaths.findIndex((i: string[]): boolean => {
                    return i[1] === name;
                });
                const groupPath = groupPaths[idx];
                const groupIdx = topLevelNames.indexOf(groupPath[0]);
                const group = pluginComponent.userArgsToUse[
                    groupIdx
                ] as IFormGroup;
                const childIdx = group.childElements.findIndex(
                    (i: FormElement): boolean => {
                        return i.id === name;
                    }
                );
                pluginComponent.userArgsToUse[groupIdx].childElements[
                    childIdx
                ].val = userArg.val;
            }
        }
    }

    /**
     * Checks if the plugin component has ref set to "pluginComponent".
     *
     * @returns {any} Returns false if ref is not set to "pluginComponent",
     *     otherwise returns the plugin component.
     */
    private validatePluginComponentRefSet(): any {
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
