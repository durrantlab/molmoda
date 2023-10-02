import { isSentence } from "@/Core/Utils";
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
     * @param {string} intro     The plugin intro.
     */
    protected _validatePlugin(pluginId: string, intro: string) {
        if (pluginId !== pluginId.toLowerCase()) {
            throw new Error(
                "Plugin id must be lowercase. Plugin id: " + pluginId
            );
        }

        // Make sure intro is sentence
        if (!(isSentence(intro))) {
            throw new Error(
                "Plugin intro must be a sentence (start with capital letter, end with punctuation). Plugin id: " + pluginId + ". Intro: " + intro
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
     * 
     * @document
     * @param {any} _  This parameter given only to enable reactivity
     *                 elsewhere. Not used.
     * @returns {string | null}  If a string, the error message to show instead
     *     of running the plugin. If null, proceeds to run the plugin.
     */
    checkPluginAllowed(_?: any): string | null {
        return null;
    }
}
