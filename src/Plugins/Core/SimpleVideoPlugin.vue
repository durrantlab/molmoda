<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        :cancelBtnTxt="neverClose ? '' : 'Ok'"
        actionBtnTxt=""
        @onClosed="onClosed"
        :variant="variant"
        @onUserArgChanged="onUserArgChanged"
        @onPopupDone="onPopupDone"
        modalWidth="xl"
    >
        <!-- width="560"
        height="315" -->
        <div class="embed-responsive embed-responsive-16by9">
            <iframe
                ref="iframe"
                class="embed-responsive-item"
                style="width: 100%; border: 0.5px solid black"
                credentialless
                :src="'https://www.youtube.com/embed/' + youtubeID"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
            ></iframe>
            <p class="text-center pt-0 mb-1" style="margin-top: -10px;"><small><a :href="'https://www.youtube.com/watch?v=' + youtubeID" target="_blank">Watch on Youtube</a></small></p>
        </div>

        <p
            style="overflow: hidden; text-overflow: ellipsis"
            v-html="message"
        ></p>
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import {
    ISimpleVideo,
    PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { Watch } from "vue-property-decorator";
import * as api from "@/Api";

/**
 * SimpleVideoPlugin
 */
@Options({
    components: {
        Popup,
        PluginComponent,
    },
})
export default class SimpleVideoPlugin extends PluginParentClass {
    // @Prop({ required: true }) title!: string;
    // @Prop({ required: true }) message!: string;

    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "simplevideo";
    intro = "";

    // Below set via onPluginStart.
    title = "";
    message = "";
    youtubeID = "";
    variant = PopupVariant.Primary;
    callBack: any = undefined;
    neverClose = false;
    showInQueue = false;

    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    logJob = false;

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup.
     *
     * @param {ISimpleVideo} [payload]  Information about the message to display.
     * @returns {Promise<void>}       Promise that resolves when the plugin is
     *                                finished starting.
     */
    async onPluginStart(payload: ISimpleVideo): Promise<void> {
        this.title = payload.title;
        this.message = payload.message;
        this.callBack = payload.callBack;
        this.variant =
            payload.variant === undefined
                ? PopupVariant.Primary
                : payload.variant;
        this.neverClose =
            payload.neverClose === undefined ? false : payload.neverClose;
        this.open = payload.open !== undefined ? payload.open : true;
        this.youtubeID = payload.youtubeID;
    }

    /**
     * Runs when the user closes the simple message popup.
     */
    onClosed() {
        this.submitJobs();
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        if (this.callBack) {
            this.callBack();
        }
        return Promise.resolve();
    }

    adjustVideoHeightInterval: any = undefined;

    /**
     * Watch for changes to the open property.
     * 
     * @param {boolean} newVal  The new value of the open property.
     */
    @Watch("open")
    onOpenChange(newVal: boolean) {
        if (newVal) {
            if (this.adjustVideoHeightInterval) {
                clearInterval(this.adjustVideoHeightInterval);
            }
            this.adjustVideoHeightInterval = setInterval(() => {
                const iframe = this.$refs["iframe"] as HTMLIFrameElement;
                if (!iframe) {
                    // iframe probably isn't ready yet
                    return;
                }

                // get iframe width, adjust height to maintain 16:9 ratio
                const width = iframe.offsetWidth;
                const origHeight = iframe.offsetHeight;
                const height = width * (9 / 16);
                if (height !== origHeight) {
                    iframe.style.height = height + "px";
                }
            }, 500);
        } else {
            if (this.adjustVideoHeightInterval) {
                clearInterval(this.adjustVideoHeightInterval);
            }
        }
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        // Not going to test closing, etc. (Too much work.) But at least opens
        // to see if an error occurs.

        api.plugins.runPlugin(this.pluginId, {
            title: "Test Title",
            message: "Test message",
            youtubeID: "H8VkRiHayeU",
            open: true, // open
        } as ISimpleVideo);

        return [];
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
