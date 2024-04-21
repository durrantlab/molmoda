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
     * @param {string} details   The plugin details.
     */
    protected _validatePlugin(pluginId: string, intro: string, details: string) {
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

        // Sentence must be no longer than 100 characters, after HTML tags removed.
        const introWithoutHtml = intro.replace(/<[^>]*>?/g, "");
        if (introWithoutHtml.length > 100) {
            throw new Error(
                "Plugin intro must be no longer than 100 characters. Use the details property if you need a more extended introduction. Plugin id: " + pluginId + ". Intro: " + introWithoutHtml + " Length: " + introWithoutHtml.length + "."
            );
        }

        // Made sure details is also a sentence.
        if ((details !== "") && !(isSentence(details))) {
            throw new Error(
                "Plugin details must be a sentence (start with capital letter, end with punctuation). Plugin id: " + pluginId + ". Details: " + details
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
