<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Load"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="isBtnEnabled()"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
    >
        <FormWrapper>
            <FormInput
                ref="formMolName"
                id="formMolName"
                v-model="molName"
                placeHolder="(Optional) The Chemical Name (e.g., Aspirin)..."
                @onChange="searchByName"
                :delayBetweenChangesDetected="2000"
                :description="molNameRespDescription"
                :validateDescription="false"
            ></FormInput>
        </FormWrapper>
        <FormWrapper
            ><FormInput
                ref="formCID"
                v-model="cid"
                id="cid"
                placeHolder="The CID (e.g., 2244)..."
                :filterFunc="filterUserData"
                @onKeyDown="onCIDKeyDown"
                description='The CID number. Search <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank">PubChem</a> to find the CID yourself.'
            ></FormInput>
        </FormWrapper>
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-this-alias */

import { Options } from "vue-class-component";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { loadRemoteToFileInfo } from "./RemoteMolLoadersUtils";
import * as api from "@/Api";
import { appName } from "@/Core/GlobalVars";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { correctFilenameExt } from "@/FileSystem/FileUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { getDesaltUserArg } from "@/UI/Forms/FormFull/FormFullCommonEntries";
import { slugify } from "@/Core/Utils/StringUtils";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";

/**
 * LoadPubChemPlugin
 */
