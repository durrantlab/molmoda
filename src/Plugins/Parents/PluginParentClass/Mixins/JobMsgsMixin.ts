/* eslint-disable jsdoc/check-tag-names */
import { Vue } from "vue-class-component";

/**
 * JobMsgsMixin
 */
export class JobMsgsMixin extends Vue {
    /**
     * Provides the message to log when the plugin job is submitted. Return ""
     * if you want to hide this message.
     *
     * @param {string} pluginId  The plugin ID.
     * @document
     * @gooddefault
     * @returns {string}  The message to log.
     */
    protected onSubmitJobLogMsg(pluginId: string): string {
        return `Job ${pluginId} submitted`;
    }

    /**
     * Provides the message to log when the plugin job starts. The parameters
     * will be automatically appended to the message, if given. Return "" if you
     * want to hide this message.
     *
     * @param {string} pluginId  The plugin ID.
     * @document
     * @gooddefault
     * @returns {string}  The message to log.
     */
    protected onStartJobLogMsg(pluginId: string): string {
        return `Job ${pluginId} started`;
    }

    /**
     * Provides the message to log when the plugin job finishes. The total run
     * time will be appended to the message. Return "" if you want to hide this
     * message.
     *
     * @param {string} pluginId  The plugin ID.
     * @document
     * @gooddefault
     * @returns {string}  The message to log.
     */
    protected onEndJobLogMsg(pluginId: string): string {
        return `Job ${pluginId} ended`;
    }
}
