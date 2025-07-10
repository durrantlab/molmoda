<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>
<script lang="ts">
import { Options } from "vue-class-component";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { stateToJsonStr } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModa";
import { fetcher, ResponseType } from "@/Core/Fetcher";
import { dynamicImports } from "@/Core/DynamicImports";
import * as api from "@/Api";
import { store } from "@/Store";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { PluginParentClass } from "../../Parents/PluginParentClass/PluginParentClass";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import PluginComponent from "../../Parents/PluginComponent/PluginComponent.vue";
import { checkAnyMolLoaded } from "../../CheckUseAllowedUtils";
import { validateShareCode } from "./TemporaryShareUtils";
import { loadDOMPurify } from "@/Core/Security/Sanitize";

/**
 * TemporarySharePlugin allows users to temporarily share their session via a generated link.
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class TemporarySharePlugin extends PluginParentClass {
    menuPath = "File/[1] Project/[7] Share...";
    title = "Temporary Share";
    pluginId = "temporaryshare";
    intro = "Temporarily share your current session via a link and QR code.";
    details =
        "This will upload your session to the server and generate a unique, temporary link that you can use to open the session on another device. The link will expire after a short period.";
    tags = [Tag.All];
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    userArgDefaults: UserArg[] = [];
    noPopup = true;

    /**
     * Checks if there are any molecules loaded before allowing the plugin to run.
     *
     * @returns {string | null} An error message if no molecules are loaded, otherwise null.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Lifecycle hook that runs after the component is mounted.
     * It dynamically adds credits for the QR code library.
     */
    async onMounted() {
        // Load DOMPurify for sanitizing SVG content
        await loadDOMPurify();

        const qrCredit = (await dynamicImports.qrcode.credit) as ISoftwareCredit;
        if (qrCredit && !this.softwareCredits.some(c => c.name === qrCredit.name)) {
            this.softwareCredits.push(qrCredit);
        }
    }

    /**
     * The main logic of the plugin. It serializes the session, sends it to a server,
     * receives a share code, generates a QR code, and displays the information in a popup.
     *
     * @returns {Promise<void>}
     */
    async runJobInBrowser(): Promise<void> {
        const spinnerId = api.messages.startWaitSpinner();
        try {
            const jsonStr = stateToJsonStr(store.state);
            const sessionFileInfo = new FileInfo({
                name: "molmoda_file.json",
                contents: jsonStr,
            });

            const zipBlob = await api.fs.createZipBlob([sessionFileInfo]);

            const formData = new FormData();
            formData.append("molmoda_file", zipBlob, "session.molmoda");

            const shareCode = await fetcher(
                "https://molmoda.org/share_temp.php",
                {
                    responseType: ResponseType.TEXT,
                    formPostData: formData,
                    cacheBust: true,
                }
            );

            // Basic validation of the received code
            if (!validateShareCode(shareCode)) {
                throw new Error("Invalid share code received from the server.");
            }

            const trimmedCode = shareCode.trim();
            // Construct the URL with the share code
            const currentOrigin = window.location.origin + window.location.pathname;
            const shareUrl = `${currentOrigin}?code=${encodeURIComponent(
                trimmedCode
            )}`;
            const qrcode = await dynamicImports.qrcode.module;
            const qrCodeSvg = await qrcode.toString(shareUrl, {
                type: "svg",
                margin: 1,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                },
            });

            const message = `
          <div style="text-align:center;"><a href="${shareUrl}" target="_blank" rel="noopener noreferrer">${shareUrl}</a></div>
          `;
            
            const alertMessage = "Your session has been temporarily shared. Use the link or QR code to access it on another device. This link will expire shortly.";

            const maxHeight = window.innerHeight * 0.6;

            api.plugins.runPlugin("simplesvgpopup", {
                title: "Temporary Share Link",
                svgContents: qrCodeSvg,
                message: message,
                alertMessage: alertMessage,
                filenameBase: "session-qr",
                showDownloadButtons: false,
                maxHeight: maxHeight
            });
        } catch (error: any) {
            api.messages.popupError(
                `Failed to create temporary share link: ${error.message}`
            );
        } finally {
            api.messages.stopWaitSpinner(spinnerId);
        }
    }

    /**
     * Provides the test commands for this plugin.
     *
     * @returns {Promise<ITest>} A promise that resolves with the test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: new TestCmdList().loadExampleMolecule(),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#modal-simplesvgpopup",
                "Your session has been temporarily shared"
            ),
        };
    }
}
</script>