@Options({
    components: {
        PluginComponent,
        FormInput,
        FormWrapper,
    },
})
export default class LoadPubChemPlugin extends PluginParentClass {
    menuPath = "File/Import/[6] PubChem...";
    title = "Load Molecule from PubChem";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
        {
            name: "PubChem",
            url: "https://pubchem.ncbi.nlm.nih.gov/",
            citations: [
                {
                    title: "PubChem 2023 update",
                    authors: ["Kim, S", "Chen, J"],
                    journal: "Nucleic Acids Res.",
                    volume: 51,
                    issue: "D1",
                    pages: "D1373-D1380",
                    year: 2023,
                },
            ],
        },
    ];
    pluginId = "loadpubchem";
    cid = "";
    molName = "";
    molNameRespDescription = "";
    skipLongRunningJobMsg = true;
    intro = `Load a compound from the <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank">PubChem Database</a> of small molecules.`;
    userArgDefaults: UserArg[] = [getDesaltUserArg()];
    
    tags = [Tag.All];

    /**
     * Filters text to match desired format.
     *
     * @param {string} val  The text to assess.
     * @returns {string} The filtered text.
     */
    filterUserData(val: string): string {
        // Keep numbers
        val = val.replace(/\D/g, "");
        return val;
    }

    /**
     * Get the name of the app.
     *
     * @returns {string} The name of the app.
     */
    get appName(): string {
        return appName;
    }

    /**
     * Runs when the user presses a key in the CID input. Clears the molname.
     */
    onCIDKeyDown() {
        this.molName = "";
    }

    /**
     * If text is a properly formatted UniProt accession, enable the button.
     * Otherwise, disabled.
     *
     * @returns {boolean} Whether to disable the button.
     */
    isBtnEnabled(): boolean {
        // Regex for any integer
        let r = /\d+/;

        // Return bool whether text matches regex
        return this.cid.toString().match(r) !== null;
    }

    /**
     * Searches pubmed by user-specified name. Tries to set the CID accordingly.
     */
    searchByName() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let catchFunc = (_err: string) => {
            // this.molNameRespDescription = err;
            this.molNameRespDescription = `<span class="text-danger">Could not find a molecule named "${this.molName}".</span>`;
            this.cid = "";
        };

        loadRemoteToFileInfo(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${this.molName}/synonyms/JSON`
        )
            .then((fileInfo: FileInfo) => {
                const jsonResp = JSON.parse(fileInfo.contents);
                let cid = jsonResp.InformationList.Information[0].CID;
                this.cid = cid;

                let synonyms = jsonResp.InformationList.Information[0].Synonym;
                synonyms = synonyms.filter(
                    (synonym: string) =>
                        synonym.toLowerCase() !== this.molName.toLowerCase()
                );

                this.molNameRespDescription = `<div style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: block;">Found "${
                    this.molName
                }", known also as ${synonyms.join(", ")}<div>`;
                return;
            })
            .catch(catchFunc);
        // throw err;
    }

    /**
     * Loads the 1D molecule (SMILES) from PubChem.
     *
     * @param {string} filename  The filename to use.
     * @param {boolean} [getIsomeric=true]  Whether to get isomeric SMILES.
     *     If false, will get regular SMILES.
     * @returns {Promise<FileInfo | void>} A promise that resolves when it is
     *     loaded.
     */
    get1DVersion(filename: string, getIsomeric = true): Promise<FileInfo | void> {
        const simStr = getIsomeric ? "IsomericSMILES" : "SMILES";
        return loadRemoteToFileInfo(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${this.cid}/property/${simStr}/TXT`
        )
            .then((fileInfo: FileInfo) => {
                fileInfo.name = correctFilenameExt(filename, "SMI");
                return fileInfo;
            })
            .catch((/* err: string */) => {
                // api.messages.popupError(err);
                // throw err;
                return;
            });
    }

    /**
     * Loads the 2D molecule from PubChem. Used if 3D molecule isn't available.
     *
     * @param {string} filename  The filename to use.
     * @returns {Promise<FileInfo | void>} A promise that resolves when it is
     *     loaded.
     */
    get2DVersion(filename: string): Promise<FileInfo | void> {
        return loadRemoteToFileInfo(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=2d&response_type=display`
        )
            .then((fileInfo: FileInfo) => {
                fileInfo.name = correctFilenameExt(filename, "SDF");
                return fileInfo;
            })
            .catch((/* err: string */) => {
                // api.messages.popupError(err);
                // throw err;
                return;
            });
    }

    /**
     * Loads the 3D molecule from PubChem. Returns undefined
     *
     * @param {string} filename  The filename to use.
     * @returns {Promise<FileInfo | void>} A promise that resolves when it is
     *     loaded.
     */
    get3DVersion(filename: string): Promise<FileInfo | void> {
        return loadRemoteToFileInfo(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=3d&response_type=display`
        )
            .then((fileInfo: FileInfo) => {
                fileInfo.name = correctFilenameExt(filename, "SDF");
                return fileInfo;
            })
            .catch((/*err: string*/) => {
                // api.messages.popupError(err);
                // throw err;
                return;
            });
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone(): void {
        this.closePopup();
        this.submitJobs([{ cid: this.cid, molName: this.molName }]);
    }

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     */
    onPopupOpen() {
        let focusTarget = (this.$refs.formMolName as any).$refs
            .inputElem as HTMLInputElement;
        focusTarget.focus();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     */
    async onBeforePopupOpen() {
        this.cid = "";
        this.molName = "";
        this.molNameRespDescription = `The name of the molecule. If given, ${appName} will automatically search PubChem for the corresponding Chemical Identification (CID) number.`;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @returns {Promise<void>}  A promise that resolves the file object.
     */
    async runJobInBrowser(): Promise<void> {
        let filename = "";
        if (this.molName !== "") {
            filename += slugify(this.molName) + "-";
        }
        filename += "CID" + this.cid + ".sdf";

        // Try to get the 3D version of the ligand.
        let fileInfo = await this.get3DVersion(filename);

        // If 3D not available, try 2D.
        // if (fileInfo === undefined)
        //     fileInfo = await this.get2DVersion(filename);

        // If 2D not available, use isomeric SMILES
        if (fileInfo === undefined) {
            fileInfo = await this.get1DVersion(filename, true);
        }

        // If no isomeric smiles, try regular smiles
        if (fileInfo === undefined) {
            fileInfo = await this.get1DVersion(filename, false);
        }

        if (fileInfo === undefined) {
            api.messages.popupError(
                "Could not load molecule with CID " +
                    this.cid +
                    ". Does this CID exist?"
            );
            return;
        }

        return this.addFileInfoToViewer({
            fileInfo,
            desalt: this.getUserArg("desalt"),
            tag: this.pluginId,
        });

        // return (
        //     loadRemote(
        //         `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=3d&response_type=display`
        //     )
        //         .then((fileInfo: FileInfo) => {
        //             fileInfo.name = correctFilenameExt(filename, "SDF");
        //             return this.addFileInfoToViewer(
        //                 fileInfo,
        //                 undefined,
        //                 this.getUserArg("desalt")
        //             );
        //         })
        //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        //         .catch((_err: string) => {
        //             // If it failed, it could be because there's no 3D coordinates. Try 2D.
        //             // throw err;
        //             return this.get2DVersion(filename);
        //         })
        // );
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        return [
            {
                pluginOpen: new TestCmdList()
                    .text("#modal-loadpubchem #formMolName", "Aspirin")
                    // TODO: Below could wait until value populated. Hoping it will take
                    // less than 3 secs is hackish.
                    .wait(5),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "aspirin-"
                ),
            },
            {
                pluginOpen: new TestCmdList()
                    .text("#modal-loadpubchem #cid", "18781742")
                    // TODO: Below could wait until value populated. Hoping it will take
                    // less than 3 secs is hackish.
                    .wait(5),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "CID18781742"
                ),
            },

            // Below to verify error catching. Not a valid CID.
            {
                pluginOpen: new TestCmdList()
                    .text("#modal-loadpubchem #cid", "999912354323")
                    .wait(5),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "Could not load"
                ),
            },
        ];
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
