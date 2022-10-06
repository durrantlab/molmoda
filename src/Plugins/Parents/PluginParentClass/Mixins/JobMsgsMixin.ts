import { Vue } from "vue-class-component";

/**
 * JobMsgsMixin
 */
export class JobMsgsMixin extends Vue {
    /**
     * The message to log when the plugin job is submitted. Children can
     * overwrite this function. Return "" if you want to hide this step.
     *
     * @param {string} pluginId  The plugin ID.
     * @returns {string}  The message to log.
     */
    onSubmitJobLogMsg(pluginId: string): string {
        return `Job ${pluginId} submitted`;
    }

    /**
     * The message to log when the plugin job starts. The parameters will be
     * automatically added if given. Children can overwrite this function.
     * Return "" if you want to hide this step.
     *
     * @param {string} pluginId  The plugin ID.
     * @returns {string}  The message to log.
     */
    onStartJobLogMsg(pluginId: string): string {
        return `Job ${pluginId} started`;
    }

    /**
     * The message to log when the plugin job finishes. Total run time will be
     * appended. Children can overwrite this function.  Return "" if you want to
     * hide this step.
     *
     * @param {string} pluginId  The plugin ID.
     * @returns {string}  The message to log.
     */
    onEndJobLogMsg(pluginId: string): string {
        return `Job ${pluginId} ended`;
    }
}
