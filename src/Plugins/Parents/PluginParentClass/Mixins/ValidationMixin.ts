import { Vue } from "vue-class-component";

/**
 * ValidationMixin
 */
export class ValidationMixin extends Vue {
    /**
     * Validates the plugin to make sure all children define what they should,
     * etc.
     * 
     * @param {string} pluginId  The plugin ID.
     */
    protected _validatePlugin(pluginId: string) {
        if (pluginId !== pluginId.toLowerCase()) {
            throw new Error(
                "Plugin id must be lowercase. Plugin id: " + pluginId
            );
        }

        // if (this.menuPath === "") {
        //     throw new Error(`Plugin ${this.pluginId} does not define menuPath`);
        // }

        // if (this.softwareCredits === undefined) {
        //     throw new Error(
        //         `Plugin ${this.pluginId} does not define softwareCredits`
        //     );
        // }

        // if (this.contributorCredits === undefined) {
        //     throw new Error(
        //         `Plugin ${this.pluginId} does not define contributorCredits`
        //     );
        // }

        // if (this.pluginId === "") {
        //     throw new Error("pluginId cannot be empty.");
        // }

        // if (this.onPluginStart === null) {
        //     throw new Error(
        //         `Plugin ${this.pluginId} does not define onPluginStart()`
        //     );
        // }

        // if (this.runJob === null) {
        //     throw new Error(`Plugin ${this.pluginId} does not define runJobInBrowser()`);
        // }
    }

    /**
     * Checks if the plugin can currently run. This function allows plugins to
     * provide a warning message when the user has not yet loaded the data
     * necessary to run the plugin successfully.
     *
     * @document
     * @returns {string | null}  If a string, the error message to show instead
     *     of running the plugin. If null, proceeds to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return null;
    }
}
