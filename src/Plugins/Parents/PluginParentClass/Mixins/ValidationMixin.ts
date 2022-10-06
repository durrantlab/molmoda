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
        //     throw new Error(`Plugin ${this.pluginId} does not define runJob()`);
        // }
    }

    /**
     * Check if this plugin can currently be used.  This can be optionally
     * overwritten.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkUseAllowed(): string | null {
        return null;
    }
}
